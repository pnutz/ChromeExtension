// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var request;
var host = "http://localhost:3000";
var controllers = {"tokens" : "/api/v1/tokens",
                   "currencies" : "/currencies",
                   "receipts" : "/receipts",
                   "purchase_types" : "/purchase_types",
                   "folders" : "/folders",
									 "registration" : "/users/sign_up"};
var loginServer = host + controllers["tokens"] + ".json";
var foldersUrl = host + controllers["folders"] + ".json";
var receiptsUrl = host + controllers["receipts"] + ".json";
var registrationUrl = host + controllers["registration"];
var receiptItemCount = 1;

$(function() {
	$("#receipt-form-date").datepicker();
	var today = new Date();
	$("#receipt-form-date").val("" + today.getMonth()+1 + "/" + today.getDate() + "/" + today.getFullYear());
});

function appendCred(url)
{
  return url + 
        "?email=" + localStorage["userEmail"] + 
        "&token=" + localStorage["authToken"];
}

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
                 "type" : "text"}).appendTo("#" + listItemId);
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
	// Setup registration link click action
	$("#registration").click(function()
	{
		chrome.tabs.create({url: registrationUrl});
	});
	
  // Setup reload link click action
  $("#reload-page").click(function()
  {
    localStorage.removeItem("authToken");
    location.reload(true);
  });

  // Setup Folder link click action
  $("#view-folders").click(function()
  {
    chrome.tabs.create({url: appendCred(host)});
  });
	
	// HTML getter tool, saves HTML in datadump.txt
	$("#pull-page").click(function()
	{
		chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
			chrome.tabs.sendMessage(tab[0].id, {greeting: "getHTML"}, function(response) {
				if (response.farewell == "sendHTML") {
					// html getter tool
					var textfile = "datadump.txt";
					var blob = new Blob([response.data], {type:'text/plain'});
					var dl = document.getElementById("downloadLink");
					dl.download = textfile;
					
					if (window.webkitURL != null)
					{
						// Chrome allows the link to be clicked
						// without actually adding it to the DOM.
						dl.href = window.webkitURL.createObjectURL(blob);
					}
					dl.click();
				}
			});
		});
	});
	
	// Notification test-tool, displays current notification
	$("#show-notification").click(function()
	{
		chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
			chrome.tabs.sendMessage(tab[0].id, {greeting: "showNotification"}, function(response) {
				if (response.farewell == "showNotification") {
					// to use this, add "notifications", to manifest.json permissions
					/*chrome.notifications.create("", {
						type: 'basic',
						iconUrl: 'icon.png',
						title: response.farewell,
						message: response.data
					}, function(notificationId) {
					});*/
				}
			});
		});
	});
	
  //Initially hide all elements until authentication
  $("#login-div").hide();
  $("#main-div").hide();
  $("#receipt-div").hide();
  if (localStorage["authToken"]) 
  {
    $("#main-div").show();
    $("#main-div-user-email").text("Logged in as: " + localStorage["userEmail"]);
  }
  else
  {
    $("#login-div").show();
  }

  $("#login-button").click(function(event){
    if (request)
    {
      request.abort();
    }

    //Form the url parameters
    var $form = $("#login-form");
    //Get form inputs to disable
    var $inputs = $form.find("input");
    var tokenAuth = $form.serialize();
    

    //disable forms temporarily
    $inputs.prop("disabled", true);

    //Request token from server
    request = $.ajax({
      url: loginServer,
      type: 'POST',
      data : tokenAuth,
      dataType: 'json'
    }).done(function(data){
      localStorage["authToken"] = data["token"];
      location.reload(true);
      //store email in localStorage
      localStorage["userEmail"] = $("#user-email").val();
    }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
      console.error(
        "The following error occurred: " + textStatus,
        errorThrown);
    });
  });

  // show receipt submission form
  $('#receipt-form-show').click(function(event){
		$("#receipt-div").show();
    $("#main-div").hide();
    getJsonData(foldersUrl, getFolders);
    var currenciesUrl = host + controllers["currencies"] + ".json";
    getJsonData(currenciesUrl, getCurrencies);
    var purchaseTypesUrl = host + controllers["purchase_types"] + ".json";
    getJsonData(purchaseTypesUrl, getPurchaseTypes);
  });

  $("#receipt-form-item-add").click(function(event){
    addReceiptItem();
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
        $("#receipt-div").hide();
				$("#main-div").show();
				
      }).fail(function (jqXHR, textStatus, errorThrown){
        // log the error to the console
        console.error(
          "The following error occurred: " + textStatus,
          errorThrown);
      });
  });

  // Cancel Receipt submission
  $('#receipt-submit-cancel').click(function(event){
    $("#receipt-div").hide();
    $("#main-div").show();
  });
});
