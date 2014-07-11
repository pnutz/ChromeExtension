var fieldTypes  =
{
  NUMBER : 1,
  TEXT : 2,
  DATE : 3,
  SELECT : 4,
  TABLE : 5

};
var NotiBar =
{
  configurations:
  {
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
                    "note" :
                      {
                        id : "#note",
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

  init: function()
  {
    var self = this;
    // set datepicker ui element
    $(this.configurations.formFields.date.id).datepicker({
      showOn: "button",
      buttonText: '<span class="glyphicon glyphicon-calendar"></span>',
      constrainInput: false
    });
    // set autocomplete ui element
    // loop through all fields, apply to TEXT & NUMBER. except note??
    this.initAutoComplete("vendor");
    this.initAutoComplete("date");
    this.initAutoComplete("transaction");
    this.initAutoComplete("subtotal");
    this.initAutoComplete("total");
    this.initAutoComplete("taxes");

    this.initValidation();

    // on receipt submit, validate data and send dictionary of form data to content script
    $("#receipt-submit").click(function()
    {
      var notiBarValid = $("#notification-form").valid();
      var handsOnTableValid = TwoReceiptHandsOnTable.isValid();

      console.log("submit");

      if (notiBarValid && handsOnTableValid)
      {
        var savedData = self.getAllValues();
        var rows = TwoReceiptHandsOnTable.getRows();
        var message = { request: "saveReceipt", "saved_data": savedData, "rows": rows };
        window.parent.postMessage(message, "*");
      }
    });

    // on text form propertychange, send form text and fieldName to content script for search (not triggered on autocomplete select)
    $("input").bind("input propertychange", function() {
      var that = this;
      var delay = 150;
      var type = self.configurations.formFields[this.name].type;

      clearTimeout($(that).data("timer"));
      $(that).data("timer", setTimeout(function() {
        $(that).removeData("timer");
        $(that).attr("data-value", null);

        self.setAutoCompleteOptions(that.id, []);

        // search for numeric field
        if (type === fieldTypes.NUMBER && $(that).valid() && that.value.length > 0) {
          var message = { request: "searchNumber", "text": that.value, "fieldName": that.id };
          window.parent.postMessage(message, "*");
        }
        // search for regular field
        else if (type !== fieldTypes.NUMBER && that.value.length > 2) {
          var message = { request: "searchText", "text": that.value, "fieldName": that.id };
          window.parent.postMessage(message, "*");
        }
      }, delay));
    });
  },

  initValidation: function()
  {
    jQuery.validator.addMethod("isDate", function(value, element)
    {
      return !isNaN(new Date(value).getTime());
    }, "Invalid date.");

    jQuery.validator.addMethod("isMoney", function(value, element)
    {
      if (value.length === 0)
      {
        return true;
      }
      else
      {
        if (value.charAt(0) === ".")
        {
          value = "0" + value;
        }

        if (value.charAt(value.length - 1) === ".")
        {
          value += "0";
        }

        return Handsontable.helper.isNumeric(value);
      }
    }, "Invalid monetary value.");

    $("#notification-form").validate({
      rules: {
        vendor: "required",
        date: { required: true, isDate: true },
        total: { required: true, isMoney: true },
        subtotal: { isMoney: true },
        taxes: { isMoney: true }
      },

      highlight: function(element, errorClass, validClass)
      {
        $(element).closest(".form-group").removeClass("has-success").addClass("has-error");
      },
      unhighlight: function(element, errorClass, validClass)
      {
        $(element).closest(".form-group").removeClass("has-error").addClass("has-success");
      }
    });
  },

  setFieldValue: function(fieldName, value)
  {
    if (fieldName in this.configurations.formFields)
    {
      var field = this.configurations.formFields[fieldName];
      switch(field.type)
      {
        case fieldTypes.NUMBER:
        case fieldTypes.DATE:
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
   * @params fieldName the name for the element
   * @params options the option id
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
      if (value.type !== fieldTypes.TABLE)
      {
        console.log(key);
        console.log(value);
        var formItem = $(value.id);
        formDict[formItem.attr('name')] = formItem.val();
      }
    });

    formDict[$(this.configurations.formFields.items.id).attr('name')] = TwoReceiptHandsOnTable.getReceiptItems();
    console.log(formDict);
    return formDict;
  },

  initAutoComplete: function(fieldName)
  {
    if (fieldName in this.configurations.formFields)
    {
      var field = this.configurations.formFields[fieldName];

      switch(field.type)
      {
        case fieldTypes.NUMBER:
          $(this.configurations.formFields[fieldName].id).autocomplete(
            {
              minLength: 1,
              autoFocus: true,
              //delay: 500, // default 300
              source: [],
              // focus on selected option rather than autoFocus on 1st option if possible
              open: function (event, ui)
              {
                var item;
                var menu = $(this).data("ui-autocomplete").menu;
                var dataValue = $(this).attr("data-value");
                // select option if it exists in menu list
                if (dataValue !== undefined && dataValue !== null)
                {
                  var $items = $("li", menu.element);
                  var source = $(this).autocomplete("option", "source");
                  var index = 0;

                  $.each($items, function(item_index, item_value)
                  {
                    // find matching source with item
                    while (item_value.innerText !== source[index].label && index < source.length)
                    {
                      index++;
                    }

                    // only take item if data-value matches source value
                    if (dataValue === source[index].value)
                    {
                      item = $(item_value);
                    }

                    index++;

                    if (item)
                    {
                      return false;
                    }
                  });
                }

                if (item)
                {
                  menu.focus(null, item);
                }
              },
              focus: function (event, ui)
              {
                // highlight focus
                var message = { request: "highlightSearchText", "fieldName": this.id, "value": ui.item.value };
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
              console.log("focus");
              var $this = $(this);
              // displays autocomplete list on form focus
              if ($this.autocomplete("option", "source").length !== 0)
              {
                setTimeout(function()
                {
                  $this.autocomplete("search");
                }, 140);
              }
              else if ($this.val().length > 0)
              {
                var message = { request: "searchNumber", "text": $this.val(), "fieldName": $this.attr('id') };
                window.parent.postMessage(message, "*");
              }

              // unhighlight other form text and highlight text (if it exists)
              var message = { request: "highlightText", "fieldName": this.id };
              window.parent.postMessage(message, "*");
            })
            .click(function()
            {
              // if form already focused, will re-open autocomplete on click - THIS ALWAYS TRIGGERS ON FOCUS BY ORIGINAL CLICK
              var $this = $(this);
              if ($this.is(":focus") && $this.autocomplete("option", "source").length !== 0) {
                console.log("click");
                setTimeout(function()
                {
                  $this.autocomplete("search");
                }, 140);
              }
            })
            .blur(function() {
              window.parent.postMessage({ request: "cleanHighlight" }, "*");
            });
          break;
        case fieldTypes.DATE:
        case fieldTypes.TEXT:
          $(this.configurations.formFields[fieldName].id).autocomplete(
            {
              minLength: 3,
              autoFocus: true,
              //delay: 500, // default 300
              source: [],
              // focus on selected option rather than autoFocus on 1st option if possible
              open: function (event, ui)
              {
                var item;
                var menu = $(this).data("ui-autocomplete").menu;
                var dataValue = $(this).attr("data-value");
                // select option if it exists in menu list
                if (dataValue !== undefined && dataValue !== null)
                {
                  var $items = $("li", menu.element);
                  var source = $(this).autocomplete("option", "source");
                  var index = 0;

                  $.each($items, function(item_index, item_value)
                  {
                    // find matching source with item
                    while (item_value.innerText !== source[index].label && index < source.length)
                    {
                      index++;
                    }

                    // only take item if data-value matches source value
                    if (dataValue === source[index].value)
                    {
                      item = $(item_value);
                    }

                    index++;

                    if (item)
                    {
                      return false;
                    }
                  });
                }

                if (item)
                {
                  menu.focus(null, item);
                }
              },
              focus: function (event, ui)
              {
                // highlight focus
                var message = { request: "highlightSearchText", "fieldName": this.id, "value": ui.item.value };
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
              console.log("focus");
              var $this = $(this);
              // displays autocomplete list on form focus
              if ($this.autocomplete("option", "source").length !== 0) {
                setTimeout(function()
                {
                  $this.autocomplete("search");
                }, 140);
              }
              else if ($this.val().length > 2)
              {
                var message = { request: "searchText", "text": $this.val(), "fieldName": $this.attr('id') };
                window.parent.postMessage(message, "*");
              }

              // unhighlight other form text and highlight text (if it exists)
              var message = { request: "highlightText", "fieldName": this.id };
              window.parent.postMessage(message, "*");
            })
            .click(function()
            {
              // if form already focused, will re-open autocomplete on click - THIS ALWAYS TRIGGERS ON FOCUS BY ORIGINAL CLICK
              var $this = $(this);
              if ($this.is(":focus") && $this.autocomplete("option", "source").length !== 0) {
                console.log("click");
                setTimeout(function()
                {
                  $this.autocomplete("search");
                }, 140);
              }
            })
            .blur(function() {
              window.parent.postMessage({ request: "cleanHighlight" }, "*");
            });
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
        case fieldTypes.DATE:
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
  }
};

document.addEventListener('DOMContentLoaded', function() {
  NotiBar.init();
  setTimeout(function() {
    TwoReceiptHandsOnTable.init();
  }, 200);
  //TwoReceiptHandsOnTable.addItemRow("hello", 3, 43.2);
});

// send message using window.parent.postMessage("yes", '*')
window.addEventListener("message", function(event) {
  if (event.origin.indexOf("chrome-extension://") === -1)
  {
    console.log(event.data);

    // generated values for form fields
    if (event.data.request === "generatedData")
    {
      $.each(event.data.generated, function(key, value)
      {
        if (key !== "templates" && key !== "element_paths" && key !== "items")
        {
          NotiBar.setFieldValue(key, value);
        }
        else if (key === "items")
        {
          $.each(value, function(item_key, item_value)
          {
            console.log(item_value);
            // errors out if undefined is sent to addItemRow
            var itemtype = null, quantity = null, cost = null;
            if (item_value.hasOwnProperty("itemtype"))
            {
              itemtype = item_value["itemtype"];
            }

            if (item_value.hasOwnProperty("quantity"))
            {
              quantity = item_value["quantity"];
            }

            if (item_value.hasOwnProperty("cost"))
            {
              cost = item_value["cost"];
            }

            TwoReceiptHandsOnTable.addItemRow(itemtype, quantity, cost);
          });
        }
      });
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
        if (!TwoReceiptHandsOnTable.source.hasOwnProperty(event.data.itemIndex))
        {
          TwoReceiptHandsOnTable.source[event.data.itemIndex] = {};
        }
        TwoReceiptHandsOnTable.source[event.data.itemIndex][event.data.fieldName] = event.data.results;

        // update table autocomplete source and open TwoReceiptEditor
        TwoReceiptHandsOnTable.updateTableSource(event.data.fieldName, event.data.itemIndex);
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
