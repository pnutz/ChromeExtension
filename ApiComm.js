function ControllerUrls(host)
{
  this.host = host;
  this.controllers = { 
                       "tokens" : "/api/v1/tokens",
                       "currencies" : "/currencies",
                       "receipts" : "/receipts",
                       "purchase_types" : "/purchase_types",
                       "folders" : "/folders",
                       "registration" : "/users/sign_up"
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
  
