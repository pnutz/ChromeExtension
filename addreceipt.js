// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var receiptItemCount = 1;
var backgroundCurrencies;
var background;
var buttonElements = ['date', 'vendor', 'transaction'];
var receiptItemElements = ['name', 'cost', 'quantity'];
var backgroundPort;
var activeElement;

// Augmenting the validator plugin, might need a separate JavaScript files for these custom additions
$.validator.addMethod("notEqual", function(value, element, param) {
    return this.optional(element) || value !== param;
}, "Please select an option.");

function getFolders(data)
{
    var select = document.getElementById("receipt-form-folders");
		select.options[0] = new Option("", 0);
    $.each(data, function(){
      select.options[select.options.length] = new Option(this.name, this.id);
    });
}

function getCurrencies(data)
{
    var select = document.getElementById("receipt-form-currencies");
    $.each(data, function(){
      select.options[select.options.length] = new Option(this.code + " - " + this.description, this.id);
			if (backgroundCurrencies != null && backgroundCurrencies.indexOf(this.code) != -1)
			{
				select.selectedIndex = select.options.length - 1;
				backgroundCurrencies = null;
			}
    });
}

function getPurchaseTypes(data)
{
    var select = document.getElementById("receipt-form-purchase-types");
    $.each(data, function(){
      select.options[select.options.length] = new Option(this.name, this.id);
    });
}

function addSpanButtonTo(appendId, name, numValue) {
	$("<button>", {"class": "btn btn-default btn-md",
															"id": appendId + "-button",
															"type": "button"}).appendTo("#" + appendId + "-div");
	$("<span/>", {"class": "glyphicon glyphicon-floppy-save",
																	"id": appendId + "-glyphicon"}).appendTo("#" + appendId + "-button");
	// event handler for button-press
	$("#" + appendId + "-button").click(function() {
		dataButtonToggle(name, numValue);
	});
}

//TODO:Should probably put receipt items into a class
function addReceiptItem() {
  var listItemId = "receipt-form-list-item-" + receiptItemCount;
  $("<li></li>", {"class": "list-group-item", "id": listItemId}).appendTo("#receipt-form-item-list");
  var receiptItemId = "receipt-item-" + receiptItemCount;
	var nameId = receiptItemId + "-name";
	$("<div>", {"id": nameId + "-div"}).appendTo("#" + listItemId);
  $("<label/>", {"for": nameId, text : "Item " + receiptItemCount + " Name", "class": "control-label"}).appendTo("#" + nameId + "-div");
  //itemtype aka item name
	addSpanButtonTo(nameId, "name", receiptItemCount);	
  $("<input/>", {"class" : "form-control input-sm", 
                 "id": nameId, 
                 "name": "itemtype",
                 "type" : "text"}).appendTo("#" + nameId + "-div");
  //cost of item
  var costId = receiptItemId + "-cost";
	$("<div>", {"id": costId + "-div"}).appendTo("#" + listItemId);
  $("<label/>", {"for": costId, text : "Cost", "class": "control-label"}).appendTo("#" + costId + "-div");
	addSpanButtonTo(costId, "cost", receiptItemCount);	
  $("<input/>", {"class" : "form-control cost-input input-sm",
                 "id": costId,
                 "name": "cost", 
                 "type" : "text",
                 "value" : "0.00"}).appendTo("#" + costId + "-div");
  //Register event handler for when the cost changes
  $("#" + costId).change(function(event){
    $("#receipt-form-total").val(sumReceiptItemCosts());
  });

	var quantityId = receiptItemId + "-quantity";
	$("<div>", {"id": quantityId + "-div"}).appendTo("#" + listItemId);
  $("<label/>", {"for": quantityId, text : "Quantity", "class": "control-label"}).appendTo("#" + quantityId + "-div");
	addSpanButtonTo(quantityId, "quantity", receiptItemCount);	
  $("<input/>", {"class" : "form-control input-sm",
                 "id": quantityId, 
                 "name": "quantity", 
                 "type" : "text"}).appendTo("#" + quantityId + "-div");
  $("<label/>", {"for": receiptItemId + "-is-credit", text: "Is Credit?"}).appendTo("#" + listItemId);
  $("<input/>", {"id": receiptItemId + "-is-credit", 
                 "name": "is_credit", 
                 "type" : "checkbox"}).appendTo("#" + listItemId);
  receiptItemCount++;
}

//TODO: Modify to use int
function sumReceiptItemCosts()
{
  var total = 0;
  $("#receipt-form-item-list>li>.cost-input").each(function(index){
    //alert(parseFloat($(this).val()));
    total += parseFloat($(this).val());
  });
  return total;
}

function getReceiptItemsJSON()
{
  var receiptItems = {};
  $("#receipt-form-item-list>li").each(function(index){
    receiptItems[index] = {};
    receiptItems[index]["itemtype"] = $(this).find("input[name='itemtype']").val();
    receiptItems[index]["cost"] = $(this).find("input[name='cost']").val();
    receiptItems[index]["quantity"] = $(this).find("input[name='quantity']").val();
    receiptItems[index]["is_credit"] = $(this).find("input[name='is_credit']").is(":checked") ? 1 : 0;
    receiptItems[index]["_destroy"] = "false";
  });
  return receiptItems;
}

function convertToNumOfCents(value)
{
  console.log(value);
  return value;
}

function getJsonData(jsonUrl, doneCallback)
{
  var request = $.ajax({
    url: appendCred(jsonUrl),
    type: 'GET',
    dataType: 'json'
  }).done(function(data){
    doneCallback(data);
  }).fail(function (jqXHR, textStatus, errorThrown){
    alert("Failed to retrieve json data");
  // log the error to the console
   // console.error(
    //  "The following error occurred: " + textStatus,
     // errorThrown);
  });
}

function dataButtonToggle(element, itemCount)
{
	// regular form field
	if (itemCount == null)
	{
		if ($("label[for=receipt-form-" + element + "]").closest('div').hasClass('has-success'))
		{
			chrome.runtime.sendMessage({greeting: "pull-off"});
			activeElement = null;
			
			$("label[for=receipt-form-" + element + "]").closest('div').removeClass('has-success');
			$("#receipt-form-" + element + "-glyphicon").removeClass('glyphicon-floppy-saved');
			$("#receipt-form-" + element + "-glyphicon").addClass('glyphicon-floppy-save');
			$("#receipt-form-" + element + "-glyphicon").removeClass('green');
			
			var index, itemIndex;
			for (index = 0; index < buttonElements.length; index++)
			{
				if (buttonElements[index] != element)
				{
					$("#receipt-form-" + buttonElements[index] + "-button").removeAttr('disabled');
				}
			}
			for (index = 0; index < receiptItemCount; index++)
			{
				for (itemIndex = 0; itemIndex < receiptItemElements.length; itemIndex++)
				{
					$("#receipt-item-" + index + "-" + receiptItemElements[itemIndex] + "-button").removeAttr('disabled');
				}
			}
		}
		else
		{
			chrome.runtime.sendMessage({greeting: "pull-" + element});
			activeElement = "receipt-form-" + element;
			
			$("label[for=receipt-form-" + element + "]").closest('div').addClass('has-success');
			$("#receipt-form-" + element + "-glyphicon").removeClass('glyphicon-floppy-save');
			$("#receipt-form-" + element + "-glyphicon").addClass('glyphicon-floppy-saved');
			$("#receipt-form-" + element + "-glyphicon").addClass('green');
			
			var index, itemIndex;
			for (index = 0; index < buttonElements.length; index++)
			{
				if (buttonElements[index] != element)
				{
					$("#receipt-form-" + buttonElements[index] + "-button").attr('disabled', 'disabled');
				}
			}
			for (index = 0; index < receiptItemCount; index++)
			{
				for (itemIndex = 0; itemIndex < receiptItemElements.length; itemIndex++)
				{
					$("#receipt-item-" + index + "-" + receiptItemElements[itemIndex] + "-button").attr('disabled', 'disabled');
				}
			}
		}
	}
	// assigned an itemCount
	else
	{
		if ($("label[for=receipt-item-" + itemCount + "-" + element + "]").closest('div').hasClass('has-success'))
		{
			chrome.runtime.sendMessage({greeting: "pull-off"});
			activeElement = null;
			
			$("label[for=receipt-item-" + itemCount + "-" + element + "]").closest('div').removeClass('has-success');
			$("#receipt-item-" + itemCount + "-" + element + "-glyphicon").removeClass('glyphicon-floppy-saved');
			$("#receipt-item-" + itemCount + "-" + element + "-glyphicon").addClass('glyphicon-floppy-save');
			$("#receipt-item-" + itemCount + "-" + element + "-glyphicon").removeClass('green');
			
			var index, itemIndex;
			for (index = 0; index < buttonElements.length; index++)
			{
				$("#receipt-form-" + buttonElements[index] + "-button").removeAttr('disabled');
			}
			for (index = 0; index < receiptItemCount; index++)
			{
				for (itemIndex = 0; itemIndex < receiptItemElements.length; itemIndex++)
				{
					if (index != itemCount || element != receiptItemElements[itemIndex])
					{
						$("#receipt-item-" + index + "-" + receiptItemElements[itemIndex] + "-button").removeAttr('disabled');
					}
				}
			}
		}
		else
		{
			chrome.runtime.sendMessage({greeting: "pull-" + element});
			activeElement = "receipt-item-" + itemCount + "-" + element;
			
			$("label[for=receipt-item-" + itemCount + "-" + element + "]").closest('div').addClass('has-success');
			$("#receipt-item-" + itemCount + "-" + element + "-glyphicon").removeClass('glyphicon-floppy-save');
			$("#receipt-item-" + itemCount + "-" + element + "-glyphicon").addClass('glyphicon-floppy-saved');
			$("#receipt-item-" + itemCount + "-" + element + "-glyphicon").addClass('green');
			
			var index, itemIndex;
			for (index = 0; index < buttonElements.length; index++)
			{
				$("#receipt-form-" + buttonElements[index] + "-button").attr('disabled', 'disabled');
			}
			for (index = 0; index < receiptItemCount; index++)
			{
				for (itemIndex = 0; itemIndex < receiptItemElements.length; itemIndex++)
				{
					if (index != itemCount || element != receiptItemElements[itemIndex])
					{
						$("#receipt-item-" + index + "-" + receiptItemElements[itemIndex] + "-button").attr('disabled', 'disabled');
					}
				}
			}
		}		
	}
}

// Run our kitten generation script as soon as the document's DOM is ready.
$(document).ready(function () {
	// Add validation for required fields, etc.
  $('#receipt-form').validate({
     rules: {
       // 'name' attribute of HTML element used to determine rules
       // E.g. Element with name='title' uses the following rules
       title: {
         //minlength: 3,
         required: true
       },
       vendor_name: {
         required: true
       }/*,
			 // changed webapp to allow for receipts with no folder, so doesn't need to be required
       folder_id: {
         required: true,
         notEqual: "0"
       },*/
       /*purchase_type_id: {
         required: true
       },
       currency_id: {
         required: true
       }*/
     },
     highlight: function(element) {
       $(element).closest('div').addClass('has-error');
     },
     unhighlight: function(element) {
       $(element).closest('div').removeClass('has-error');
     }
  });

	// set datepicker ui element
	$("#receipt-form-date").datepicker();
	
	// toggle date element-click auto-fill
	$("#receipt-form-date-button").click(function() {
		dataButtonToggle('date', null);
	});
	
	// toggle vendor element-click auto-fill
	$("#receipt-form-vendor-button").click(function() {
		dataButtonToggle('vendor', null);
	});
	
	// toggle transaction element-click auto-fill
	$("#receipt-form-transaction-button").click(function() {
		dataButtonToggle('transaction', null);
	});
	
	// prompt user to confirm close
	window.onbeforeunload = function() {
		return "Receipt data will be discarded.";
	}
	
	// clean up message passing
	window.onunload = function() {
		chrome.runtime.sendMessage({greeting: "closeReceipt"});
	}
	
	// setup message passing between add receipt and background
	chrome.runtime.sendMessage({greeting: "addReceipt"});
	
	// long-lived connection from background
	chrome.runtime.onConnect.addListener(function(port) {
		console.log("Connected to background port: " + port.name);
		console.assert(port.name == "pullBackground");
		backgroundPort = port;
		
		port.onMessage.addListener(function(msg) {
			console.log("Received msg: " + msg.request + " for port: " + port.name);
			if (activeElement != null)
			{
				$("#" + activeElement).val(background.window[msg.request]);
			}
		});
		
		port.onDisconnect.addListener(function() {
			console.log("Disconnected port");
			backgroundPort = null;
		});
	});
	
	// pull data sent from site if it has not been pulled (event occurs after setting current date)
	chrome.runtime.getBackgroundPage(function (loadedBackground) {
		background = loadedBackground;
		
		$("#receipt-form-title").val(background.title);
		if (background.date !== null)
		{
			$("#receipt-form-date").val(background.date);
		}
		else
		{
			// set current date
			var today = new Date();
			$("#receipt-form-date").val("" + ("0" + (today.getMonth() + 1).toString()).slice(-2) + "/" + ("0" + today.getDate()).slice(-2) + "/" + today.getFullYear());
		}
		$("#receipt-form-vendor").val(background.vendor);
		$("#receipt-form-total").val(background.total);
		$("#receipt-form-transaction").val(background.transaction);
		backgroundCurrencies = background.currencies;
		if (background.receipt_items != null && background.receipt_items.length > 0)
		{
			for (var itemCount = 0; itemCount < background.receipt_items.length; itemCount++) {
				addReceiptItem();
				var formItemCount = itemCount + 1;
				
				console.log("itemCount: " + itemCount);
				console.log("receiptItemCount: " + receiptItemCount);
				console.log(background.receipt_items[itemCount].name);
				console.log($("#receipt-item-" + formItemCount + "-cost").val());
				
				$("#receipt-item-" + formItemCount + "-name").val(background.receipt_items[itemCount].name);
				$("#receipt-item-" + formItemCount + "-cost").val(background.receipt_items[itemCount].cost);
				$("#receipt-item-" + formItemCount + "-quantity").val(background.receipt_items[itemCount].quantity);
				if (background.receipt_items[itemCount].cost < 0)
				{
					$("#receipt-item-" + formItemCount + "-is-credit").prop('checked', true);
				}
			}
			
			$("#receipt-form-total").prop("disabled", "true");
			$("#receipt-form-total").val(sumReceiptItemCosts());
		}
		
		background.title = null;
		background.date = null;
		background.vendor = null;
		background.total = null;
		background.currencies = null;
		background.transaction = null;
		background.receipt_items = null;
		
		$("#receipt-form-title").focus();
		$("#receipt-form-title").select();
	});
	
	getJsonData(foldersUrl, getFolders);
  var currenciesUrl = host + controllers["currencies"] + ".json";
  getJsonData(currenciesUrl, getCurrencies);
  var purchaseTypesUrl = host + controllers["purchase_types"] + ".json";
  getJsonData(purchaseTypesUrl, getPurchaseTypes);

  $("#receipt-form-item-add").click(function(event){
    addReceiptItem();
    $("#receipt-form-total").prop("disabled", "true");
    $("#receipt-form-total").val(sumReceiptItemCosts());
  });

  //Capture changes to item list
  $('#receipt-submit').click(function(event){
    // Make sure all fields are filled out as expected
    var check = $('#receipt-form').valid();

    //Serialize everything except receipt items
    var formData = formToJSONKeyMap($("#receipt-form").find(":not(#receipt-form-item-list > li > input)"));
    
		// formData["folder_id"] is a string, so cannot 'exactly equal to' 0
    if (formData["folder_id"] == 0)
    {
      delete formData["folder_id"];
    }
    
    var receiptData = {"receipt" : formData};			
    receiptData["receipt"]["receipt_items_attributes"] = getReceiptItemsJSON();
    
		// are you sure dialog should not appear
		window.onbeforeunload = null;
		
    //receiptData["receipt"]["total"] = 0;
    //receiptData["receipt"]["transaction_number"] = 0;
    var receiptRequest = $.ajax({
      url: receiptsUrl,
      type: 'POST',
      data : receiptData,
      dataType: 'json'
    }).done(function(data){
      alert("submitted");
      window.close();
    }).fail(function (jqXHR, textStatus, errorThrown){
      // log the error to the console
      console.error(
        "The following error occurred: " + textStatus,
        errorThrown);
    });
  });

  $('#receipt-submit-cancel').click(function(event){
		// using the default chrome dialog works for chrome.windows popup
		window.close();
	
    // TODO: This is probably not the best way to create the divs and buttons for confirmation button
    /*$('body').append("<div id=\"receipt-cancel-confirm\" title=\"Delete confirmation\">"+
                     "<p>Are you sure you want to discard the current receipt?</p>"+
                      '<button type="button" class="btn btn-primary" id="receipt-trash">Discard Receipt</button>'+
                      '<button type="button" class="btn" id="receipt-save">Cancel</button>'+
                      "</div>");
    $("#receipt-cancel-confirm").dialog({
         closeOnEscape: false,
         open: function(event, ui) {
           $(".ui-dialog-titlebar-close").hide(); 
         },
         resizable: false
    });

    // Attach confirmation listeners
    $('#receipt-save').click(function(e){
      $('#receipt-cancel-confirm').dialog('close');
      $('#receipt-cancel-confirm').remove();
    });
    $('#receipt-trash').click(function(e){
      window.close();
    });*/
  });
});