// TwoReceipt extension of handsontable AutocompleteEditor
(function (Handsontable) {
  var TwoReceiptEditor = Handsontable.editors.AutocompleteEditor.prototype.extend();

  TwoReceiptEditor.prototype.init = function () {
    Handsontable.editors.AutocompleteEditor.prototype.init.apply(this, arguments);

    this.query = null;
    this.choices = [];
  };

  TwoReceiptEditor.prototype.createElements = function(){
    Handsontable.editors.AutocompleteEditor.prototype.createElements.apply(this, arguments);

    this.$htContainer.addClass('TwoReceiptEditor');

  };

  TwoReceiptEditor.prototype.bindEvents = function(){

    /*var that = this;
    this.$textarea.on('keydown.TwoReceiptEditor', function(event){
      if(!Handsontable.helper.isMetaKey(event.keyCode) || [Handsontable.helper.keyCode.BACKSPACE, Handsontable.helper.keyCode.DELETE].indexOf(event.keyCode) != -1){
        setTimeout(function () {
          that.queryChoices(that.$textarea.val());
        });
      } else if (event.keyCode == Handsontable.helper.keyCode.ENTER && that.cellProperties.strict !== true){
        that.$htContainer.handsontable('deselectCell');
      }

    });

    this.$htContainer.on('mouseleave', function () {
      if(that.cellProperties.strict === true){
        that.highlightBestMatchingChoice();
      }
    });

    this.$htContainer.on('mouseenter', function () {
      that.$htContainer.handsontable('deselectCell');
    });

    Handsontable.editors.AutocompleteEditor.prototype.bindEvents.apply(this, arguments);*/

  };

  //var onBeforeKeyDownInner;

  TwoReceiptEditor.prototype.open = function () {

    Handsontable.editors.AutocompleteEditor.prototype.open.apply(this, arguments);

    /*this.$textarea[0].style.visibility = 'visible';
    this.focus();

    var choicesListHot =  this.$htContainer.handsontable('getInstance');
    var that = this;
    choicesListHot.updateSettings({
      'colWidths': [this.wtDom.outerWidth(this.TEXTAREA) - 2],
      afterRenderer: function (TD, row, col, prop, value) {
        var caseSensitive = this.getCellMeta(row, col).filteringCaseSensitive === true;
        var indexOfMatch =  caseSensitive ? value.indexOf(this.query) : value.toLowerCase().indexOf(that.query.toLowerCase());

        if(indexOfMatch != -1){
          var match = value.substr(indexOfMatch, that.query.length);
          TD.innerHTML = value.replace(match, '<strong>' + match + '</strong>');
        }
      }
    });

    onBeforeKeyDownInner = function (event) {
      var instance = this;

      if (event.keyCode == Handsontable.helper.keyCode.ARROW_UP){
        if (instance.getSelected() && instance.getSelected()[0] == 0){

          if(!parent.cellProperties.strict){
            instance.deselectCell();
          }

          parent.instance.listen();
          parent.focus();
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }

    };

    choicesListHot.addHook('beforeKeyDown', onBeforeKeyDownInner);

    this.queryChoices(this.TEXTAREA.value);*/

    // TEST FUNCTION START
    // disable these listeners on close - listeners can be open at all times if just mouseover - // .off("mouseenter", )
    // since source changes every time open, need to do this
    // single editor instance for table, shared among all cells - use common editor properties (this.row, this.col)
    // on mouseleave, message based on text - no highlight
    // on autocomplete selection - send message
    // beforekeydown - arrow keys
    
    // need to know which cell this editor is acting upon
    console.log("row: " + this.row);
    console.log("col: " + this.col);
    for (var index = 0; index < this.$htContainer.handsontable('countRows'); index++) {
      (function (that, row) {
        $(that.$htContainer.handsontable('getCell', row, 0)).on('mouseenter', function() {
          console.log("MouseEnter Row");
          // know autocomplete index: row
          // know autocomplete value: getDataAtCell
          console.log(that.$htContainer.handsontable('getDataAtCell', row, 0));
          // send message here
        });
      })(this, index);
    }
    // TEST FUNCTION END
  };

  TwoReceiptEditor.prototype.close = function () {

    this.$htContainer.handsontable('getInstance').removeHook('beforeKeyDown', onBeforeKeyDownInner);

    Handsontable.editors.AutocompleteEditor.prototype.close.apply(this, arguments);
  };

  Handsontable.editors.TwoReceiptEditor = TwoReceiptEditor;
  Handsontable.editors.registerEditor('tworeceipt', TwoReceiptEditor);

})(Handsontable);