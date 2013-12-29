// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var request;
var host = "http://localhost:3000";
var controllers = {"tokens" : "/api/v1/tokens",
                   "folders" : "/folders"};
var loginServer = host + controllers["tokens"] + ".json";

function appendCred(url)
{
  return url + 
        "?email=" + localStorage["userEmail"] + 
        "&token=" + localStorage["authToken"];
}

function getFolders()
{
    var foldersUrl = host + controllers["folders"] + ".json";
    var request = $.ajax({
      url: appendCred(foldersUrl),
      type: 'GET',
      dataType: 'json'
    }).done(function(data){
      setupOptions("receipt-form-folders", data);
    }).fail(function (jqXHR, textStatus, errorThrown){
      alert("failed");
    // log the error to the console
     // console.error(
      //  "The following error occured: " + textStatus,
       // errorThrown);
    });
}

function setupOptions(listId, options)
{
  var select = document.getElementById(listId);
  $.each(options, function(){
    select.options[select.options.length] = new Option(this.name, this.id);
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
        "The following error occured: " + textStatus,
        errorThrown);
    });
  });

  // show receipt submission form
  $('#receipt-form-show').click(function(event){
    $("#receipt-div").show();
    $("#main-div").hide();
    getFolders();
  });

  // Cancel Receipt submission
  $('#receipt-submit-cancel').click(function(event){
    $("#receipt-div").hide();
    $("#main-div").show();
  });
});
