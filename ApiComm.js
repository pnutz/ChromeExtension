function ControllerUrls(host)
{
  this.host = host;
  this.controllers = {
                       "tokens" : "/api/v1/tokens",
                       "currencies" : "/currencies",
                       "receipts" : "/receipts",
                       "purchase_types" : "/purchase_types",
                       "folders" : "/folders",
                       "documents" : "/documents",
                       "registration" : "/users/sign_up",
                       "tags" : "/tags",
                       "user_settings" :  "/user_settings",
                       "trouble_tickets" : "/trouble_tickets"
                     };
}

ControllerUrls.prototype.GetUrl = function(controller)
{
  var url = "";
  if (controller in this.controllers) {
    url = this.host + this.controllers[controller];
  }
  return url;
};

// TODO: refactor appendCred to be internal and doesn't need
// to be called externally
ControllerUrls.prototype.AppendCred = function(url)
{
  if ("userEmail" in localStorage && "authToken" in localStorage)
  {
    credUrl =  url +
      "?email=" + localStorage["userEmail"] +
      "&token=" + localStorage["authToken"];
  }
  else
    console.error("Missing credentials!");

  return credUrl;
};



