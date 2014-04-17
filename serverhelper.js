// TODO: Deprecate this and use API comm

var host = "http://localhost:3000";
//var host = "http://72.52.131.224";
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

// Facebook app Id
var k_appId = "847371951945853";
// Facebook login flow redirect
var k_redirectUrlFb = "https://www.facebook.com/dialog/oauth?" +
                      "client_id=" + k_appId + 
                      "&response_type=token&scope=email" + 
                      "&redirect_uri=https://www.facebook.com/connect/login_success.html";

//Return url string mapped to controller
function getCtrlUrl(controllerStr)
{
  if (controllerStr in controllers)
  {
    return host + controllers[controllerStr];
  }
}

//Return url string with json extension ending
function getCtrlUrlJson(controllerStr)
{
  return getCtrlUrl(controllerStr) + ".json";
}

function appendCred(url)
{
  return url + 
        "?email=" + localStorage["userEmail"] + 
        "&token=" + localStorage["authToken"];
}
