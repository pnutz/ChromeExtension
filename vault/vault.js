var dummyReceipts = ["04/34/2443", "Amazon", "43.5345", "buying stuff"];
var dummyArray = [];
var controllers;

// Append credentials to a url
function appendCred(url)
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
};

document.addEventListener('DOMContentLoaded', function() {
  controllers = new ControllerUrls(localStorage["webAppHost"]);
  for (var i = 0; i < 30; i++)
  {
    dummyArray.push(dummyReceipts);
  } 
  $('#vault-navbar a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });
  
 
  if ("authToken" in localStorage && "userEmail" in localStorage)
  {
    var request = $.ajax({
        url: appendCred(controllers.GetUrl("receipts") + ".json"),
        type: 'GET',
        dataType: 'json'
      }).done(function(data){
        console.log("got data" + data[0].vendor_id);
        $('#vault-receipts').DataTable({
          "data" :  data,
          "columns" : [
            {"data" : "date"},
            {"data" : "vendor_id"},
            {"data" : "transaction_number"},
            {"data" : "total"},
            {"data" : "note"}
          ]
        });
      }).fail(function (jqXHR, textStatus, errorThrown){
      // log the error to the console
        console.error(
          "The following error occurred: " + textStatus,
          errorThrown);
      });
  }
  else
  {
    console.log("missing credentials");
  }
});
