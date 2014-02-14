// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var receiptItemCount = 1;
var removedItemCount = 0;
var background;
var backgroundPort;
var backgroundCurrencies;
// element that is toggled for pulling data
var activeElement;

// Augmenting the validator plugin, might need a separate JavaScript files for these custom additions
$.validator.addMethod("notEqual", function(value, element, param) {
    return this.optional(element) || value !== param;
}, "Please select an option.");

function getFolders(data)
{
    var select = document.getElementById("receipt-form-folders");
		select.options[0] = new Option("", 0);
		for (var i = 0; i < data.length; i++)
		{
			select.options[i+1] = new Option(data[i].name, data[i].id);
		}
}

function getCurrencies(data)
{
    var select = document.getElementById("receipt-form-currencies");
    for (var i = 0; i < data.length; i++)
		{
      select.options[i] = new Option(data[i].code + " - " + data[i].description, data[i].id);
			if (backgroundCurrencies != null && backgroundCurrencies.indexOf(data[i].code) != -1)
			{
				select.selectedIndex = i;
				backgroundCurrencies = null;
			}
    }
}

function getPurchaseTypes(data)
{
    var select = document.getElementById("receipt-form-purchase-types");
    for (var i = 0; i < data.length; i++)
		{
      select.options[i] = new Option(data[i].name, data[i].id);
    }
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
	
	// all element groupings in divs to set colour on-pull and for consistency (ignore for json - formToJSONKeyMap, receipt-submit event)
	
	// itemtype aka item name
	var nameId = receiptItemId + "-name";
	// div to hold name
	$("<div>", {"id": nameId + "-div", "class": "item-name"}).appendTo("#" + listItemId);
  $("<label/>", {"for": nameId, text : "Item " + receiptItemCount + " Name", "class": "control-label"}).appendTo("#" + nameId + "-div");
	addSpanButtonTo(nameId, "name", receiptItemCount);	
  $("<input/>", {"class" : "form-control input-sm", 
                 "id": nameId, 
                 "name": "itemtype",
                 "type" : "text"}).appendTo("#" + nameId + "-div");
  // cost of item
  var costId = receiptItemId + "-cost";
	// div to hold cost
	$("<div>", {"id": costId + "-div", "class": "item-cost"}).appendTo("#" + listItemId);
  $("<label/>", {"for": costId, text : "Cost", "class": "control-label"}).appendTo("#" + costId + "-div");
	addSpanButtonTo(costId, "cost", receiptItemCount);	
  $("<input/>", {"class" : "form-control cost-input input-sm",
                 "id": costId,
                 "name": "cost", 
                 "type" : "text",
                 "value" : "0.00"}).appendTo("#" + costId + "-div");
  // Register event handler for when the cost changes
  $("#" + costId).change(function(event){
    $("#receipt-form-total").val(sumReceiptItemCosts());
  });

	// quantity
	var quantityId = receiptItemId + "-quantity";
	// div to hold quantity
	$("<div>", {"id": quantityId + "-div", "class": "item-quantity"}).appendTo("#" + listItemId);
  $("<label/>", {"for": quantityId, text : "Quantity", "class": "control-label"}).appendTo("#" + quantityId + "-div");
	addSpanButtonTo(quantityId, "quantity", receiptItemCount);	
  $("<input/>", {"class" : "form-control input-sm",
                 "id": quantityId, 
                 "name": "quantity", 
                 "type" : "text"}).appendTo("#" + quantityId + "-div");
  /*$("<label/>", {"for": receiptItemId + "-is-credit", text: "Is Credit?"}).appendTo("#" + listItemId);
  $("<input/>", {"id": receiptItemId + "-is-credit", 
                 "name": "is_credit", 
                 "type" : "checkbox"}).appendTo("#" + listItemId);*/

	// _destroy
	var destroyId = receiptItemId + "-_destroy";
	$("<div>", {"id": destroyId + "-div", "class": "item-destroy"}).appendTo("#" + listItemId);
	$("<button/>", {"id": receiptItemId + "-item-remove", "class": "btn btn-default", "type": "button", text: "Remove Item"}).appendTo("#" + destroyId + "-div");
	$("<input/>", {"id": destroyId, "type": "hidden", "name": "_destroy", "value": false, "class": "destroy-input"}).appendTo("#" + destroyId + "-div");
  
	// Register event handler for when the cost changes
  $("#" + receiptItemId + "-item-remove").click(function(event){
		// set _destroy to true and hide receipt item
		var id = $(this).attr('id');
		var receiptItemId = id.substring(0, id.indexOf("-item-remove"));
		$("#" + receiptItemId + "-_destroy").val(true);
		$("#receipt-form-list-item-" + receiptItemId.substring(13)).hide();
		
		removedItemCount++;
		
		// re-calculate total and if there are no more receipt items, enable total
		var form_total = $("#receipt-form-total");
		if (removedItemCount + 1 === receiptItemCount)
		{
			form_total.removeAttr("disabled");
		}
    form_total.val(sumReceiptItemCosts());
  });
	
  receiptItemCount++;
}

//TODO: Modify to use int
function sumReceiptItemCosts()
{
  var total = 0;
	// check costs where item was not removed
	var cost_inputs = $("#receipt-form-item-list>li>div.item-destroy>.destroy-input[value='false']").closest("li").find(">div.item-cost>.cost-input");
	var length = cost_inputs.length;
	for (var index = 0; index < length; index++)
	{
		//alert(parseFloat(cost_inputs.eq(index).val()));
    total += parseFloat(cost_inputs.eq(index).val());
	}
  return total;
}

function getReceiptItemsJSON()
{
  var receiptItems = {};
	var item_list = $("#receipt-form-item-list>li");
	var length = item_list.length;
	for (var index = 0; index < length; index++)
	{
		var item = item_list.eq(index);
		receiptItems[index] = {};
		receiptItems[index]["itemtype"] = item.find("div.item-name>input[name='itemtype']").val();
    receiptItems[index]["cost"] = item.find("div.item-cost>input[name='cost']").val();
    receiptItems[index]["quantity"] = item.find("div.item-quantity>input[name='quantity']").val();
    //receiptItems[index]["is_credit"] = item.find("input[name='is_credit']").is(":checked") ? 1 : 0;
    receiptItems[index]["_destroy"] = item.find("input[name='_destroy']").val();;
	}
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
		var successDiv = $("label[for=receipt-form-" + element + "]").closest('div');
		// toggled element is already selected
		if (successDiv.hasClass('has-success'))
		{
			successDiv.removeClass('has-success');
			var glyph = $("#" + activeElement + "-glyphicon");
			glyph.removeClass('glyphicon-floppy-saved');
			glyph.addClass('glyphicon-floppy-save');
			glyph.removeClass('green');
			
			chrome.runtime.sendMessage({greeting: "pull-off"});
			activeElement = null;
		}
		// toggled element is not selected
		else
		{
			// turn off element selected
			if (activeElement != null)
			{
				successDiv = $("label[for=" + activeElement + "]").closest('div');
				var glyph = $("#" + activeElement + "-glyphicon");
				successDiv.removeClass('has-success');
				glyph.removeClass('glyphicon-floppy-saved');
				glyph.addClass('glyphicon-floppy-save');
				glyph.removeClass('green');
			}
			
			chrome.runtime.sendMessage({greeting: "pull-" + element});
			activeElement = "receipt-form-" + element;
			
			glyph = $("#" + activeElement + "-glyphicon");
			$("label[for=" + activeElement + "]").closest('div').addClass('has-success');
			glyph.removeClass('glyphicon-floppy-save');
			glyph.addClass('glyphicon-floppy-saved');
			glyph.addClass('green');
		}
	}
	// assigned an itemCount
	else
	{
		var successDiv = $("label[for=receipt-item-" + itemCount + "-" + element + "]").closest('div');
		// toggled element is already selected
		if (successDiv.hasClass('has-success'))
		{
			successDiv.removeClass('has-success');
			var glyph = $("#" + activeElement + "-glyphicon");
			glyph.removeClass('glyphicon-floppy-saved');
			glyph.addClass('glyphicon-floppy-save');
			glyph.removeClass('green');
			
			chrome.runtime.sendMessage({greeting: "pull-off"});
			activeElement = null;
		}
		// toggled element is not selected
		else
		{
			// turn off element selected
			if (activeElement != null)
			{
				successDiv = $("label[for=" + activeElement + "]").closest('div');
				successDiv.removeClass('has-success');
				var glyph = $("#" + activeElement + "-glyphicon");
				glyph.removeClass('glyphicon-floppy-saved');
				glyph.addClass('glyphicon-floppy-save');
				glyph.removeClass('green');
			}
		
			chrome.runtime.sendMessage({greeting: "pull-" + element});
			activeElement = "receipt-item-" + itemCount + "-" + element;
			
			$("label[for=" + activeElement + "]").closest('div').addClass('has-success');
			glyph = $("#" + activeElement + "-glyphicon");
			glyph.removeClass('glyphicon-floppy-save');
			glyph.addClass('glyphicon-floppy-saved');
			glyph.addClass('green');
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
	chrome.runtime.sendMessage({greeting: "newReceipt"});
	
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
		var bgReceiptItems = background.receipt_items;
		if (bgReceiptItems != null)
		{
			var length = bgReceiptItems.length;
			if (length > 0)
			{
				for (var itemCount = 0; itemCount < length; itemCount++) {
					addReceiptItem();
					var formItemCount = itemCount + 1;
					
					$("#receipt-item-" + formItemCount + "-name").val(bgReceiptItems[itemCount].name);
					$("#receipt-item-" + formItemCount + "-cost").val(bgReceiptItems[itemCount].cost);
					$("#receipt-item-" + formItemCount + "-quantity").val(bgReceiptItems[itemCount].quantity);
					if (bgReceiptItems[itemCount].cost < 0)
					{
						$("#receipt-item-" + formItemCount + "-is-credit").prop('checked', true);
					}
				}
				
				$("#receipt-form-total").prop("disabled", "true");
				$("#receipt-form-total").val(sumReceiptItemCosts());
			}
		}
		
		background.title = null;
		background.date = null;
		background.vendor = null;
		background.total = null;
		background.currencies = null;
		background.transaction = null;
		background.receipt_items = null;
		
		var form_title = $("#receipt-form-title");
		form_title.focus();
		form_title.select();
	});
	
	getJsonData(foldersUrl, getFolders);
  var currenciesUrl = host + controllers["currencies"] + ".json";
  getJsonData(currenciesUrl, getCurrencies);
  var purchaseTypesUrl = host + controllers["purchase_types"] + ".json";
  getJsonData(purchaseTypesUrl, getPurchaseTypes);

  $("#receipt-form-item-add").click(function(event){
    addReceiptItem();
		var form_total = $("#receipt-form-total");
    form_total.prop("disabled", "true");
    form_total.val(sumReceiptItemCosts());
  });

  //Capture changes to item list
  $('#receipt-submit').click(function(event){
    // Make sure all fields are filled out as expected
    var check = $('#receipt-form').valid();

    //Serialize everything except receipt items
		$("#receipt-form-total").removeAttr("disabled");
    var formData = formToJSONKeyMap($("#receipt-form").find(":not(#receipt-form-item-list > li > div > input)"));
    
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
      url: appendCred(receiptsUrl),
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
  });
});