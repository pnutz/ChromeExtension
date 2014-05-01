
var k_loginSuccessUrl = "https://www.facebook.com/connect/login_success.html";
var k_appId = "315377018611731";
var k_loginRedirectUrl = "https://www.facebook.com/dialog/oauth?" +
                       "client_id=" + k_appId + 
                       "&response_type=token&scope=email" + 
                       "&redirect_uri=" + k_loginSuccessUrl;
var k_graphApiUrl = "https://graph.facebook.com/";

function FaceBookAPI()
{
  this.localStorageStr = "fbAccessToken";
  this.bIsLoggingIn = false;
  this.tabId = -1;
}

/* Creates a new tab to start the login flow */
FaceBookAPI.prototype.StartLoginFlow = function ()
{
  // Save the current context in self
  var self = this;
  console.log("got fb login flow message");
  // Create a new tab for the facebook oauth flow
  chrome.tabs.create({ url: k_loginRedirectUrl }, function(tab) {
    console.log("setting member variables");
    self.bIsLoggingIn = true;
    self.tabId = tab.id;
  });
};

FaceBookAPI.prototype.GetAccessTokenFromLoginTab = function (tabId, url)
{
  var bHasToken = false;
  console.log("got url " + url);
  console.log(this.bIsLoggingIn);
  console.log("tabId" + tabId + "our tabid = " + this.tabId);
  if (!this.bIsLoggingIn || tabId != this.tabId)
    return;
  console.log("checkainggg");
  // Make sure we have a match
  if ((url != undefined) && (url.match(k_loginSuccessUrl).length == 1));
  {
    //TODO: right now code throws some errors if the user is not
    //      logged into facebook, improve filter so we don't go into 
    //      this flow if the url is not the redirect
    // split the url to remove the hostname
    splitUrl = url.split("#");
    console.log(splitUrl);
    // split the url with "&" delimiter to get param and value of access_token and expires_in
    splitUrl = splitUrl[1].split("&");
    console.log(splitUrl);
    // get the access token
    accessToken = splitUrl[0].split("=");
    console.log(accessToken);
    localStorage["fbAccessToken"] = accessToken[1];
    this.bIsLoggingIn = false;
    this.tabId = -1;

    // Check fb token by grabbing email from facebook
    request = $.ajax({
      url: k_graphApiUrl + "me",
      type: 'GET',
      data: {"access_token" : localStorage[this.localStorageStr]},
      dataType: 'json'
    }).done(function(data){
      // store email in localStorage
      console.log(data);
      localStorage["userEmail"] = data.email;
    }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
      console.error(
        "The following error occurred: " + textStatus,
        errorThrown);
    });
  }
};

FaceBookAPI.prototype.login = function ()
{
  if (this.localStorageStr in localStorage)
  {
    console.log("Have Fb access token, attempt to login");
  }
};

