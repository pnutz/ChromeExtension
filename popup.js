// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var request;
var host = "http://localhost:3000";
var controllers = {"tokens" : "/api/v1/tokens",
                   "currencies" : "/currencies",
                   "receipts" : "/receipts",
                   "purchase_types" : "/purchase_types",
                   "folders" : "/folders"};
var loginServer = host + controllers["tokens"] + ".json";
var foldersUrl = host + controllers["folders"] + ".json";
var receiptsUrl = host + controllers["receipts"] + ".json";

function appendCred(url)
{
  return url + 
        "?email=" + localStorage["userEmail"] + 
        "&token=" + localStorage["authToken"];
}

function getFolders(data)
{
    var select = document.getElementById("receipt-form-folders");
    $.each(data, function(){
      select.options[select.options.length] = new Option(this.name, this.id);
    });
}

function getCurrencies(data)
{
    var select = document.getElementById("receipt-form-currencies");
    $.each(data, function(){
      select.options[select.options.length] = new Option(this.code + "-" + this.description, this.id);
    });
}

function getPurchaseTypes(data)
{
    var select = document.getElementById("receipt-form-purchase-types");
    $.each(data, function(){
      select.options[select.options.length] = new Option(this.name, this.id);
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
    //  "The following error occured: " + textStatus,
     // errorThrown);
  });
}

// Run our kitten generation script as soon as the document's DOM is ready.
document.addEventListener('DOMContentLoaded', function () 
{
  // setup reload link click action
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

  //Initially hide all elements until authentication
  $("#login-div").hide();
  $("#main-div").hide();
  $("#receipt-div").hide();
  if (localStorage["authToken"]) 
  {
    $("#main-div").show();
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
        "The following error occured: " + textStatus,
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

  $('#receipt-submit').click(function(event){
      var formData = formToJSONKeyMap("#receipt-form");
      var receiptData = {"receipt" : formData};
      //receiptData["total"] = 0;
      //receiptData["transaction_number"] = 0;
      var receiptRequest = $.ajax({
        url: receiptsUrl,
        type: 'POST',
        data : receiptData,
        dataType: 'json'
      }).done(function(data){
        alert("submitted");
        
      }).fail(function (jqXHR, textStatus, errorThrown){
        // log the error to the console
        console.error(
          "The following error occured: " + textStatus,
          errorThrown);
      });
  });

  // Cancel Receipt submission
  $('#receipt-submit-cancel').click(function(event){
    $("#receipt-div").hide();
    $("#main-div").show();
  });
});
