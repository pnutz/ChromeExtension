var fieldTypes  = 
{
  NUMBER : 1,
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
                        id : "#subtotal",
                        type : fieldTypes.NUMBER
                      },
                    "total" : 
                      {
                        id : "#total",
                        type : fieldTypes.NUMBER
                      },
                    "vendor" :
                      {
                        id : "#vendor",
                        type : fieldTypes.TEXT
                      },
                    "address" : 
                      {
                        id : "#address",
                        type : fieldTypes.TEXT
                      },
                    "transaction" : 
                      {
                        id : "#transaction",
                        type : fieldTypes.TEXT
                      },
                    "taxes" :
                      {
                        id : "#taxes",
                        type : fieldTypes.NUMBER
                      },                    
                    "notes" : 
                      {
                        id : "#notes",
                        type : fieldTypes.TEXT
                      },
                    "items" : 
                      {
                        id : "#items",
                        type : fieldTypes.TABLE
                      },                
                    "profile" : 
                      {
                        id : "#profile",
                        type : fieldTypes.SELECT
                      },
                    "category" :
                      {
                        id :  "#category",
                        type : fieldTypes.SELECT
                      },
                    "date" :
                      {
                        id :  "#date",
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
    // create span for delete icon
    var $deleteIcon = $('<span>');
    $deleteIcon.addClass('glyphicon glyphicon-remove');
    $anchor.attr('href', '#');
    $anchor.attr('row', row);
    $anchor.append($deleteIcon);
    $anchor.click(function() 
    {
      instance.alter('remove_row', row);
    });
    // Add class to center the icon
    $(td).addClass("deleteTd");
    $(td).empty().append($anchor); //empty is needed because you are rendering to an existing cell
  },
  
  init: function() 
  {
    var self = this;
    this.rows = [];
    // set datepicker ui element
    $(this.configurations.formFields.date.id).datepicker();
    // set autocomplete ui element
    this.initAutoComplete("vendor");
    // set handsontable width to the parent div width
    var tableWidth = $("#receipt-items-container").width() - 100;
    console.log(tableWidth);
    // setup handsontable for receipt items
    this.receiptItemTable = $("#items");
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
        }
      ]
    });
    
    // on receipt submit, send dictionary of form data to content script
    $("#receipt-submit").click(function() {
      var saved_data = {};
      var message = { request: "saveReceipt", "saved_data": saved_data };
      window.parent.postMessage(message, "*");
    });

    // on text form propertychange, send form text and fieldName to content script
    // wait ___ time for event to trigger again before sending message?
    $("input").bind("input propertychange", function() {
      if (this.value.length > 2) {
        var message = { request: "searchText", "text": this.value, "fieldName": this.id };
        window.parent.postMessage(message, "*");
      }
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
      console.error("Could not find field : " + fieldName);
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
        this.configurations.formFields[fieldName].type === fieldTypes.SELECT)
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
  },
  
  initAutoComplete: function(fieldName)
  {
  // does this need the same kinda thing as setAutoCompleteOptions? if (fieldName in this.configurations.formFields)...
    $(this.configurations.formFields[fieldName].id).autocomplete(
    {
      minLength: 3,
      focus: function (event, ui)
      {
        $(this).val(ui.item.label);
        $(this).attr("data-value", ui.item.value)
        // highlight focus
        var message = { request: "highlightText", "fieldName": this.id, "value": $(this).attr("data-value") };
        window.parent.postMessage(message, "*");
        
        return false;
      },
      select: function (event, ui)
      {
        $(this).val(ui.item.label);
        $(this).attr("data-value", ui.item.value);
        // highlight and set selected
        var message = { request: "highlightText", "fieldName": this.id, "value": $(this).attr("data-value") };
        window.parent.postMessage(message, "*");
        
        message = { request: "selectText", "fieldName": this.id, "value": $(this).attr("data-value") };
        window.parent.postMessage(message, "*");
        
        // trigger search again
        if (this.value.length > 2) {
          var message = { request: "searchText", "text": this.value, "fieldName": this.id };
          window.parent.postMessage(message, "*");
        }
        
        return false;
      }
    })
    // displays autocomplete list on form focus
    // TODO: auto-select first item on list?? (forcing selection of a template)
    .focus(function()
    {
      $(this).autocomplete("search");
    });
  },
  
  /**
   * @brief set the autocomplete options for the form fields
   * @params fieldName of the element
   * @params array of options for autocomplete
   */
  setAutoCompleteOptions: function(fieldName, options)
  {
    // do not include notes field
    if (fieldName in this.configurations.formFields)
    {
      var field = this.configurations.formFields[fieldName];
      
      switch(field.type)
      {
        case fieldTypes.NUMBER:
        case fieldTypes.TEXT:
          $(field.id).autocomplete("option", { source: options });
          break;
        case fieldTypes.SELECT:
          break;
        default: 
          console.error("Incorrect type");
      }
    }
    else
      console.error("Could not find field : " + fieldName);
  }
};

document.addEventListener('DOMContentLoaded', function() {
  NotiBar.init();
  NotiBar.addItemRow("hello", 3, 43.2);
});

// send message using window.parent.postMessage("yes", '*')
window.addEventListener("message", function(event) {
  if (event.origin.indexOf("chrome-extension://") === -1)
  {
    console.log(event.data);
    
    // event.source.postMessage("yes", event.origin);
    
    // generated values for form fields
    if (event.data.request === "generatedData")
    {
      
    }
    // interaction with highlighted data
    else if (event.data.request === "highlightSelected")
    {
      
    }
    // search results
    else if (event.data.response === "searchResults")
    {
      NotiBar.setAutoCompleteOptions(event.data.fieldName, event.data.results);
    }
    else
    {
      if (self !== top)
      {
        
      }
    }
  }
});
