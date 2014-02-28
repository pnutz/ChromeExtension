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

//Return url string mapped to controller
function getCtrlUrl(controllerStr)
{
  if (controllerStr in controller)
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