var dummyArray = [];
var controllers;


var Vault = 
{
  appendCred_: function(url)
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
  init: function ()
  {
    // get the controller urls
    controllers = new ControllerUrls(localStorage["webAppHost"]);
    // initialize the tab navigation bar
    $('#vault-navbar a').click(function (e) {
      e.preventDefault();
      $(this).tab('show');
    });

        // If authentication token and email exist then grab receipt data.
    if ("authToken" in localStorage && "userEmail" in localStorage)
    {
      this.getReceipts_();
      this.getFolders_();
    }
    else
    {
      console.log("missing credentials");
    }
  },
  getReceipts_: function()
  {
    var request = $.ajax({
          url: this.appendCred_(controllers.GetUrl("receipts") + ".json"),
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
  },
  getFolders_: function()
  {
    var request = $.ajax({
          url: this.appendCred_(controllers.GetUrl("folders") + ".json"),
          type: 'GET',
          dataType: 'json'
        }).done(function(data){
          $.each(data, function(index, value) {
            console.log("adding " + value.name);
            var newListItem = $("<li></li>");
            var newFolder = $("<a></a>")
            newFolder.text(value.name);
            newFolder.attr("href", "#vault-receipts-pane");
            newFolder.attr("data-toggle", "pill");
            newListItem.append(newFolder);
            newListItem.insertBefore($("#add-new-folder"));
          });
          // Add hook for title change
          $("#vault-folders-navbar > li > a").click(function(e){
            $("#folder-name").text(this.text); 
          });
        }).fail(function (jqXHR, textStatus, errorThrown){
        // log the error to the console
          console.error(
            "The following error occurred: " + textStatus,
            errorThrown);
        });
  },
};

document.addEventListener('DOMContentLoaded', function() {
  Vault.init();
 
});
