// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var receiptItemCount = 1;
var backgroundCurrency;

// Augmenting the validator plugin, might need a separate JavaScript files for these custom additions
$.validator.addMethod("notEqual", function(value, element, param) {
    return this.optional(element) || value !== param;
}, "Please select an option.");

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
	
	// pull data sent from site if it has not been pulled (event occurs after setting current date)
	chrome.runtime.getBackgroundPage(function (background) {
		$("#receipt-form-title").val(background.title);
		if (background.date !== null)
		{
			$("#receipt-form-date").val(background.date);
		}
		else
		{
			// set current date
			var today = new Date();
			$("#receipt-form-date").val("" + ("0" + today.getMonth() + 1).slice(-2) + "/" + ("0" + today.getDate()).slice(-2) + "/" + today.getFullYear());
		}
		$("#receipt-form-vendor").val(background.vendor_name);
		$("#receipt-form-total").val(background.total);
		$("#receipt-form-transaction").val(background.transactionNumber);
		backgroundCurrency = background.currency;
		if (background.receipt_items.length > 0)
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
		background.vendor_name = null;
		background.total = null;
		background.currency = null;
		background.transactionNumber = null;
		background.num_receipt_items = 0;
		
		$("#receipt-form-title").focus();
		$("#receipt-form-title").select();
	});
});

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
			if (this.code === backgroundCurrency)
			{
				select.selectedIndex = select.options.length - 1;
				backgroundCurrency = null;
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

//TODO:Should probably put receipt items into a class
function addReceiptItem() {
  var listItemId = "receipt-form-list-item-" + receiptItemCount;
  $("<li></li>", {"class": "list-group-item", "id": listItemId}).appendTo("#receipt-form-item-list");
  var receiptItemId = "receipt-item-" + receiptItemCount;
  $("<label/>", {"for": receiptItemId + "-name", text : "Item " + receiptItemCount + " Name"}).appendTo("#" + listItemId);
  //itemtype aka item name
  $("<input/>", {"class" : "form-control", 
                 "id": receiptItemId + "-name", 
                 "name": "itemtype",
                 "type" : "text"}).appendTo("#" + listItemId);
  //cost of item
  var costId = receiptItemId + "-cost";
  $("<label/>", {"for": costId, text : "Cost"}).appendTo("#" + listItemId);
  $("<input/>", {"class" : "form-control cost-input",
                 "id": costId, 
                 "name": "cost", 
                 "type" : "text",
                 "value" : "0.00"}).appendTo("#" + listItemId);
  //Register event handler for when the cost changes
  $("#" + costId).change(function(event){
    $("#receipt-form-total").val(sumReceiptItemCosts());
  });

  $("<label/>", {"for": receiptItemId + "-quantity", text : "Quantity"}).appendTo("#" + listItemId);
  $("<input/>", {"class" : "form-control",
                 "id": receiptItemId + "-quantity", 
                 "name": "quantity", 
                 "type" : "text"}).appendTo("#" + listItemId);
  $("<label/>", {"for": receiptItemId + "-is-credit", text : "Is Credit?"}).appendTo("#" + listItemId);
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
    alert(parseFloat($(this).val()));
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
// Run our kitten generation script as soon as the document's DOM is ready.
document.addEventListener('DOMContentLoaded', function () 
{
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
    // TODO: This is probably not the best way to create the divs and buttons for confirmation button
    $('body').append("<div id=\"receipt-cancel-confirm\" title=\"Delete confirmation\">"+
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
    });
  });
});
