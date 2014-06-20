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
    this.initAutoComplete("vendor");
    this.initAutoComplete("address");
    this.initAutoComplete("date");
    this.initAutoComplete("transaction");
    this.initAutoComplete("subtotal");
    this.initAutoComplete("total");
    this.initAutoComplete("taxes");

    this.initValidation();

    // on receipt submit, send dictionary of form data to content script
    $("#receipt-submit").click(function()
    {
      var valid = $("#notification-form").valid();

      if (valid)
      {
        var saved_data = self.getAllValues();
        var message = { request: "saveReceipt", "saved_data": saved_data };
        window.parent.postMessage(message, "*");
      }
    });

    // on text form propertychange, send form text and fieldName to content script for search (not triggered on autocomplete select)
    $("input").bind("input propertychange", function() {
      var that = this;
      var delay = 150;

      clearTimeout($(that).data("timer"));
      $(that).data("timer", setTimeout(function() {
        $(that).removeData("timer");
        $(that).attr("data-value", null);

        self.setAutoCompleteOptions(that.id, []);

        if (that.value.length > 2) {
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

    $("#notification-form").validate({
      rules: {
        vendor: "required",
        date: { required: true, isDate: true },
        total: "required",
        taxes: "required"
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

    formDict[$(this.configurations.formFields.items.id).attr('name')] = TwoReceiptHandsOnTable.getReceiptItems();
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
        case fieldTypes.DATE:
        case fieldTypes.TEXT:
          $(this.configurations.formFields[fieldName].id).autocomplete(
            {
              minLength: 3,
              autoFocus: true,
              //delay: 500, // default 300
              source: [""],
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
              // displays autocomplete list on form focus
              if ($(this).autocomplete("option", "source") !== null) {
                $(this).autocomplete("search");
              }

              // unhighlight other form text and highlight text (if it exists)
              var message = { request: "highlightText", "fieldName": this.id };
              window.parent.postMessage(message, "*");
            })
            .click(function()
            {
              // if form already focused, will re-open autocomplete on click
              if ($(this).is(":focus") && $(this).autocomplete("option", "source") !== null) {
                $(this).autocomplete("search");
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
  TwoReceiptHandsOnTable.init();
  TwoReceiptHandsOnTable.addItemRow("hello", 3, 43.2);
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
