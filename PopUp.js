var request;
var config;
var b;

var PopUp = 
{
  configurations: 
  {
    host : "http://localhost:3000"
  },
  
  initButtons: function()
  {
    this.buttons = 
    {
      fbLogin: $("#fb-login"),
      registration: $("#registration"),
      folders: $("#view-folders"),
      logout: $("#logout"),
      pullPage: $("#pull-page"),
      showNotification: $("#show-notification"),
      // ask background to show receipt submission form
      showReceiptForm: $("#receipt-form-show"),
      login: $("#login-button")
    };
  },

  init: function()
  {
    this.controllers = new ControllerUrls(this.configurations.host);
    this.initButtons();
    this.bindButtonEvents();
    //Initially hide all elements until authentication
    $("#login-div").hide();
    $("#main-div").hide();
    //If we have an auth Token, use it to login
    if ("authToken" in localStorage) 
    {
      // Grab folders from server to check authentication
      $.get(this.controllers.GetUrl("folders"), function(data){
        // success
        $("#main-div").show();
        $("#main-div-user-email").text("Logged in as: " + localStorage["userEmail"]);
      })
      .fail(function(){
        // Remove the auth token and reload so we can try and get a new one 
        location.reload(true);
        delete localStorage["authToken"];
        console.log("Failed to retrieve folders on login.");
      });
    }
    else if ("fbAccessToken" in localStorage && "userEmail" in localStorage)
    {
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
    else //else prompt for credentials
    {
      $("#login-div").show();
    }
  },
  
  // Append credentials to a url
  appendCred: function(url)
  {
    var credUrl = "";
    
    if ("userEmail" in localStorage &&
        "authToken" in localStorage) {
      credUrl =  url + 
          "?email=" + localStorage["userEmail"] + 
          "&token=" + localStorage["authToken"];
    } else {
      console.error("Missing credentials!");
    }
    return credUrl;
  },

  bindButtonEvents: function()
  {
    // save context
    var self = this;

    this.buttons.fbLogin.on("click", function() 
    {
      chrome.runtime.sendMessage({greeting: "FB_LOGIN_OAUTH"});
    });
    
    this.buttons.registration.on("click", function() 
    {
      chrome.tabs.create({url: registrationUrl});
      window.close();
    });

    this.buttons.logout.on("click", function() 
    {
      delete localStorage["authToken"];
      delete localStorage["fbAccessToken"];
      delete localStorage["userEmail"];
      location.reload(true);
    });

    // Setup Folder link click action
    this.buttons.folders.on("click", function() 
    { 
      chrome.tabs.create({url: self.appendCred(self.configurations.host)});
      window.close();
    });
  
    // HTML getter tool, saves HTML in datadump.txt
    this.buttons.pullPage.on("click", function() 
    {
      chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
        console.log("GET HTML");
        chrome.tabs.sendMessage(tab[0].id, {greeting: "getHTML"}, function(response) {
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
    });

    // Notification test-tool, displays current notification
    this.buttons.showNotification.on("click", function() 
    {
      chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
        console.log("notification message");
        chrome.tabs.sendMessage(tab[0].id, {greeting: "showNotification"});
        window.close();
      });
    });

    this.buttons.login.on("click", function() 
    {
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

    this.buttons.showReceiptForm.on("click", function() 
    {
      chrome.extension.sendMessage({greeting: "addReceipt"});
      window.close();
    });
  }
};

document.addEventListener('DOMContentLoaded', function() 
{
  PopUp.init();
    
	// external message from web application - to receive message when login/logout in web app
	/*chrome.runtime.onMessageExternal.addListener(
  function(request, sender, sendResponse) {
    if (request.openUrlInEditor)
      openUrl(request.openUrlInEditor);
  });*/
	
});
