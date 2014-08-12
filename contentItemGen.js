// new instance of class for each handsontable row?
var ItemRow =
{
  configurations: {
    itemColumns: ["itemtype", "quantity", "cost"],
    rowTags: ["TR", "LI"]
  },

  init: function() {
    var self = this;
    // attribute defining ItemRow, value set to rowIndex
    this.rowData = "data-tworeceipt-row";
    // index defining ItemRow
    this.rowIndex = null;
    // element path to each itemColumn from ItemRow's parent & tagName of child element
    this.data = {};
    for (var i = 0; i < this.configurations.itemColumns.length; i++) {
      this.data[this.configurations.itemColumns[i]] = { tag: "", path: [] };
    }
  }
};

// triggered by notificationbar/handsontable messages
// saving template data - check if attr is one in itemColumns

// rowIndex starts off null - set when it exists

// options - store element paths for each row?? (+ sign button at each row?)
// need to track row deletes and modify attr value to match...
// store only for 'latest' row
// define latest row: last row in table? last complete row?

// methods
// set/clean row data attr, clean all row data attr (static method)
// select row element using row data attr
// find parent row
// find next row data
// element path methods - iterate down path, find parent row element, generate element path (element path class needs a method specifically from rows instead of body)

// validation - what defines complete row? (if incomplete, just set default values - mandatory itemtype?)


// surrounding text stuff..
// can level of detail not be as high as aServer? surrounding text for itemtype..
// default values for quantity/cost..
