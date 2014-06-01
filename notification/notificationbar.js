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
    $anchor.click(function() 
    {
      instance.alter('remove_row', row);
    });
    $(td).empty().append($anchor); //empty is needed because you are rendering to an existing cell
  },

  init: function() 
  {
    var self = this;
    this.rows = [];
    // set datepicker ui element
    $(this.configurations.formFields.date.id).datepicker();
    // set handsontable width to the parent div width
    var tableWidth = $("#receipt-items-container").width() - 100;
    console.log(tableWidth);
    // setup handsontable for receipt items
    this.receiptItemTable = $("#receipt-items");
    this.receiptItemTable.handsontable({
      stretchH : 'last', // Setting this to 'all' causes resizing issues
      colWidths : [tableWidth * 0.6 , tableWidth * 0.2, tableWidth * 0.2, 50],
      width : $("#receipt-items-container").width(),
      colHeaders : this.configurations.itemTableHeaders,
      rowHeaders : true,
      manualColumnResize : true,
      minSpareRows : this.configurations.minSpareRows,
      columnSorting : true,
      startRows: 0,
      afterCreateRow : function (index, data) 
        {
          // add a row to the representation
          self.rows.push(index); 
        },
      afterRemoveRow: function (tableRowIndex, data)
        {
          var rowsCount = 0;
          // Use the table's row index to find the corresponding index
          // in the table
          // the position in the array corresponding to the 
          // tables row index is where we should start subtracting
          $.each(self.rows, function(index, value) 
          {
            if (value === tableRowIndex)
            {
              self.rows[index] = null; 
              rowsCount = index++;
            }
          });

          // Decrement each non null element by 1
          for (; rowsCount < self.rows.length; rowsCount++)
          {
            // don't decrement if the element is null
            // since that means the item was removed
            if (self.rows[rowsCount] !== null) 
              self.rows[rowsCount] -= 1; 
          }
        },
      afterInit: function()
      {
        // If we want stuff ater the table initializes
      },
      columns: [
        {
          data: 'name'
        },
        {
          data: 'quantity',
          type : 'numeric',
          format : "0.00"
        },
        {
          data: 'price',
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
   * @brief Set entire table using a key value pair. 
   *        key increments are assumed to start from 0
   *        and are consecutive with no gaps 
   * @param data dictionary of data
   */
  setTable: function(data)
  {
    var itemsArray = [];
    // NotiBar.receiptItemTable.handsontable('loadData', [{"name": "4341", "quantity" : "42344", "price" : "423432"});
    for (var count = 0; count < data.length; count++)
    {
      itemsArray.push(
        {
          "name" : data[count].name, 
          "quantity" : data[count].quantity,
          "price" : data[count].price
        });
    }
    this.receiptItemTable.handsontable('loadData', data[count].name, data[count].quantity, data[count].price); 
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
    var receiptItems = {};
    // Minus one row since there is always an extra empty row
    var rowsToIterate = this.rows.length - this.configurations.minSpareRows;
    for (var i = 0; i < rowsToIterate; i++)
    {
      var thisRow = null;
      // if position contains null then that means the element was removed
      if (this.rows[i] !== null)
        thisRow = this.receiptItemTable.handsontable('getDataAtRow', this.rows[i]);
    
      receiptItems[i] = thisRow;
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
