// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var receiptItemCount = 1;

$(function() {
	$("#receipt-form-date").datepicker();
	var today = new Date();
	$("#receipt-form-date").val("" + today.getMonth()+1 + "/" + today.getDate() + "/" + today.getFullYear());
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
    });
}

function getPurchaseTypes(data)
{
    var select = document.getElementById("receipt-form-purchase-types");
    $.each(data, function(){
      select.options[select.options.length] = new Option(this.name, this.id);
    });
}

function addReceiptItem()
{
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
  $("<label/>", {"for": receiptItemId + "-cost", text : "Cost"}).appendTo("#" + listItemId);
  $("<input/>", {"class" : "form-control",
                 "id": receiptItemId + "-cost", 
                 "name": "cost", 
                 "type" : "text",
                 "value" : "0.00"}).appendTo("#" + listItemId);
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
function changeReceiptItemTotal()
{
  var total = 0;
  $("#receipt-form-item-list>li").each(function(index){
    total += convertToNumOfCents($(this).find("input[name='cost']").val());
  });
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
  });

  //Capture changes to item list
  $("#receipt-form-item-list").change(function(event){
  });

  $('#receipt-submit').click(function(event){
      //Serialize everything except receipt items
      var formData = formToJSONKeyMap($("#receipt-form").find(":not(#receipt-form-item-list > li > input)"));
			
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
    alert("You cannot cancel right now muhaha!");
  });
});
