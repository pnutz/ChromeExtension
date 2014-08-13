// ItemRowGen class - remembers information needed to generate receipt item rows

// should i store index relationships between item columns?
ItemRowGen.ITEM_COLUMNS = ["itemtype", "quantity", "cost"];
ItemRowGen.DEFAULT_VALUES = ["", "1", "0.00"];
ItemRowGen.PATH_ROW_INDEX = 1;

function ItemRowGen(rowIndex) {
  // index defining ItemRow
  this.rowIndex = rowIndex;
  this.rowsGenerated = 0;
  // element path to each itemColumn from ItemRow's parent & tagName of child element
  this.data = [];
  for (var i = 0; i < ItemRowGen.ITEM_COLUMNS.length; i++) {
    this.data.push(new ElementPath(rowIndex));
  }
}

ItemRowGen.prototype.getElementPaths = function() {
  return this.data;
};

ItemRowGen.prototype.setAttrElement = function(attribute, element) {
  var pathIndex = $.inArray(attribute, ItemRowGen.ITEM_COLUMNS);
  if (pathIndex !== -1) {
    this.data[pathIndex].element = element;
  } else {
    console.err("Invalid receipt item attribute " + attribute);
  }
};

// return generated row data if it exists
ItemRowGen.prototype.generateNextRow = function() {
  ElementPath.setParentRow(this.getElementPaths());

  this.rowsGenerated++;

  var item = {};
  var tempData = [];
  for (var i = 0; i < this.data.length; i++) {
    tempData[i] = this.data[i].copy().alterPath(ItemRowGen.PATH_ROW_INDEX, this.rowsGenerated);
    if (tempData[i].element == null) {
      if (ItemRowGen.ITEM_COLUMNS[i] !== "itemtype") {
        item[ItemRowGen.ITEM_COLUMNS[i]] = ItemRowGen.DEFAULT_VALUES[i];
      } else {
        console.log("element is null =Z");
        return null;
      }
    } else {
      // evaluate text as element text for now
      var text = tempData[i].element.text().trim();

      // perform more text validation here
      if (ItemRowGen.ITEM_COLUMNS[i] === "cost") {
        text = ItemRowGen.moneyToNumber(text);
      }
      item[ItemRowGen.ITEM_COLUMNS[i]] = text;
    }
  }

  return { item: item };
};

ItemRowGen.moneyToNumber = function(value) {
  if (value.indexOf("$") === 0) {
    value = value.substring(1);
  }

  // money value must contain a decimal
  if (value.indexOf("$") === value.length - 1 || value.indexOf(".") === value.length - 1) {
    value = value.substring(0, value.length - 1);
  }
  return value;
}

// saving template data - check if attr is one in itemColumns

// need to track row deletes and modify attr value to match...

// validation - if incomplete row [no template data], just set default values - mandatory itemtype
// default values for quantity/cost.. - money/numeric validation

// surrounding text stuff..
