var TwoReceiptHandsOnTable =
{
  configurations:
  {
    itemTableHeaders : ["Receipt Item", "Quantity", "Cost", "Delete"],
    minSpareRows : 1
  },

  init: function()
  {
    var self = this;
    this.rows = [];
    // handsontable source
    this.source = {};
    // handsontable last focused index
    this.index = -1;
    // set handsontable width to the parent div width
    var tableWidth = $("#receipt-items-container").width() - 100;
    console.log(tableWidth);
    // setup handsontable for receipt items
    this.receiptItemTable = $("#items");

    var TwoReceiptEditor = this.initTwoReceiptEditor();

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
          renderer: "autocomplete",
          strict: false
        },
        {
          data: 'quantity',
          editor: TwoReceiptEditor,
          renderer: "numeric",
          validator: Handsontable.NumericValidator,
          format : "0.00"
        },
        {
          data: 'price',
          editor: TwoReceiptEditor,
          renderer: "numeric",
          validator: Handsontable.NumericValidator,
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

  // returns TwoReceipt extension of handsontable AutocompleteEditor
  initTwoReceiptEditor: function()
  {
    var self = this;
    var TwoReceiptEditor = Handsontable.editors.AutocompleteEditor.prototype.extend();

    TwoReceiptEditor.prototype.createElements = function(){
      Handsontable.editors.AutocompleteEditor.prototype.createElements.apply(this, arguments);

      this.$htContainer.addClass('TwoReceiptEditor');
    };

    TwoReceiptEditor.prototype.bindEvents = function(){
      Handsontable.editors.AutocompleteEditor.prototype.bindEvents.apply(this, arguments);

      var that = this;
      // cell textarea change event
      $(this.TEXTAREA).bind("input propertychange", function() {
        var temp_this = this;
        var delay = 150;

        clearTimeout($(temp_this).data("timer"));
        $(temp_this).data("timer", setTimeout(function() {
          $(temp_this).removeData("timer");
          var newValue = temp_this.value.toString();

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
            window.parent.postMessage(message, "*");
          }
          // remove source? (NAME ONLY)
          else if (self.source.hasOwnProperty(row) && self.source[row].hasOwnProperty(col_name))
          {
            self.source[row][col_name] = [];

            // clear autocomplete list
            self.updateTableSource(col_name, row);
          }
        }, delay));
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

    Handsontable.editors.TwoReceiptEditor = TwoReceiptEditor;
    Handsontable.editors.registerEditor('tworeceipt', TwoReceiptEditor);

    return TwoReceiptEditor;
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