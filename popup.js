// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var request;
document.addEventListener('DOMContentLoaded', function() 
{
  $("#fb-login").click(function(){
    chrome.runtime.sendMessage({greeting: "FB_LOGIN_OAUTH"});
  });

	// Setup registration link click action
	$("#registration").click(function()
	{
		chrome.tabs.create({url: registrationUrl});
		window.close();
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
		window.close();
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
		window.close();
	});
	
	// Notification test-tool, displays current notification
	$("#show-notification").click(function()
	{
		chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
			chrome.tabs.sendMessage(tab[0].id, {greeting: "showNotification"});
		});
		window.close();
	});
	
  //Initially hide all elements until authentication
  $("#login-div").hide();
  $("#main-div").hide();
  //If we have an auth Token, use it to login
  if (localStorage["authToken"]) 
  {
    var folderUrl = appendCred(getCtrlUrlJson("folders"));
    // Grab folders from server to check authentication
    $.get(folderUrl, function(data){
      // success
      $("#main-div").show();
      $("#main-div-user-email").text("Logged in as: " + localStorage["userEmail"]);
    })
    .fail(function(){
      $("#login-div").show();
      console.log("Failed to retrieve folders on login.");
    });
      }
  else //else prompt for credentials
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
		// unsecure email/password
    var tokenAuth = $form.serialize();

    //disable forms temporarily
    $inputs.prop("disabled", true);

    //Request token from server
    request = $.ajax({
      url: loginServer,
      type: 'POST',
      data: tokenAuth,
      dataType: 'json'
    }).done(function(data){
      localStorage["authToken"] = data["token"];
      location.reload(true);
      // store email in localStorage
      localStorage["userEmail"] = $("#user-email").val();
			// store userID in localStorage
			localStorage["userID"] = data["user"];
    }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
      console.error(
        "The following error occurred: " + textStatus,
        errorThrown);
    });
  });

	// external message from web application - to receive message when login/logout in web app
	/*chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    if (request.openUrlInEditor)
      openUrl(request.openUrlInEditor);
  });*/
	
  // ask background to show receipt submission form
  $('#receipt-form-show').click(function(event){
		chrome.extension.sendMessage({greeting: "addReceipt"});
		window.close();
  });
});
