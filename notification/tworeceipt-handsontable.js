var TwoReceiptHandsOnTable =
{
  configurations:
  {
    itemTableHeaders : ["Receipt Item", "Quantity", "Cost", "Delete"],
    itemColumns: ["itemtype", "quantity", "cost"],
    minSpareRows : 1
  },

  init: function()
  {
    var self = this;
    this.valid = true;
    this.rows = [];
    // handsontable source
    this.source = {};
    // handsontable last focused index
    this.index = -1;
    // set handsontable width to the parent div width
    console.log($("#receipt-items-container").width());
    var tableWidth = $("#receipt-items-container").width() - 100;
    console.log(tableWidth);
    // setup handsontable for receipt items
    this.receiptItemTable = $("#items");

    var TwoReceiptEditor = this.initTwoReceiptEditor();
    var TwoReceiptNumericEditor = this.initTwoReceiptNumericEditor("numeric");
    var TwoReceiptMoneyEditor = this.initTwoReceiptNumericEditor("money");

    this.receiptItemTable.handsontable({
      stretchH : 'last', // Setting this to 'all' causes resizing issues
      colWidths : [tableWidth * 0.6 , tableWidth * 0.2, tableWidth * 0.2, 50],
      width : $("#receipt-items-container").width(),
      colHeaders : this.configurations.itemTableHeaders,
      rowHeaders : true,
      manualColumnResize : true,
      minSpareRows : this.configurations.minSpareRows,
      columnSorting : true,
      // DEPRECIATED, push index immediately when row created (this pushes after)
      /*afterCreateRow : function (index, data)
      {
        // add a row to the representation
        self.rows.push(index);
      },*/
      afterRemoveRow: function (tableRowIndex, data)
      {
        var rowsCount = 0;
        var rowRemoved = false;
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
            rowRemoved = true;
            return false;
          }
        });

        // ensures afterRemoveRow applied to a valid row
        if (rowRemoved) {
          // Decrement each non null element by 1
          for (; rowsCount < self.rows.length; rowsCount++)
          {
            // don't decrement if the element is null
            // since that means the item was removed
            if (self.rows[rowsCount] !== null) {
              self.rows[rowsCount] -= 1;
            }
          }
        }
      },
      // If we want stuff after the table initializes
      afterInit: function()
      {

      },
      columns: [
        {
          data: 'itemtype',
          editor: TwoReceiptEditor,
          renderer: "autocomplete",
          validator: this.twoReceiptValidator,
          strict: false
        },
        {
          data: 'quantity',
          editor: TwoReceiptNumericEditor,
          renderer: "numeric",
          validator: this.twoReceiptNumericValidator,
          //allowInvalid: false,
          format : "0.00"
        },
        {
          data: 'cost',
          editor: TwoReceiptMoneyEditor,
          renderer: "numeric",
          validator: this.twoReceiptNumericValidator,
          //allowInvalid: false,
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
          var message = { request: "selectText", "fieldName": arr[0][1], "itemIndex": row, "value": self.index };
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
        window.parent.postMessage({ request: "highlightText", "fieldName": this.colToProp(col), "itemIndex": row }, "*");
      },
      afterDeselect: function()
      {
        window.parent.postMessage({ request: "cleanHighlight" }, "*");
      },
      afterValidate: function(isValid, value, row, prop, source)
      {
        self.valid = isValid;
      }
    });
  },

  coverRenderer : function (instance, td, row, col, prop, value, cellProperties)
  {
    //console.log(row);
    var self = this;
    //console.log(self);
    //console.log(instance);
    var $anchor = $('<a>');
    // create span for delete icon
    var $deleteIcon = $('<span>');
    $deleteIcon.addClass('glyphicon glyphicon-remove');
    $deleteIcon.attr('row', row);
    $anchor.append($deleteIcon);
    $deleteIcon.click(function() {
      instance.alter('remove_row', row);
    });
    // Add class to center the icon
    $(td).addClass("deleteTd");
    $(td).empty().append($anchor); //empty is needed because you are rendering to an existing cell
  },

  twoReceiptValidator: function (value, callback)
  {
    if (value === null)
    {
      value = '';
    }
    callback(value.length !== 0);
  },

  twoReceiptNumericValidator: function (value, callback)
  {
    if (value === null)
    {
      value = '';
    }
    callback(/^-?\d*\.?\d*$/.test(value) && value.length !== 0);
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
        var tempThis = this;
        var delay = 150;

        clearTimeout($(tempThis).data("timer"));
        $(tempThis).data("timer", setTimeout(function() {
          $(tempThis).removeData("timer");
          var newValue = tempThis.value.toString();

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

          // if on spare row currently, add row
          if (row == null)
          {
            self.rows.push(that.row);
            row = self.rows.length - 1;
          }

          var colName = that.instance.colToProp(that.col);
          // minimum 3 characters
          if (newValue.length > 2) {
            var message = { request: "searchText", "fieldName": colName, "itemIndex": row, "text": newValue };
            window.parent.postMessage(message, "*");
          }
          // remove source
          else if (self.source.hasOwnProperty(row) && self.source[row].hasOwnProperty(colName) && row != null)
          {
            self.source[row][colName] = [];

            // clear autocomplete list
            self.updateTableSource(colName, row);
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

      if (row != null && Handsontable.helper.isArray(this.cellProperties.source))
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
              //console.log(that.$htContainer);
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

  // returns TwoReceipt Numeric extension of handsontable AutocompleteEditor
  initTwoReceiptNumericEditor: function(type)
  {
    var self = this;
    var TwoReceiptNumericEditor = Handsontable.editors.AutocompleteEditor.prototype.extend();

    TwoReceiptNumericEditor.prototype.createElements = function(){
      Handsontable.editors.AutocompleteEditor.prototype.createElements.apply(this, arguments);

      this.$htContainer.addClass('TwoReceiptNumericEditor');
    };

    TwoReceiptNumericEditor.prototype.bindEvents = function(){
      Handsontable.editors.AutocompleteEditor.prototype.bindEvents.apply(this, arguments);

      var that = this;
      // cell textarea change event
      $(this.TEXTAREA).bind("input propertychange", function() {
        var tempThis = this;
        var delay = 150;

        clearTimeout($(tempThis).data("timer"));
        $(tempThis).data("timer", setTimeout(function() {
          $(tempThis).removeData("timer");
          var newValue = tempThis.value.toString();

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

          // if on spare row currently, add row
          if (row == null)
          {
            self.rows.push(that.row);
            row = self.rows.length - 1;
          }

          var colName = that.instance.colToProp(that.col);
          // minimum 1 character and numeric
          if (newValue.length > 0 && Handsontable.helper.isNumeric(newValue)) {
            var message = { fieldName: colName, itemIndex: row, text: newValue/*, rowData: self.getDataAtRow(row)*/ };
            if (type === "money") {
              message.request = "searchMoney";
            } else {
              message.request = "searchNumber";
            }
            window.parent.postMessage(message, "*");
          }
          // remove source
          else if (self.source.hasOwnProperty(row) && self.source[row].hasOwnProperty(colName) && row != null)
          {
            self.source[row][colName] = [];

            // clear autocomplete list
            self.updateTableSource(colName, row);
          }
        }, delay));
      });
    };

    var onBeforeKeyDownTR;

    TwoReceiptNumericEditor.prototype.open = function () {
      Handsontable.editors.AutocompleteEditor.prototype.open.apply(this, arguments);
      console.log("open");

      var row;
      for (var index = 0; index < self.rows.length; index++)
      {
        if (self.rows[index] === this.row)
        {
          row = index;
          break;
        }
      }

      if (row != null && Handsontable.helper.isArray(this.cellProperties.source))
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

    TwoReceiptNumericEditor.prototype.close = function () {
      Handsontable.editors.AutocompleteEditor.prototype.close.apply(this, arguments);

      console.log("close");

      $(this.$textarea).off('mouseenter').off('mouseleave');

      for (var index = 0; index < this.$htContainer.handsontable('countRows'); index++) {
        (function (that, row) {
          $(that.$htContainer.handsontable('getCell', row, 0)).off('mouseenter').off('mouseleave');
        })(this, index);
      }
    };

    Handsontable.editors.TwoReceiptNumericEditor = TwoReceiptNumericEditor;
    Handsontable.editors.registerEditor('tworeceiptnumeric', TwoReceiptNumericEditor);

    return TwoReceiptNumericEditor;
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
      var item = [];
      for (var i = 0; i < this.configurations.itemColumns.length; i++) {
        item[i] = data[count][this.configurations.itemColumns[i]];
      }

      itemsArray.push(item);
    }
    this.receiptItemTable.handsontable('loadData', itemsArray);
  },

  addItemRow: function(data)
  {
    var lastRow = 0;
    var rowNum = 0;
    for (var index = this.rows.length - 1; index >= 0; index--)
    {
      if (this.rows[index] != null)
      {
        lastRow = this.rows[index] + 1;
        rowNum = this.rows[index];
        break;
      }
    }

    this.rows.push(lastRow);

    // if row is added before table is fully generated
    if (this.rows.length === 1) {
      rowNum = 0;
    } else {
      rowNum++;
    }

    for (var i = 0; i < this.configurations.itemColumns.length; i++) {
      this.receiptItemTable.handsontable('setDataAtCell', rowNum, i, data[this.configurations.itemColumns[i]]);
    }
  },

  deleteItemRow: function(rowNum)
  {
    this.receiptItemTable.handsontable('alter', 'remove_row', rowNum);
  },

  getReceiptItems: function()
  {
    var receiptItems = {};
    // Minus one row since there is always an extra empty row
    var rowsToIterate = this.rows.length - this.configurations.minSpareRows;
    for (var i = 0; i < rowsToIterate; i++)
    {
      var thisRow;
      // if position contains null then that means the element was removed
      if (this.rows[i] != null) {
        thisRow = {};
        for (var j = 0; j < this.configurations.itemColumns.length; j++)
        {
          thisRow[this.configurations.itemColumns[j]] = this.receiptItemTable.handsontable('getDataAtRowProp', this.rows[i], this.configurations.itemColumns[j]);
        }
      }

      if (thisRow != null)
      {
        receiptItems[i] = thisRow;
      }
    }
    return receiptItems;
  },

  getDataAtRow: function(rowIndex) {
    var rowData = { index: rowIndex };

    for (var index = 0; index < this.rows.length; index++) {
      if (index === rowIndex) {
        for (var j = 0; j < this.configurations.itemColumns.length; j++) {
          rowData[this.configurations.itemColumns[j]] = this.receiptItemTable.handsontable('getDataAtRowProp', this.rows[index], this.configurations.itemColumns[j]);
        }
        break;
      }
    }
    return rowData;
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
  },

  isValid: function()
  {
    console.log("handsontable valid: " + this.valid);
    return this.valid;
  },

  getRows: function()
  {
    return this.rows;
  }
};
