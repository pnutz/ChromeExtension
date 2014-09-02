// ItemRowGen class - remembers information needed to generate receipt item rows

// should i store index relationships between item columns?
ItemRowGen.ITEM_COLUMNS = ["itemtype", "quantity", "cost"];
ItemRowGen.DEFAULT_VALUES = ["", "1", "0.00"];
ItemRowGen.PATH_ROW_INDEX = 1;

function ItemRowGen(rowIndex) {
  // index defining ItemRow
  this.rowIndex = rowIndex;
  this.rowsGenerated = 0;
  this.generatedIndex = 0;
  this.totalRows = 0;
  // element path to each itemColumn from ItemRow's parent & tagName of child element
  this.elementData = [];
  this.textData = [];
  for (var i = 0; i < ItemRowGen.ITEM_COLUMNS.length; i++) {
    this.elementData.push(new ElementPath(rowIndex));
    this.textData.push(null);
  }
}

ItemRowGen.prototype.getRowElement = function() {
  var element = ElementPath.setParentRow(this.elementData);
  if (element != null) {
    for (var i = 0; i < this.elementData.length; i++) {
      if (this.elementData[i].path.length > ItemRowGen.PATH_ROW_INDEX) {
        element = element.children().eq(this.elementData[i].path[ItemRowGen.PATH_ROW_INDEX]);
        break;
      }
    }
  }
  return element;
};

ItemRowGen.prototype.setRowData = function(attribute, rowIndex, element, start, end, startNodeIndex, endNodeIndex) {
  if (this.rowIndex === rowIndex) {
    var attributeIndex = ItemRowGen.getAttributeIndex(attribute);
    if (attributeIndex !== -1) {
      this.elementData[attributeIndex].element = element;
      this.textData[attributeIndex] = new RelativeText(element, start, end, startNodeIndex, endNodeIndex);
      ElementPath.setParentRow(this.elementData);
      // # of indices the selected row child is
      var originalRowIndex = this.elementData[attributeIndex].path[ItemRowGen.PATH_ROW_INDEX] + 1;
      // total # of row children - row child indices #
      this.totalRows = this.elementData[attributeIndex].top.children().length - originalRowIndex - 1;
    } else {
      console.log("Invalid receipt item attribute " + attribute);
    }
  } else {
    console.log("Row index does not match ItemRowGen index");
  }
};

// return generated row data in an array if it exists. returns false if no row was generated. returns true if there are no more rows to generate
ItemRowGen.prototype.generateNextRow = function() {
  if (this.rowsGenerated <= this.totalRows) {
    this.rowsGenerated++;
    this.generatedIndex++;

    var item = {};
    var tempData = [];
    var fieldData = [];
    for (var i = 0; i < this.elementData.length; i++) {
      tempData[i] = this.elementData[i].copy().alterPath(ItemRowGen.PATH_ROW_INDEX, this.rowsGenerated);
      fieldData[i] = null;
      if (tempData[i].element == null) {
        // use default value if there is no template for attributes that are not itemtype
        if (ItemRowGen.ITEM_COLUMNS[i] !== "itemtype") {
          item[ItemRowGen.ITEM_COLUMNS[i]] = ItemRowGen.DEFAULT_VALUES[i];
        } else {
          this.generatedIndex--;
          console.log("element is null =Z");
          return false;
        }
      } else {
        // evaluate text as element text for now
        var textResult = this.textData[i].calculateElementText(tempData[i].element);
        console.log(textResult);
        if (textResult) {
          item[ItemRowGen.ITEM_COLUMNS[i]] = textResult.text;
          fieldData[i] = textResult;
        } else {
          this.generatedIndex--;
          console.log("textNodes did not match =Z");
          return false;
        }
      }
    }

    // set field data after row generation is confirmed
    for (var i = 0; i < fieldData.length; i++) {
      if (fieldData[i] != null) {
        setFieldText(tempData[i].element, fieldData[i].start, fieldData[i].end, ItemRowGen.ITEM_COLUMNS[i], this.rowIndex + this.generatedIndex, fieldData[i].startNodeIndex);
      }
    }

    return { items: [item] };
  } else {
    console.log("no more rows to generate");
    return true;
  }
};

// returns generated row data in an array if it exists. returns false if no rows were generated.
ItemRowGen.prototype.generateAllNextRows = function() {
  var items = [];
  var result = false;
  while (result !== true) {
    result = this.generateNextRow();
    if (result !== false && result !== true) {
      items.push(result.items[0]);
      console.log(items);
    }
  }

  if (items.length === 0) {
    return false;
  } else {
    return { items: items };
  }
};

ItemRowGen.getAttributeIndex = function(attribute) {
  return $.inArray(attribute, ItemRowGen.ITEM_COLUMNS);
};
