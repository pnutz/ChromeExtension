var TwoReceiptHandsOnTable = function() {
  return {
    configurations: {
      //tableHeaders : ["Receipt Item", "Quantity", "Cost", "Delete"],
      //tableColumns: ["itemtype", "quantity", "cost"],
      minSpareRows : 1
    },

    init: function(id, tableHeaders, tableColumns, columnFormat, columnWidth) {
      var self = this;
      this.valid = true;
      this.rows = [];
      // handsontable source
      this.source = {};
      // handsontable last focused index
      this.index = -1;

      this.configurations.tableHeaders = tableHeaders;
      this.configurations.tableColumns = tableColumns;

      // setup handsontable for receipt items
      this.table = $("#" + id);

      // set handsontable width to the parent div width
      console.log(this.table.parent().width());
      var tableWidth = this.table.parent().width() - 100;
      console.log(tableWidth);

      var TwoReceiptEditor = this.initTwoReceiptEditor();
      var TwoReceiptNumericEditor = this.initTwoReceiptNumericEditor("numeric");
      var TwoReceiptMoneyEditor = this.initTwoReceiptNumericEditor("money");

      var columns = [];
      var colWidths = [];
      for (var i = 0; i < this.configurations.tableHeaders.length; i++) {
        var data = {
          data: this.configurations.tableColumns[i]
        };

        switch (columnFormat[i]) {
          case "text":
            data.editor = TwoReceiptEditor;
            data.renderer = "autocomplete";
            data.validator = this.twoReceiptValidator;
            data.strict = false;
            break;

          case "number":
            data.editor = TwoReceiptNumericEditor;
            data.renderer = "numeric";
            data.validator = this.twoReceiptNumericValidator;
            data.format = "0.00";
            break;

          case "money":
            data.editor = TwoReceiptMoneyEditor;
            data.renderer = "numeric";
            data.validator = this.twoReceiptNumericValidator;
            data.format = "$0, 0.00";
            break;

          default:
            data.editor = TwoReceiptEditor;
            data.renderer = "autocomplete";
            data.validator = this.twoReceiptValidator;
            data.strict = false;
            break;
        }
        columns.push(data);
        colWidths.push(tableWidth * columnWidth[i]);
      }

      // add for delete column
      this.configurations.tableHeaders.push("Delete");
      columns.push({
        renderer : this.coverRenderer,
        readOnly : true,
        copyable: false
      });
      colWidths.push(50);

      console.log(colWidths);

      this.table.handsontable({
        startRows: 0, // required for newer version of handsontable
        stretchH : 'last', // Setting this to 'all' causes resizing issues
        colWidths : colWidths,
        width : tableWidth + 100,
        colHeaders : this.configurations.tableHeaders,
        rowHeaders : true,
        manualColumnResize : true,
        minSpareRows : this.configurations.minSpareRows,
        columnSorting : true,
        // DEPRECIATED, push index immediately when row created (this pushes after)
        /*afterCreateRow : function (index, data) {
          // add a row to the representation
          self.rows.push(index);
        },*/
        afterRemoveRow: function (tableRowIndex, data) {
          var rowsCount = 0;
          var rowRemoved = false;
          // Use the table's row index to find the corresponding index
          // in the table
          // the position in the array corresponding to the
          // tables row index is where we should start subtracting
          $.each(self.rows, function(index, value) {
            if (value === tableRowIndex)  {
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
            for (; rowsCount < self.rows.length; rowsCount++) {
              // don't decrement if the element is null
              // since that means the item was removed
              if (self.rows[rowsCount] !== null) {
                self.rows[rowsCount] -= 1;
              }
            }
          }
        },
        // If we want stuff after the table initializes
        afterInit: function() {

        },
        columns: columns,
        afterChange: function(arr, op) {
          // after autocomplete is closed, include duplicate values since text location might be different
          // do not include numeric column names (delete)
          if (op === "edit" && arr.length === 1 && self.index !== -1 && isNaN(parseInt(arr[0][1]))) {
            // retrieve actual row (including deleted)
            var row;
            for (var index = 0; index < self.rows.length; index++) {
              if (self.rows[index] === arr[0][0]) {
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
        afterSelection: function(selectedRow, col) {
          if (isNaN(parseInt(this.colToProp(col)))) {
            var row;
            for (var index = 0; index < self.rows.length; index++) {
              if (self.rows[index] === selectedRow) {
                row = index;
                break;
              }
            }
            window.parent.postMessage({ request: "highlightText", "fieldName": this.colToProp(col), "itemIndex": row }, "*");
          }
        },
        afterDeselect: function() {
          window.parent.postMessage({ request: "cleanHighlight" }, "*");
        },
        afterValidate: function(isValid, value, row, prop, source) {
          self.valid = isValid;
        }
      });

      return self;
    },

    coverRenderer : function (instance, td, row, col, prop, value, cellProperties) {
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

    twoReceiptValidator: function (value, callback) {
      if (value === null) {
        value = '';
      }
      callback(value.length !== 0);
    },

    twoReceiptNumericValidator: function (value, callback) {
      if (value === null) {
        value = '';
      }
      callback(/^-?\d*\.?\d*$/.test(value) && value.length !== 0);
    },

    // returns TwoReceipt extension of handsontable AutocompleteEditor
    initTwoReceiptEditor: function() {
      var self = this;
      var TwoReceiptEditor = Handsontable.editors.AutocompleteEditor.prototype.extend();

      TwoReceiptEditor.prototype.createElements = function() {
        Handsontable.editors.AutocompleteEditor.prototype.createElements.apply(this, arguments);

        this.$htContainer.addClass('TwoReceiptEditor');
      };

      TwoReceiptEditor.prototype.bindEvents = function() {
        Handsontable.editors.AutocompleteEditor.prototype.bindEvents.apply(this, arguments);

        var that = this;
        // cell textarea change event
        $(this.TEXTAREA).bind("input propertychange", function() {
          var tempThis = this;
          var delay = 500;

          clearTimeout($(tempThis).data("timer"));
          $(tempThis).data("timer", setTimeout(function() {
            $(tempThis).removeData("timer");
            var newValue = tempThis.value.toString();

            // retrieve actual row (including deleted)
            var row;
            for (var index = 0; index < self.rows.length; index++) {
              if (self.rows[index] === that.row) {
                row = index;
                break;
              }
            }

            // if on spare row currently, add row
            if (row == null) {
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
            else if (self.source.hasOwnProperty(row) && self.source[row].hasOwnProperty(colName) && row != null) {
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
            if (self.index !== -1) {
              self.index--;
              $(innerHOT.getCell(self.index, 0)).trigger("mouseenter");
            } else {
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
            if (self.index !== -1) {
              // check if at end of source
              self.index++;
              $(innerHOT.getCell(self.index, 0)).trigger("mouseenter");
              // not turning grey??
            } else {
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
        for (var index = 0; index < self.rows.length; index++) {
          if (self.rows[index] === this.row) {
            row = index;
            break;
          }
        }

        (function (that) {
            Handsontable.PluginHooks.add( 'afterSelectionEnd', function(rower,column) {
              self.index = rower;

              var message = { request: "highlightSearchText", "fieldName": that.instance.colToProp(that.col), "itemIndex": row, "value": self.index };
              window.parent.postMessage(message, "*");
            });

            Handsontable.PluginHooks.add( 'afterDeselect', function() {
                window.parent.postMessage({ request: "highlightText", "fieldName": that.instance.colToProp(that.col), "itemIndex": row }, "*");
            });
          })(this);


        if (row != null && Handsontable.helper.isArray(this.cellProperties.source)) {
          (function (that) {
            // mouseenter/mouseleave for main text area
            $(that.$textarea).on('mouseenter', function() {
              window.parent.postMessage({ request: "highlightText", "fieldName": that.instance.colToProp(that.col), "itemIndex": row }, "*");
            })
            .on('mouseleave', function() {
              window.parent.postMessage({ request: "cleanHighlight" }, "*");
            });
          })(this);

          for (var index = 0; index < this.$htContainer.handsontable('countRows'); index++) {
            // optionIndex is selected option index in visible autocomplete list (choices)
            (function (that, optionIndex) {
              $(that.$htContainer.handsontable('getCell', optionIndex, 0))
              .on('mouseenter', function() {
                // iterate through entire autocomplete source, matching with shown choices until optionIndex is found
                var choiceIndex = 0;
                for (var sourceIndex = 0; sourceIndex < that.cellProperties.source.length; sourceIndex++) {
                  if (that.cellProperties.source[sourceIndex] === that.choices[choiceIndex]) {
                    // change optionIndex to represent selected option in entire source
                    if (choiceIndex === optionIndex) {
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
              .on('mouseleave', function() {
                self.index = -1;
                window.parent.postMessage({ request: "cleanHighlight" }, "*");
              });
            })(this, index);
          }
        }
      };

      TwoReceiptEditor.prototype.close = function () {
        Handsontable.editors.AutocompleteEditor.prototype.close.apply(this, arguments);

        Handsontable.PluginHooks.hooks['afterSelectionEnd'] = [];
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
    initTwoReceiptNumericEditor: function(type) {
      var self = this;
      var TwoReceiptNumericEditor = Handsontable.editors.AutocompleteEditor.prototype.extend();

      TwoReceiptNumericEditor.prototype.createElements = function() {
        Handsontable.editors.AutocompleteEditor.prototype.createElements.apply(this, arguments);

        this.$htContainer.addClass('TwoReceiptNumericEditor');
      };

      TwoReceiptNumericEditor.prototype.bindEvents = function() {
        Handsontable.editors.AutocompleteEditor.prototype.bindEvents.apply(this, arguments);

        var that = this;
        // cell textarea change event
        $(this.TEXTAREA).bind("input propertychange", function() {
          var tempThis = this;
          var delay = 750;

          clearTimeout($(tempThis).data("timer"));
          $(tempThis).data("timer", setTimeout(function() {
            $(tempThis).removeData("timer");
            var newValue = tempThis.value.toString();

            // retrieve actual row (including deleted)
            var row;
            for (var index = 0; index < self.rows.length; index++) {
              if (self.rows[index] === that.row) {
                row = index;
                break;
              }
            }

            // if on spare row currently, add row
            if (row == null) {
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
            else if (self.source.hasOwnProperty(row) && self.source[row].hasOwnProperty(colName) && row != null) {
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
        for (var index = 0; index < self.rows.length; index++) {
          if (self.rows[index] === this.row) {
            row = index;
            break;
          }
        }

        if (row != null && Handsontable.helper.isArray(this.cellProperties.source)) {
          (function (that) {
            // mouseenter/mouseleave for main text area
            $(that.$textarea).on('mouseenter', function() {
              window.parent.postMessage({ request: "highlightText", "fieldName": that.instance.colToProp(that.col), "itemIndex": row }, "*");
            })
            .on('mouseleave', function() {
              window.parent.postMessage({ request: "cleanHighlight" }, "*");
            });
          })(this);

          for (var index = 0; index < this.$htContainer.handsontable('countRows'); index++) {
            // optionIndex is selected option index in visible autocomplete list (choices)
            (function (that, optionIndex) {
              $(that.$htContainer.handsontable('getCell', optionIndex, 0))
              .on('mouseenter', function() {
                // iterate through entire autocomplete source, matching with shown choices until optionIndex is found
                var choiceIndex = 0;
                for (var sourceIndex = 0; sourceIndex < that.cellProperties.source.length; sourceIndex++) {
                  if (that.cellProperties.source[sourceIndex] === that.choices[choiceIndex]) {
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
              .on('mouseleave', function() {
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
    setTable: function(data) {
      var itemsArray = [];
      for (var count = 0; count < data.length; count++) {
        var item = [];
        for (var i = 0; i < this.configurations.tableColumns.length; i++) {
          item[i] = data[count][this.configurations.tableColumns[i]];
        }

        itemsArray.push(item);
      }
      this.table.handsontable('loadData', itemsArray);
    },

    addDataRow: function(data) {
      var lastRow = 0;
      var rowNum = 0;
      for (var index = this.rows.length - 1; index >= 0; index--) {
        if (this.rows[index] != null) {
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

      for (var i = 0; i < this.configurations.tableColumns.length; i++) {
        this.table.handsontable('setDataAtCell', rowNum, i, data[this.configurations.tableColumns[i]]);
      }
      console.log(this.rows);
    },

    deleteItemRow: function(rowNum) {
      this.table.handsontable('alter', 'remove_row', rowNum);
    },

    getTableData: function() {
      var tableData = {};
      // Minus one row since there is always an extra empty row
      var rowsToIterate = this.rows.length;
      for (var i = 0; i < rowsToIterate; i++) {
        var thisRow;
        // if position contains null then that means the element was removed
        if (this.rows[i] != null) {
          thisRow = {};
          for (var j = 0; j < this.configurations.tableColumns.length; j++) {
            thisRow[this.configurations.tableColumns[j]] = this.table.handsontable('getDataAtRowProp', this.rows[i], this.configurations.tableColumns[j]);
          }
        }

        if (thisRow != null) {
          tableData[i] = thisRow;
        }
      }
      return tableData;
    },

    getDataAtRow: function(rowIndex) {
      var rowData = { index: rowIndex };

      for (var index = 0; index < this.rows.length; index++) {
        if (index === rowIndex) {
          for (var j = 0; j < this.configurations.tableColumns.length; j++) {
            rowData[this.configurations.tableColumns[j]] = this.table.handsontable('getDataAtRowProp', this.rows[index], this.configurations.tableColumns[j]);
          }
          break;
        }
      }
      return rowData;
    },

    updateTableSource: function(fieldName, itemIndex) {
      // set autocomplete source
      var row = this.rows[itemIndex];
      var col = this.table.handsontable('propToCol', fieldName);
      var cellProperties = this.table.handsontable('getCellMeta', row, col);
      cellProperties.source = this.source[itemIndex][fieldName];

      // open TwoReceiptEditor
      cellProperties.instance.getActiveEditor().close();
      cellProperties.instance.getActiveEditor().open();
      console.log(cellProperties);
    },

    isValid: function() {
      console.log("handsontable valid: " + this.valid);
      return this.valid;
    },

    getRows: function() {
      return this.rows;
    }
  }
};
