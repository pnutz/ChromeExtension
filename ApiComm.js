function ControllerUrls(host)
{
  this.host = host;
  this.controllers = {
                       "tokens" : "/api/v1/tokens",
                       "currencies" : "/currencies",
                       "receipts" : "/receipts",
                       "profiles" : "/profiles",
                       "receipt_categories" : "/receipt_categories",
                       "folders" : "/folders",
                       "documents" : "/documents",
                       "registration" : "/users/sign_up",
                       "tags" : "/tags",
                       "user_settings" :  "/user_settings",
                       "trouble_tickets" : "/trouble_tickets"
                     };
}

/*
 * @brief make a get request for the specified controller
 * @param sController the name of the controller
 * @param iId the id of the item in the database, null to request all
 */
ControllerUrls.prototype.GetRequest = function(sController, iId, fHandler)
{
  var sReceipt = "";
  if (iId !== null)
    sReceipt = "/" + iId;

  var request = $.ajax({
      url: this.AppendCred(this.GetUrl(sController) + sReceipt +".json"),
      type: 'GET',
      dataType: 'json'
    }).done(function(data) {
      fHandler(data);
    }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
      console.error(
        "The following error occurred: " + textStatus,
        errorThrown);
    });
};

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



