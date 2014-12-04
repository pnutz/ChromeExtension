var fieldTypes = {
  NUMBER : 1,
  TEXT : 2,
  DATE : 3,
  SELECT : 4,
  TABLE : 5
};

// static observer to detect changes in system
// tracks generated attributes and applies them once the notificationbar has finished loading
var WebAppObserver = {
  observers: {},

  init: function() {
    console.log("Started WebAppObserver");
  },

  notify: function(attribute) {
    if (this.observers.hasOwnProperty(attribute)) {
      // add additional attribute calculations as required
      switch(attribute) {
        case "currency":
          NotiBar.setCurrencyByCode(this.observers.currency);
          break;
        case "items":
          $.each(value, function(itemKey, itemValue) {
            console.log(itemValue);
            NotiBar.itemTable.addDataRow(itemValue);
          });
          break;
        case "taxes":
          $.each(value, function(taxKey, taxValue) {
            console.log(taxValue);
            NotiBar.taxTable.addDataRow(taxValue);
          });
          break;
      }
      this.removeObserver(attribute);
    }
  },

  addObserver: function(attribute, value) {
    this.observers[attribute] = value;
  },

  removeObserver: function(attribute) {
    delete this.observers[attribute];
  },

  hasObserver: function(attribute) {
    if (this.observers.hasOwnProperty(attribute)) {
      return true;
    } else {
      return false;
    }
  }
};

var NotiBar = {
  configurations: {
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
                        type : fieldTypes.TABLE
                      },
                    /*"shipping" :
                      {
                        id : "#shipping",
                        type : fieldTypes.NUMBER
                      },*/
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
                      },
                    "folder" :
                      {
                        id :  "#folder",
                        type : fieldTypes.SELECT
                      },
                    "currency" :
                      {
                        id :  "#currency",
                        type : fieldTypes.SELECT
                      }
                  }
  },

  init: function() {
    var self = this;

    WebAppObserver.init();

    var hotkeys;
    document.onkeydown = function keydown(evt) {
      if (!evt) {
        evt = event;
      }

      if (self.hotkeys.hasOwnProperty("receipt") && self.hotkeys.receipt !== "null" && evt.altKey && evt.keyCode == self.hotkeys.receipt) {
        chrome.runtime.sendMessage({ request: "addReceipt" });
      }
      else if (self.hotkeys.hasOwnProperty("vault") && self.hotkeys.vault !== "null" && evt.altKey && evt.keyCode == self.hotkeys.vault) {
        chrome.runtime.sendMessage({ request: "openVault" });
      }
    };

    setTimeout(function() {
      self.itemTable = TwoReceiptHandsOnTable().init("items", ["Receipt Item", "Quantity", "Cost"], ["itemtype", "quantity", "item_cost"], ["text", "number", "money"], [0.6, 0.2, 0.2]);
      WebAppObserver.notify("items");
      /*var data = { itemtype: "hello", quantity: 3, item_cost: 43.2 };
      self.itemTable.addDataRow(data);*/

      self.taxTable = TwoReceiptHandsOnTable().init("taxes", ["Tax/Fee Type", "Cost"], ["taxtype", "tax_cost"], ["text", "money"], [0.7, 0.3]);
      WebAppObserver.notify("taxes");

      // on receipt submit, validate data and send dictionary of form data to content script
      $("#receipt-submit").click(function() {
        var notiBarValid = $("#notification-form").valid();
        var itemTableValid = self.itemTable.isValid();
        var taxTableValid = self.taxTable.isValid();

        console.log("submit");

        if (notiBarValid && itemTableValid && taxTableValid) {
          var savedData = self.getAllValues();
          var rows = self.itemTable.getRows();
          // rows for taxTable?
          var message = { request: "saveReceipt", "savedData": savedData, "rows": rows };
          window.parent.postMessage(message, "*");
        }
      });
    }, 250);

    // set datepicker ui element
    $(this.configurations.formFields.date.id).datepicker({
      showOn: "button",
      buttonText: '<span class="glyphicon glyphicon-calendar"></span>',
      constrainInput: false
    });

    // set autocomplete ui element
    this.initAutoComplete("vendor");
    this.initAutoComplete("date");
    this.initAutoComplete("transaction");
    this.initAutoComplete("subtotal");
    this.initAutoComplete("total");
    //this.initAutoComplete("shipping");

    this.initValidation();
    this.initGetFolders();
    this.initGetCurrencies();
    this.initGetProfiles();
    this.initGetCategories();

    // resetting the source of iframe causes a window unload
    $("#receipt-close").click(function() {
      location.href = "";
    });

    // prompt warning on notification bar unload
    window.onbeforeunload = function() {
      return "Receipt data will be discarded.";
    };

    // send to content script when notification bar is closed to clean up
    window.onunload = function() {
      window.parent.postMessage({ request: "closeReceipt" }, "*");
    };

    // DEPRECIATED WITH AUTOMATED ROW GENERATION
    /*$("#receipt-items-add").click(function() {
      var message = { request: "getItemRows" };
      window.parent.postMessage(message, "*");
    });*/

    // on text form propertychange, send form text and fieldName to content script for search (not triggered on autocomplete select)
    $("input").bind("input propertychange", function() {
      var that = this;
      var textDelay = 500;
      var numericDelay = 750;
      var type = self.configurations.formFields[this.name].type;

      console.log("request: " + that.value);

      clearTimeout($(that).data("timer"));

      // search for numeric field
      if (type === fieldTypes.NUMBER && $(that).valid() && that.value.length > 0) {
        $(that).data("timer", setTimeout(function() {
          $(that).removeData("timer");
          $(that).attr("data-value", null);

          self.setAutoCompleteOptions(that.id, []);

          var message = { request: "searchMoney", "text": that.value, "fieldName": that.id };
          window.parent.postMessage(message, "*");
        }, numericDelay));
      }
      // search for regular field
      else if (type !== fieldTypes.NUMBER && that.value.length > 2) {
        $(that).data("timer", setTimeout(function() {
          $(that).removeData("timer");
          $(that).attr("data-value", null);

          self.setAutoCompleteOptions(that.id, []);

          var message = { request: "searchText", "text": that.value, "fieldName": that.id };
          window.parent.postMessage(message, "*");
        }, textDelay));
      }
    });
  },

  initGetFolders: function() {
    var message = { request: "getFolders" };
    window.parent.postMessage(message, "*");
  },

  initGetCurrencies: function() {
    var message = { request: "getCurrencies" };
    window.parent.postMessage(message, "*");
  },

  initGetProfiles: function() {
    var message = { request: "getProfiles" };
    window.parent.postMessage(message, "*");
  },

  initGetCategories: function() {
    var message = { request: "getCategories" };
    window.parent.postMessage(message, "*");
  },

  // sets currency to param code
  setCurrencyByCode: function(code) {
    if (code !== "") {
      $(NotiBar.configurations.formFields.currency.id + " option").each(function() {
        var selectText = $(this).text();
        var currencyCode = selectText.substring(0, selectText.indexOf(" "));
        if (code === currencyCode) {
          NotiBar.setFieldValue("currency", $(this).val());
          return false;
        }
      });
    }
  },

  initValidation: function() {
    jQuery.validator.addMethod("isDate", function(value, element) {
      return !isNaN(new Date(value).getTime());
    }, "Invalid date.");

    jQuery.validator.addMethod("isMoney", function(value, element) {
      if (value.length === 0) {
        return true;
      } else {
        if (value.charAt(0) === ".") {
          value = "0" + value;
        }

        if (value.charAt(value.length - 1) === ".") {
          value += "0";
        }

        return Handsontable.helper.isNumeric(value);
      }
    }, "Invalid monetary value.");

    $("#notification-form").validate({
      rules: {
        vendor: "required",
        date: { required: true, isDate: true },
        total: { /*required: true,*/ isMoney: true },
        subtotal: { isMoney: true },
        shipping: { isMoney: true },
        category: "required",
        profile: "required"/*,
        taxes: { isMoney: true }*/
      },

      highlight: function(element) {
        $(element).closest(".form-group").removeClass("has-success").addClass("has-error");
      },
      unhighlight: function(element) {
        $(element).closest(".form-group").removeClass("has-error").addClass("has-success");
      }
    });
  },

  setFieldValue: function(fieldName, value) {
    if (fieldName in this.configurations.formFields) {
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
    } else {
      console.error("Could not find field : " + fieldName);
    }
  },

  /**
   * @brief set the chosen option for the <select> fields
   * @params fieldId the id for the element
   * @params the id for the option
   */
  setSelectOption: function(fieldId, optionId) {
    if (!isNaN(optionId)) {
      $(fieldId).val(optionId);
    } else {
      console.error("Expected a numeric value for id");
    }
  },

  /**
   * @brief set the text values for the form fields
   * @params fieldId the id for the element
   * @params value text value to be shown
   */
  setInputFieldValue: function(fieldId, value) {
    $(fieldId).val(value);
  },

  /**
   * @brief set the selected option for <select> fields
   * @params fieldName the name for the element
   * @params options the option id
   */
  setSelectFieldOptions: function(fieldName, options) {
    if (fieldName in this.configurations.formFields &&
        this.configurations.formFields[fieldName].type === fieldTypes.SELECT) {
      var field = $(this.configurations.formFields[fieldName].id);
      $.each(options, function(index, option) {
        if ("id" in option) {
          var selectItem = $("<option></option>");
          selectItem.attr("value", option.id);
          selectItem.text(option.name);
          field.append(selectItem);
        } else {
          console.error("Input option missing id");
        }
      });
    } else {
      console.error("Invalid field name" + fieldName);
    }
  },

  getAllValues: function() {
    var formDict = {};
    $.each(this.configurations.formFields, function(key, value) {
      if (value.type !== fieldTypes.TABLE) {
        console.log(key);
        console.log(value);
        var formItem = $(value.id);
        formDict[formItem.attr('name')] = formItem.val();
      }
    });

    formDict[$(this.configurations.formFields.items.id).attr('name')] = this.itemTable.getTableData();
    formDict[$(this.configurations.formFields.taxes.id).attr('name')] = this.taxTable.getTableData();
    console.log(formDict);
    return formDict;
  },

  initAutoComplete: function(fieldName) {
    if (fieldName in this.configurations.formFields) {
      var field = this.configurations.formFields[fieldName];

      switch(field.type) {
        case fieldTypes.NUMBER:
          $(this.configurations.formFields[fieldName].id).autocomplete(
            {
              minLength: 1,
              autoFocus: true,
              //delay: 500, // default 300
              source: [],
              // focus on selected option rather than autoFocus on 1st option if possible
              open: function (event, ui) {
                var item;
                var menu = $(this).data("ui-autocomplete").menu;
                var dataValue = $(this).attr("data-value");
                // select option if it exists in menu list
                if (dataValue != null) {
                  var $items = $("li", menu.element);
                  var source = $(this).autocomplete("option", "source");
                  var index = 0;

                  $.each($items, function(itemIndex, itemValue) {
                    // find matching source with item
                    while (itemValue.innerText !== source[index].label && index < source.length) {
                      index++;
                    }

                    // only take item if data-value matches source value
                    if (dataValue === source[index].value) {
                      item = $(itemValue);
                    }

                    index++;

                    if (item) {
                      return false;
                    }
                  });
                }

                if (item) {
                  menu.focus(null, item);
                }
              },
              focus: function (event, ui) {
                // highlight focus
                var message = { request: "highlightSearchText", "fieldName": this.id, "value": ui.item.value };
                window.parent.postMessage(message, "*");

                return false;
              },
              select: function (event, ui) {
                $(this).val(ui.item.label);
                $(this).attr("data-value", ui.item.value);

                // highlight, set selected
                var message = { request: "selectText", "fieldName": this.id, "value": $(this).attr("data-value") };
                window.parent.postMessage(message, "*");

                event.preventDefault();
              }
            })
            .focus(function() {
              console.log("focus");
              var $this = $(this);
              // displays autocomplete list on form focus
              if ($this.autocomplete("option", "source").length !== 0) {
                setTimeout(function() {
                  $this.autocomplete("search");
                }, 140);
              } else if ($this.val().length > 0) {
                var message = { request: "searchNumber", "text": $this.val(), "fieldName": $this.attr('id') };
                window.parent.postMessage(message, "*");
              }

              // unhighlight other form text and highlight text (if it exists)
              var message = { request: "highlightText", "fieldName": this.id };
              window.parent.postMessage(message, "*");
            })
            .click(function() {
              // if form already focused, will re-open autocomplete on click - THIS ALWAYS TRIGGERS ON FOCUS BY ORIGINAL CLICK
              var $this = $(this);
              if ($this.is(":focus") && $this.autocomplete("option", "source").length !== 0) {
                console.log("click");
                setTimeout(function() {
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
              open: function (event, ui) {
                var item;
                var menu = $(this).data("ui-autocomplete").menu;
                var dataValue = $(this).attr("data-value");
                // select option if it exists in menu list
                if (dataValue != null) {
                  var $items = $("li", menu.element);
                  var source = $(this).autocomplete("option", "source");
                  var index = 0;

                  $.each($items, function(itemIndex, itemValue) {
                    // find matching source with item
                    while (itemValue.innerText !== source[index].label && index < source.length) {
                      index++;
                    }

                    // only take item if data-value matches source value
                    if (dataValue === source[index].value) {
                      item = $(itemValue);
                    }

                    index++;

                    if (item) {
                      return false;
                    }
                  });
                }

                if (item) {
                  menu.focus(null, item);
                }
              },
              focus: function (event, ui) {
                // highlight focus
                var message = { request: "highlightSearchText", "fieldName": this.id, "value": ui.item.value };
                window.parent.postMessage(message, "*");

                return false;
              },
              select: function (event, ui) {
                $(this).val(ui.item.label);
                $(this).attr("data-value", ui.item.value);

                // highlight, set selected
                var message = { request: "selectText", "fieldName": this.id, "value": $(this).attr("data-value") };
                window.parent.postMessage(message, "*");

                event.preventDefault();
              }
            })
            .focus(function() {
              console.log("focus");
              var $this = $(this);
              // displays autocomplete list on form focus
              if ($this.autocomplete("option", "source").length !== 0) {
                setTimeout(function() {
                  $this.autocomplete("search");
                }, 140);
              } else if ($this.val().length > 2) {
                var message = { request: "searchText", "text": $this.val(), "fieldName": $this.attr('id') };
                window.parent.postMessage(message, "*");
              }

              // unhighlight other form text and highlight text (if it exists)
              var message = { request: "highlightText", "fieldName": this.id };
              window.parent.postMessage(message, "*");
            })
            .click(function() {
              // if form already focused, will re-open autocomplete on click - THIS ALWAYS TRIGGERS ON FOCUS BY ORIGINAL CLICK
              var $this = $(this);
              if ($this.is(":focus") && $this.autocomplete("option", "source").length !== 0) {
                console.log("click");
                setTimeout(function() {
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
    } else {
      console.error("Could not find field : " + fieldName);
    }
  },

  /**
   * @brief set the autocomplete options for the form fields
   * @params fieldName of the element
   * @params array of options for autocomplete
   */
  setAutoCompleteOptions: function(fieldName, options) {
    if (fieldName in this.configurations.formFields) {
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
    } else {
      console.error("Could not find field : " + fieldName);
    }
  }
};

document.addEventListener('DOMContentLoaded', function() {
  NotiBar.init();
});

// send message using window.parent.postMessage("yes", '*')
window.addEventListener("message", function(event) {
  // TODO: chrome extension id
  if (event.origin.indexOf("chrome-extension://") === -1) {
    switch(event.data.request) {

      // initialize hotkeys
      case "getHotkeys":
        NotiBar.hotkeys = event.data;
        break;

      // generated values for form fields
      case "generatedData":
        // add subtotal to event.data.generated
        if (event.data.generated.hasOwnProperty("total") && event.data.generated.hasOwnProperty("taxes")) {
          var subtotal = event.data.generated.total;

          var taxKeys = Object.keys(event.data.generated.taxes);
          for (var i = 0; i < taxKeys.length; i++) {
            subtotal -= event.data.generated.taxes[taxKeys[i]].tax_cost;
          }
          event.data.generated.subtotal = subtotal;
        }

        $.each(event.data.generated, function(key, value) {
          if (key !== "templates" && key !== "elementPaths" && key !== "items" && key !== "taxes" && key !== "currency") {
            NotiBar.setFieldValue(key, value);
          } else if (key === "items") {
            if (NotiBar.itemTable.addDataRow != null) {
              $.each(value, function(itemKey, itemValue) {
                console.log(itemValue);
                NotiBar.itemTable.addDataRow(itemValue);
              });
            } else {
              WebAppObserver.addObserver(key, value);
            }
          } else if (key === "taxes") {
            if (NotiBar.taxTable.addDataRow != null) {
              $.each(value, function(taxKey, taxValue) {
                console.log(taxValue);
                NotiBar.taxTable.addDataRow(taxValue);
              });
            } else {
              WebAppObserver.addObserver(key, value);
            }
          } else if (key === "currency") {
            if (NotiBar.configurations.formFields[key] != null) {
              // if currency select list is already populated
              if ($(NotiBar.configurations.formFields.currency.id + " option").length > 0) {
                NotiBar.setCurrencyByCode(value);
              } else {
                WebAppObserver.addObserver(key, value);
              }
            }
          }
        });
        break;

      case "getFolders":
        var select = document.getElementById("folder");
        var option = document.createElement("option");
        option.value = "";
        option.innerHTML = "";
        select.appendChild(option);
        for (var i = 0; i < event.data.folderData.length; i++) {
          option = document.createElement("option");
          option.value = event.data.folderData[i].id;
          option.innerHTML = event.data.folderData[i].name;
          select.appendChild(option);
        }
        break;

      case "getCurrencies":
        var select = document.getElementById("currency");
        var defaultOption = document.createElement("option");
        var usdOption = document.createElement("option");

        var optgroup = document.createElement("optgroup");
        // process html entities so they will appear properly
        var emDash = $("<label />").html("&mdash;&mdash;&mdash;&mdash;&mdash;&mdash;").text();
        optgroup.label = emDash;
        select.appendChild(optgroup);

        for (var i = 0; i < event.data.currencyData.length; i++) {
          var option = document.createElement("option");
          option.value = event.data.currencyData[i].id;
          option.innerHTML = event.data.currencyData[i].code + " " + event.data.currencyData[i].description;

          if (event.data.currencyData[i].code === "USD") {
            usdOption.value = option.value;
            usdOption.innerHTML = option.innerHTML;
          }

          if (event.data.currencyData[i].selected === "true") {
            defaultOption.value = option.value;
            defaultOption.innerHTML = option.innerHTML;
            defaultOption.setAttribute("selected", true);
          }
          select.appendChild(option);
        }

        if (defaultOption.value === usdOption.value) {
          select.insertBefore(defaultOption, optgroup);
        } else if (usdOption.value > defaultOption.value) {
          select.insertBefore(usdOption, optgroup);
          select.insertBefore(defaultOption, usdOption);
        } else {
          select.insertBefore(defaultOption, optgroup);
          select.insertBefore(usdOption, defaultOption);
        }

        WebAppObserver.notify("currency");
        break;

      case "getProfiles":
        var select = document.getElementById("profile");
        for (var i = 0; i < event.data.profileData.length; i++) {
          option = document.createElement("option");
          option.value = event.data.profileData[i].id;
          option.innerHTML = event.data.profileData[i].name;
          select.appendChild(option);
        }
        break;

     case "getCategories":
        var select = document.getElementById("category");
        var option = document.createElement("option");
        option.value = "";
        option.innerHTML = "";
        select.appendChild(option);
        for (var i = 0; i < event.data.categoryData.length; i++) {
          option = document.createElement("option");
          option.value = event.data.categoryData[i].id;
          option.innerHTML = event.data.categoryData[i].category;
          select.appendChild(option);
        }
        break;

      // interaction with highlighted data
      case "highlightSelected":
        break;

      // search results
      case "searchResults":
        // regular form
        if (event.data.itemIndex == null) {
          NotiBar.setAutoCompleteOptions(event.data.fieldName, event.data.results);
        }
        // handsontable
        else {
          if (event.data.tableType === "item") {
            // store search results in source so handsontable can switch between sources for different cells
            if (!NotiBar.itemTable.source.hasOwnProperty(event.data.itemIndex)) {
              NotiBar.itemTable.source[event.data.itemIndex] = {};
            }
            NotiBar.itemTable.source[event.data.itemIndex][event.data.fieldName] = event.data.results;

            // update table autocomplete source and open TwoReceiptEditor
            NotiBar.itemTable.updateTableSource(event.data.fieldName, event.data.itemIndex);
          } else {
            // store search results in source so handsontable can switch between sources for different cells
            if (!NotiBar.taxTable.source.hasOwnProperty(event.data.itemIndex)) {
              NotiBar.taxTable.source[event.data.itemIndex] = {};
            }
            NotiBar.taxTable.source[event.data.itemIndex][event.data.fieldName] = event.data.results;

            // update table autocomplete source and open TwoReceiptEditor
            NotiBar.taxTable.updateTableSource(event.data.fieldName, event.data.itemIndex);
          }
        }
        break;

      // generated item row
      case "newItemRows":
        for (var i = 0; i < event.data.items.length; i++) {
          NotiBar.itemTable.addDataRow(event.data.items[i]);
        }
        break;

      case "getRowData":
        var row = NotiBar.itemTable.getDataAtRow(event.data.itemIndex);
        var message = { request: "returnRowData", data: row };
        window.parent.postMessage(message, "*");
        break;

      case "close":
        window.onunload = function() {
          window.parent.postMessage({ request: "reopenReceipt" }, "*");
        };

        location.href = "";

        setTimeout(function() {
          // javascript doesn't run while onbeforeunload dialog is open
          // if it makes it to this timeout, it means that user rejected closing notification
          console.log("timed out");
          window.onunload = function() {
            window.parent.postMessage({ request: "closeReceipt" }, "*");
          };
        }, 100);
        break;
    }
  }
});
