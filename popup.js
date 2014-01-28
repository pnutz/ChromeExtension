// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var request;
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
				//if (response.farewell == "showNotification") {
					// to use this, add "notifications", to manifest.json permissions
					/*chrome.notifications.create("", {
						type: 'basic',
						iconUrl: 'icon.png',
						title: response.farewell,
						message: response.data
					}, function(notificationId) {
					});*/
				//}
			});
		});
	});
	
  //Initially hide all elements until authentication
  $("#login-div").hide();
  $("#main-div").hide();
  //$("#receipt-div").hide();
  //If we have an auth Token, use it to login
  if (localStorage["authToken"]) 
  {
    //TODO: we should probably check if the token works
    $("#main-div").show();
    $("#main-div-user-email").text("Logged in as: " + localStorage["userEmail"]);
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
    chrome.windows.create({"url" : "addreceipt.html", "type" : "popup"});
  });
});
