var request;
var config;
var b;

var PopUp =
{
  configurations:
  {
    host : "http://localhost:3000"
  },

  initButtons: function() {
    this.buttons =
    {
      fbLogin: $("#fb-login"),
      registration: $("#registration"),
      folders: $("#view-folders"),
      vault: $("#view-vault"),
      logout: $("#logout"),
      //pullPage: $("#pull-page"),
      troubleTicket: $("#trouble-ticket"),
      // ask background to show receipt submission form
      showReceiptForm: $("#receipt-form-show"),
      login: $("#login-button")
    };
  },

  init: function() {
    var self = this;
    // Temporarily hard code webapp host
    localStorage["webAppHost"] = "http://localhost:3000";
    this.controllers = new ControllerUrls(this.configurations.host);
    this.initButtons();
    this.bindButtonEvents();
    //Initially hide all elements until authentication
    $("#login-div").hide();
    $("#main-div").hide();
    //If we have an auth Token, use it to login
    if ("authToken" in localStorage) {
      // Grab folders from server to check authentication
      $.get(this.controllers.GetUrl("folders"), function(data){
        // success
        $("#main-div").show();
        $("#main-div-user-email").text("Logged in as: " + localStorage["userEmail"]);

        // store receipt url in localStorage
        localStorage["receiptPost"] = self.controllers.AppendCred(self.controllers.GetUrl("receipts") + ".json");
      })
      .fail(function(){
        // Remove the auth token and reload so we can try and get a new one
        location.reload(true);
        delete localStorage["authToken"];
        console.log("Failed to retrieve folders on login.");
      });
    } else if ("fbAccessToken" in localStorage && "userEmail" in localStorage) {
      console.log("authenticating with fb access token");
      var authData = {"email" : localStorage["userEmail"],
                   "fbAccessToken" : localStorage["fbAccessToken"]}
      // Request token from server
      request = $.ajax({
        url: this.controllers.GetUrl("tokens") + ".json",
        type: 'POST',
        data: authData,
        dataType: 'json'
      }).done(function(data){
        console.log("Dude token is " + data.token);
        localStorage["authToken"] = data["token"];
        console.log("got token" + localStorage["authToken"]);
        location.reload(true);
        // store userID in localStorage
        localStorage["userID"] = data["user"];
      }).fail(function (jqXHR, textStatus, errorThrown){
      // log the error to the console
        console.error(
          "The following error occurred: " + textStatus,
          errorThrown);
      });
    }
    //else prompt for credentials
    else {
      $("#login-div").show();
    }
  },

  bindButtonEvents: function() {
    // save context
    var self = this;

    // facebook login
    this.buttons.fbLogin.on("click", function() {
      chrome.runtime.sendMessage({request: "FB_LOGIN_OAUTH"});
    });

    // Registration button
    this.buttons.registration.on("click", function() {
      chrome.tabs.create({url: self.controllers.GetUrl("registration")});
      window.close();
    });

    // Logout button
    this.buttons.logout.on("click", function() {
      delete localStorage["authToken"];
      delete localStorage["fbAccessToken"];
      delete localStorage["userEmail"];
      location.reload(true);
    });

    // Setup Folder link click action
    this.buttons.folders.on("click", function() {
      chrome.tabs.create({url: self.controllers.AppendCred(self.configurations.host)});
      window.close();
    });

    // Setup vault link click action
    this.buttons.vault.on("click", function() {
      chrome.tabs.create({url: "vault/vault.html"});
      window.close();
    });

    // HELPER METHOD, NO LONGER USED
    // HTML getter tool, saves HTML in datadump.txt
    /*this.buttons.pullPage.on("click", function() {
      chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
        console.log("GET HTML");
        chrome.tabs.sendMessage(tab[0].id, {request: "getHTML"}, function(response) {
          if (response.farewell === "sendHTML") {
            // html getter tool
            var textfile = "datadump.txt";
            var blob = new Blob([response.data], {type:'text/plain'});
            var dl = document.getElementById("downloadLink");
            dl.download = textfile;

            if (window.webkitURL !== null)
            {
              // Chrome allows the link to be clicked
              // without actually adding it to the DOM.
              dl.href = window.webkitURL.createObjectURL(blob);
            }
            dl.click();
          }
          window.close();
        });
      });
    });*/

    this.buttons.login.on("click", function() {
      if (request) {
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
        url: self.controllers.GetUrl("tokens") + ".json",
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

    this.buttons.showReceiptForm.on("click", function() {
      chrome.extension.sendMessage({request: "addReceipt"});
      window.close();
    });

    this.buttons.troubleTicket.on("click", function() {
      // opens popup for submitting trouble ticket
      chrome.windows.create({"url": "troubleticket/troubleticket.html", "type": "popup", height: 390, width: 500});
      window.close();
    });
  }
};

document.addEventListener('DOMContentLoaded', function() {
  PopUp.init();

	// external message from web application - to receive message when login/logout in web app
	/*chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    if (request.openUrlInEditor)
      openUrl(request.openUrlInEditor);
  });*/

});
