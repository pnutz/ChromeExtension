var NotiBar = 
{
  configurations:
  {
    itemTableHeaders : ["Receipt Item", "Quantity", "Cost", "Delete"],
  },

  coverRenderer : function (instance, td, row, col, prop, value, cellProperties) 
  { 
    console.log(row);
    var self = this;
    console.log(self);
    console.log(instance);
    var $anchor = $('<a>');
    $anchor.attr('href', '#');
    $anchor.attr('row', row);
    $anchor.text('Delete');
    $anchor.click(function() {
      // Instance is the instance of handsontable
      instance.alter('remove_row', row);
    });
    $(td).empty().append($anchor); //empty is needed because you are rendering to an existing cell
  },

  init: function() 
  {
    this.rowCount = 0;
    var tableWidth = $("#receipt-items-container").width() - 100;
    console.log(tableWidth);
    this.receiptItemTable = $("#receipt-items");
    this.receiptItemTable.handsontable({
      stretchH : 'last', //Setting this to 'all' causes resizing issues
      colWidths : [tableWidth * 0.6 , tableWidth * 0.2, tableWidth * 0.2, 50],
      width : $("#receipt-items-container").width(),
      colHeaders : this.configurations.itemTableHeaders,
      rowHeaders : true,
      manualColumnResize : true,
      minSpareRows :1,
      columns: [
        {},
        {},
        {},
        {renderer : this.coverRenderer, readOnly : true, copyable: false}
      ]
    });
  },

  _addItemRow: function(name, quantity, price)
  {
    this.receiptItemTable.handsontable('setDataAtCell', this.rowCount, 0, name);
    this.receiptItemTable.handsontable('setDataAtCell', this.rowCount, 1, quantity);
    this.receiptItemTable.handsontable('setDataAtCell', this.rowCount, 2, price);
    this.rowCount++; 
  },
  
  _deleteItemRow: function(index)
  {
    this.receiptItemTable.handsontable('alter', 'remove_row', index);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  NotiBar.init();
  NotiBar._addItemRow("hello", 3, 43.2);
});
