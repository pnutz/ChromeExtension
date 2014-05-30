var fieldTypes  = 
{
  NUMBER : 1 ,
  TEXT : 2,
  DATE : 3,
  SELECT : 4

};
var NotiBar = 
{
  configurations:
  {
    itemTableHeaders : ["Receipt Item", "Quantity", "Cost", "Delete"],
    minSpareRows : 1,
    formFields : {
                    "subtotal" : 
                      {
                        id : "#receipt-subtotal",
                        type : fieldTypes.NUMBER
                      },
                    "total" : 
                      {
                        id : "#receipt-total",
                        type : fieldTypes.NUMBER
                      },
                    "vendor" :
                      {
                        id : "#receipt-vendor",
                        type : fieldTypes.TEXT
                      },
                    "address" : 
                      {
                        id : "#receipt-vendor-address",
                        type : fieldTypes.TEXT
                      },
                    "invoice" : 
                      {
                        id : "#receipt-invoice",
                        type : fieldTypes.TEXT
                      },
                    "taxes" : 
                      {
                        id : "#receipt-taxes",
                        type : fieldTypes.NUMBER
                      },                    
                    "notes" : 
                      {
                        id : "#receipt-notes",
                        type : fieldTypes.TEXT
                      },
                    "items" : 
                      {
                        id : "#receipt-items" ,
                        type : fieldTypes.TABLE
                      },                
                    "profile" : 
                      {
                        id : "#receipt-profile",
                        type : fieldTypes.SELECT
                      },
                    "category" :
                      {
                        id :  "#receipt-category",
                        type : fieldTypes.SELECT
                      },
                    "date" :
                      {
                        id :  "#receipt-date",
                        type : fieldTypes.DATE
                      }
                  }
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
      instance.alter('remove_row', row);
    });
    $(td).empty().append($anchor); //empty is needed because you are rendering to an existing cell
  },

  init: function() 
  {
    this.rows = [];
    // set datepicker ui element
    $(this.configurations.formFields.date.id).datepicker();
    // set handsontable width to the parent div width
    var tableWidth = $("#receipt-items-container").width() - 100;
    console.log(tableWidth);
    // setup handsontable for receipt items
    this.receiptItemTable = $("#receipt-items");
    this.receiptItemTable.handsontable({
      stretchH : 'last', //Setting this to 'all' causes resizing issues
      colWidths : [tableWidth * 0.6 , tableWidth * 0.2, tableWidth * 0.2, 50],
      width : $("#receipt-items-container").width(),
      colHeaders : this.configurations.itemTableHeaders,
      rowHeaders : true,
      manualColumnResize : true,
      minSpareRows : this.configurations.minSpareRows,
      columnSorting : true,
      afterCreateRow : function () {
        console.log("made new row");
      },
      columns: [
        {
          data: 0
        },
        {
          data: 1,
          type : 'numeric',
          format : "0.00"
        },
        {
          data: 2,
          type : 'numeric',
          format : "$0, 0.00"
        },
        {
          renderer : this.coverRenderer, 
          readOnly : true, 
          copyable: false
        },
      ]
    });
  },

  /**
   * @brief Set entire table data
   * @param data dictionary of data
   */
  setTable: function(data)
  {
    
  },

  addItemRow: function(name, quantity, price)
  {
    var rowNum = this.receiptItemTable.handsontable('countRows') - this.configurations.minSpareRows;
    this.receiptItemTable.handsontable('setDataAtCell', rowNum, 0, name);
    this.receiptItemTable.handsontable('setDataAtCell', rowNum, 1, quantity);
    this.receiptItemTable.handsontable('setDataAtCell', rowNum, 2, price);
  },
  
  deleteItemRow: function(rowNum)
  {
    this.receiptItemTable.handsontable('alter', 'remove_row', rowNum);
    window.parent.postMessage({
                                field : 'items',
                                action : "delete",
                                index : rowNum 
                              });
  },

  getReceiptItems: function()
  {
    // Minus one row since there is always an extra empty row
    var rows = this.receiptItemTable.handsontable('countRows') - this.configurations.minSpareRows;
    var receiptItems = [];
    for (var i = 0; i < rows; i++)
    {
      var thisRow = this.receiptItemTable.handsontable('getDataAtRow', i);
      receiptItems.push(thisRow.slice(0,3));
    }
    return receiptItems;
  },
  
  setFieldValue: function(fieldName, value)
  {
    if (fieldName in this.configurations.formFields)
    {
      var field = this.configurations.formFields[fieldName];
      switch(field.type)
      {   
        case fieldTypes.NUMBER:
        case fieldTypes.TEXT:
          this.setInputFieldValue(field.id, value);
          break;
        case fieldTypes.SELECT:
          this.setSelectOption(field.id, value);
          break;
        default: 
          console.error("Incorrect type");
      }
    }
    else
    {
      console.error("Could not find field : " + fieldName);
    }
  },

  /**
   * @brief set the chosen option for the <select> fields
   * @params fieldId the id for the element
   * @params the id for the option
   */
  setSelectOption: function(fieldId, optionId)
  {
    if (!isNaN(optionId))
      $(fieldId).val(optionId);
    else
      console.error("Expected a numeric value for id");
  },

  /**
   * @brief set the text values for the form fields
   * @params fieldId the id for the element
   * @params value text value to be shown
   */
  setInputFieldValue: function(fieldId, value)
  {
    $(fieldId).val(value);
  },

  /**
   * @brief set the selected option for <select> fields
   * @params fieldId the id for the element
   * @params value the id for the selected option
   */
  setSelectFieldOptions: function(fieldName, options)
  {
    if (fieldName in this.configurations.formFields &&
        this.configurations.formFields[fieldName].type == fieldTypes.SELECT)
    {
      var field = $(this.configurations.formFields[fieldName].id);
      $.each(options, function(index, option)
      {
        if ("id" in option)
        {
          var selectItem = $("<option></option>");
          selectItem.attr("value", option.id);
          selectItem.text(option.name);
          field.append(selectItem);
        }
        else
          console.error("Input option missing id");
      });
    }
    else
      console.error("Invalid field name" + fieldName);
  },

  getAllValues: function()
  {
    var formDict = {};
    $.each(this.configurations.formFields, function(key, value)
    {
      console.log(key);
      console.log(value);
      var formItem = $(value.id); 
      formDict[formItem.attr('name')] = formItem.val();
    });

    formDict[$(this.configurations.formFields.items).attr('name')] = this.getReceiptItems();
    return formDict;
  }
};

document.addEventListener('DOMContentLoaded', function() {
  NotiBar.init();
  NotiBar.addItemRow("hello", 3, 43.2);
});
