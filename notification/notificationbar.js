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
    // handsontable source
    this.source = {};
    // handsontable last focused index
    this.index = -1;
    // set datepicker ui element
    $(this.configurations.formFields.date.id).datepicker();
    // set autocomplete ui element
    this.initAutoComplete("vendor");
    this.initAutoComplete("address");
    // set handsontable width to the parent div width
    var tableWidth = $("#receipt-items-container").width() - 100;
    console.log(tableWidth);
    // setup handsontable for receipt items
    this.receiptItemTable = $("#items");
    
    // TwoReceipt extension of handsontable AutocompleteEditor
    var TwoReceiptEditor = Handsontable.editors.AutocompleteEditor.prototype.extend();

    TwoReceiptEditor.prototype.init = function () {
      Handsontable.editors.AutocompleteEditor.prototype.init.apply(this, arguments);
    };

    TwoReceiptEditor.prototype.createElements = function(){
      Handsontable.editors.AutocompleteEditor.prototype.createElements.apply(this, arguments);

      this.$htContainer.addClass('TwoReceiptEditor');
    };
    
    TwoReceiptEditor.prototype.bindEvents = function(){
      Handsontable.editors.AutocompleteEditor.prototype.bindEvents.apply(this, arguments);
      
      // deselect from TEXTAREA does not work?
      
      // AS TEXT CHANGES - the dropdownlist options shown change - if originally none and appear later, highlight does not work
      // need to rerun open() event
      
      // timeout? delay between calls
      
      var that = this;
      // cell textarea change event
      $(this.TEXTAREA).bind("input propertychange", function() {
        var newValue = this.value.toString();
        
        // retrieve actual row (including deleted)
        var row;
        for (var index = 0; index < self.rows.length; index++)
        {
          if (self.rows[index] === that.row)
          {
            row = index;
            break;
          }
        }
        
        var col_name = that.instance.colToProp(that.col);
        // minimum 3 characters (NAME ONLY)
        if (newValue.length > 2) {
          var message = { request: "searchText", "fieldName": col_name, "itemIndex": row, "text": newValue };
          console.log(message);
          window.parent.postMessage(message, "*");
        }
        // remove source? (NAME ONLY)
        else if (self.source.hasOwnProperty(row) && self.source[row].hasOwnProperty(col_name))
        {
          self.source[row][col_name] = [];
          
          // clear autocomplete list
          self.updateTableSource(col_name, row);
        }
      });
    };
    
    var onBeforeKeyDownTR;
    
    TwoReceiptEditor.prototype.open = function () {
      Handsontable.editors.AutocompleteEditor.prototype.open.apply(this, arguments);
      console.log("open");
      
      /*onBeforeKeyDownTR = function (event) {
        var instance = this; //context of listener function is always set to Handsontable.Core instance
        var editor = this.getActiveEditor();
        var innerHOT = editor.$htContainer.handsontable('getInstance');
        
        // down only occurs from textarea
        // after first event, starts scrolling page
        // can self-calculate indices from start, but need to keep track physical mouse pointer mouseenters too
        
        // event keycode
        console.log("KEYCODE:" + event.keyCode);
        
        switch (event.keyCode){
        case Handsontable.helper.keyCode.ARROW_UP:
          console.log("UP");
          // mouseenter on cell already
          if (self.index !== -1)
          {
            self.index--;
            $(innerHOT.getCell(self.index, 0)).trigger("mouseenter");
          }
          else 
          {
             $(editor.$textarea).trigger("mouseenter");
          }
          console.log(self.index);
          // why does hook only work once?
          
          //event.stopImmediatePropagation();         // prevent EditorManager from processing this event
          event.preventDefault();                   // prevent browser from scrolling the page up
          break;

        case Handsontable.helper.keyCode.ARROW_DOWN:
          console.log("DOWN");
          // mouseenter on cell already
          if (self.index !== -1)
          {
            // check if at end of source
            self.index++;
            $(innerHOT.getCell(self.index, 0)).trigger("mouseenter");
            // not turning grey??
          }
          else
          {
            self.index = 0;
            $(innerHOT.getCell(self.index, 0)).trigger("mouseenter");
          }
          console.log(self.index);
          
          //event.stopImmediatePropagation();         // prevent EditorManager from processing this event
          event.preventDefault();                   // prevent browser from scrolling the page down
          break;
        }
      };*/
      
      //this.instance.addHook('beforeKeyDown', onBeforeKeyDownTR);
      
      var row;
      for (var index = 0; index < self.rows.length; index++)
      {
        if (self.rows[index] === this.row)
        {
          row = index;
          break;
        }
      }
      
      if (row !== undefined && Handsontable.helper.isArray(this.cellProperties.source))
      {
        (function (that) {
          // mouseenter/mouseleave for main text area
          $(that.$textarea).on('mouseenter', function()
          {
            window.parent.postMessage({ request: "highlightText", "fieldName": that.instance.colToProp(that.col), "itemIndex": row }, "*");
          })
          .on('mouseleave', function()
          {
            window.parent.postMessage({ request: "cleanHighlight" }, "*");
          });
        })(this);
        
        for (var index = 0; index < this.$htContainer.handsontable('countRows'); index++)
        {
          // optionIndex is selected option index in visible autocomplete list (choices)
          (function (that, optionIndex) {
            $(that.$htContainer.handsontable('getCell', optionIndex, 0))
            .on('mouseenter', function()
            {
              // iterate through entire autocomplete source, matching with shown choices until optionIndex is found
              var choiceIndex = 0;
              for (var sourceIndex = 0; sourceIndex < that.cellProperties.source.length; sourceIndex++)
              {
                if (that.cellProperties.source[sourceIndex] === that.choices[choiceIndex])
                {
                  // change optionIndex to represent selected option in entire source
                  if (choiceIndex === optionIndex)
                  {
                    optionIndex = sourceIndex;
                    break;
                  }
                  choiceIndex++;
                }
              }
              console.log(that.$htContainer);
              self.index = optionIndex;
              var message = { request: "highlightSearchText", "fieldName": that.instance.colToProp(that.col), "itemIndex": row, "value": optionIndex };
              window.parent.postMessage(message, "*");
            })
            .on('mouseleave', function()
            {
              self.index = -1;
              window.parent.postMessage({ request: "cleanHighlight" }, "*");
            });
          })(this, index);
        }
      }
    };

    TwoReceiptEditor.prototype.close = function () {
      Handsontable.editors.AutocompleteEditor.prototype.close.apply(this, arguments);
      
      console.log("close");
      
      //this.instance.removeHook('beforeKeyDown', onBeforeKeyDownTR);
      
      $(this.$textarea).off('mouseenter').off('mouseleave');
      
      for (var index = 0; index < this.$htContainer.handsontable('countRows'); index++) {
        (function (that, row) {
          $(that.$htContainer.handsontable('getCell', row, 0)).off('mouseenter').off('mouseleave');
        })(this, index);
      }
    };

    //Handsontable.editors.TwoReceiptEditor = TwoReceiptEditor;
    //Handsontable.editors.registerEditor('tworeceipt', TwoReceiptEditor);
    
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
            // index is the rowIndex to send to content script
            // TODO: SEND MESSAGE TO CONTENT SCRIPT HERE - INDEX
            // THIS IS UNNECESSARY? send self.rows on receipt submit - can check if the generated indices are null (deleted)
            self.rows[index] = null;
            delete self.source[index];
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
      // If we want stuff after the table initializes
      afterInit: function()
      {
        
      },
      columns: [
        {
          data: 'name',
          editor: TwoReceiptEditor,
          strict: false
        },
        {
          data: 'quantity',
          editor: TwoReceiptEditor,
          //type : 'numeric',
          format : "0.00"
        },
        {
          data: 'price',
          editor: TwoReceiptEditor,
          //type : 'numeric',
          format : "$0, 0.00"
        },
        {
          renderer : this.coverRenderer, 
          readOnly : true, 
          copyable: false
        }
      ],
      afterChange: function(arr, op)
      {
        // after autocomplete is closed, include duplicate values since text location might be different
        if (op === "edit" && arr.length === 1 && self.index !== -1)
        {
          // retrieve actual row (including deleted)
          var row;
          for (var index = 0; index < self.rows.length; index++)
          {
            if (self.rows[index] === arr[0][0])
            {
              row = index;
              break;
            }
          }
          
          // highlight, set selected
          var message = { request: "selectText", "fieldName": arr[0][1], "itemIndex": row , "value": self.index };
          window.parent.postMessage(message, "*");
          
          self.index = -1;
        }
      },
      afterSelection: function(selectedRow, col)
      {
        var row;
        for (var index = 0; index < self.rows.length; index++)
        {
          if (self.rows[index] === selectedRow)
          {
            row = index;
            break;
          }
        }
        
        if (self.source.hasOwnProperty(row) && self.source[row].hasOwnProperty(this.colToProp(col)))
        {
          window.parent.postMessage({ request: "highlightText", "fieldName": this.colToProp(col), "itemIndex": row }, "*");
        }
        else
        {
          window.parent.postMessage({ request: "cleanHighlight" }, "*");
        }
      },
      afterDeselect: function()
      {
        window.parent.postMessage({ request: "cleanHighlight" }, "*");
      }
    });
    
    // on receipt submit, send dictionary of form data to content script
    $("#receipt-submit").click(function() {
      var saved_data = {};
      var message = { request: "saveReceipt", "saved_data": saved_data };
      window.parent.postMessage(message, "*");
    });

    // on text form propertychange, send form text and fieldName to content script for search (not triggered on autocomplete select)
    // unhighlight and unselect existing text
    // wait ___ time for event to trigger again before sending message?
    $("input").bind("input propertychange", function() {
      $(this).attr("data-value", null);
      
      self.setAutoCompleteOptions(this.id, []);
      
      if (this.value.length > 2) {
        var message = { request: "searchText", "text": this.value, "fieldName": this.id };
        window.parent.postMessage(message, "*");
      }
    });
    
    // when user focuses on input field, highlight selected text if possible
    $("input").focus(function() {
      window.parent.postMessage({ request: "highlightText", "fieldName": this.id }, "*");
    });
    
    // when user leaves input field, clean highlight
    $("input").blur(function() {
      window.parent.postMessage({ request: "cleanHighlight" }, "*");
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
                                request: "delete",
                                field: "items",
                                index: rowNum 
                              }, "*");
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
      autoFocus: true,
      source: [""],
      focus: function (event, ui)
      {
        $(this).val(ui.item.label);
        $(this).attr("data-value", ui.item.value)
        // highlight focus
        var message = { request: "highlightSearchText", "fieldName": this.id, "value": $(this).attr("data-value") };
        window.parent.postMessage(message, "*");
        
        return false;
      },
      select: function (event, ui)
      {
        $(this).val(ui.item.label);
        $(this).attr("data-value", ui.item.value);
        
        // highlight, set selected
        var message = { request: "selectText", "fieldName": this.id, "value": $(this).attr("data-value") };
        window.parent.postMessage(message, "*");
        
        event.preventDefault();
      }
    })
    .focus(function()
    {
      // displays autocomplete list on form focus
      if ($(this).autocomplete("option", "source") !== null) {
        $(this).autocomplete("search");
      }
      
      // unhighlight other form text and highlight text (if it exists)
      var message = { request: "highlightSearchText", "fieldName": this.id, "value": $(this).attr("data-value") };
      window.parent.postMessage(message, "*");
    })
    .click(function()
    {
      // if form already focused, will re-open autocomplete on click
      if ($(this).is(":focus") && $(this).autocomplete("option", "source") !== null) {
        $(this).autocomplete("search");
      }
    });
  },
  
  /**
   * @brief set the autocomplete options for the form fields
   * @params fieldName of the element
   * @params array of options for autocomplete
   */
  setAutoCompleteOptions: function(fieldName, options)
  {
    if (fieldName in this.configurations.formFields)
    {
      var field = this.configurations.formFields[fieldName];
      
      switch(field.type)
      {
        case fieldTypes.NUMBER:
        case fieldTypes.TEXT:
          $(field.id).autocomplete("option", { source: options });
          
          // displays autocomplete list on form focus
          if ($(field.id).autocomplete("option", "source") !== null) {
            $(field.id).autocomplete("search");
          }
          break;
        case fieldTypes.SELECT:
          break;
        default: 
          console.error("Incorrect type");
      }
    }
    else
      console.error("Could not find field : " + fieldName);
  },
  
  updateTableSource: function(fieldName, itemIndex)
  {
    // set autocomplete source
    var row = this.rows[itemIndex];
    var col = $("#items").handsontable('propToCol', fieldName);
    var cellProperties = $("#items").handsontable('getCellMeta', row, col);
    cellProperties.source = this.source[itemIndex][fieldName];
    
    // open TwoReceiptEditor
    cellProperties.instance.getActiveEditor().close();
    cellProperties.instance.getActiveEditor().open();
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
      // regular form
      if (event.data.itemIndex === undefined)
      {
        NotiBar.setAutoCompleteOptions(event.data.fieldName, event.data.results);
      }
      // handsontable
      else
      {
        // store search results in source so handsontable can switch between sources for different cells
        if (!NotiBar.source.hasOwnProperty(event.data.itemIndex))
        {
          NotiBar.source[event.data.itemIndex] = {};
        }
        NotiBar.source[event.data.itemIndex][event.data.fieldName] = event.data.results;
        
        // update table autocomplete source and open TwoReceiptEditor
        NotiBar.updateTableSource(event.data.fieldName, event.data.itemIndex);
      }
    }
    else
    {
      if (self !== top)
      {
        
      }
    }
  }
});

          // auto match first option (not case sensitive)
          // afterChange event callback
          // cannot use numeric & autocomplete type at same time? - enforce numeric separately
          // price/quantity need additional logic for matching - since common it will be under 3 characters
          // 1st) FINISH NAME - how to differentiate different row name fields
          
          // onChange
          // get row/column for change
          // send change value to content.js
          // receive new source in message (along with row/column), set source (and autoselect first in source if source exists)
          // store key/value source locally - on event user selects/highlights a source match, do same as other autocomplete
          
            // afterLoadData() after new data is loaded into data source array