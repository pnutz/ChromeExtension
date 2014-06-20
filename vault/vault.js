var dummyArray = [];
var controllers;

var Vault = 
{
  data: 
  {
    receipts : []
  },
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
    var self = this;
    // get the controller urls
    controllers = new ControllerUrls(localStorage["webAppHost"]);
    // initialize the tab navigation bar
    $('#vault-navbar a').click(function (e) {
      e.preventDefault();
      $(this).tab('show');
    });

    $('#new-folder-submit').click(function (e) {
      self.addFolder_();
      $("#add-folder-modal").modal("hide");
      self.clearFolders_();
      self.getFolders_();

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
    var self = this;
    var request = $.ajax({
          url: this.appendCred_(controllers.GetUrl("receipts") + ".json"),
          type: 'GET',
          dataType: 'json'
        }).done(function(data){
          self.data.receipts = data;
          console.log("got data" + data[0].vendor_id);
          $('#vault-receipts').DataTable({
            "data" :  data,
            "columnDefs" : [
             { 
                "targets" : [5], // hide folder ids since we only want them for filtering
                "visible" : false
              }
            ],
            "columns" : [
              {"data" : "date"},
              {"data" : "vendor_id"},
              {"data" : "transaction_number"},
              {"data" : "total"},
              {"data" : "note"},
              {"data" : "folder_id"},
            ],
          });
        }).fail(function (jqXHR, textStatus, errorThrown){
        // log the error to the console
          console.error(
            "The following error occurred: " + textStatus,
            errorThrown);
        });
  },
  /**
   *@brief renders receipts in the data table
   *       based on the folder
   */
  filterReceiptList_: function(folder_id)
  {
    // Empty string shows all receipts
    var searchVal = '';
    if (folder_id !== null && folder_id !== undefined)
      searchVal = folder_id;

    $('#vault-receipts').DataTable().columns(5).search(searchVal).draw()
  },
  getFolders_: function()
  {
    var self = this;
    var request = $.ajax({
          url: this.appendCred_(controllers.GetUrl("folders") + ".json"),
          type: 'GET',
          dataType: 'json'
        }).done(function(data){
          $.each(data, function(index, value) {
            self.addFolderToList_(value.name, value.id);
          });
          //Add hooks to all the folders
          self.addFolderEventCallbacks_();
        }).fail(function (jqXHR, textStatus, errorThrown){
        // log the error to the console
          console.error(
            "The following error occurred: " + textStatus,
            errorThrown);
        });
  },
  addFolderToList_: function(name, database_id)
  {
    var newListItem = $("<li></li>");
    // Add class for later removal when adding new folders
    newListItem.addClass("requested");
    var newFolder = $("<a></a>")
    newFolder.text(name);
    newFolder.attr("folder_database_id", database_id);
    newFolder.attr("href", "#vault-receipts-pane");
    newFolder.attr("data-toggle", "pill");
    newListItem.append(newFolder);
    newListItem.insertBefore($("#add-new-folder"));
  },
  addFolder_: function()
  {
    var self = this;
    folderData = {};
    folderData["folder"] = 
    {
      description : $("#new-folder-description").val(),
      name : $("#new-folder-name").val(),
      folder_type_id : 5,
      folder_id : null
    };
    var request = $.ajax({
          url: this.appendCred_(controllers.GetUrl("folders") + ".json"),
          type: 'POST',
          data: folderData,
          dataType: 'json'
        }).done(function(data){
        }).fail(function (jqXHR, textStatus, errorThrown){
        // log the error to the console
          console.error(
            "The following error occurred: " + textStatus,
            errorThrown);
        });
  },
  clearFolders_: function()
  {
    $("#vault-folders-navbar > .requested").remove();
  },
  addFolderEventCallbacks_: function()
  {
    var self = this;
    // Add hook for folder change, except the add new folder
    $("#vault-folders-navbar > li > a").not("#add-new-folder > a").click(function(e){
      $("#folder-name").text(this.text); 
      var folder = $(this)
      self.filterReceiptList_(folder.attr("folder_database_id"));
    });
  }
};

document.addEventListener('DOMContentLoaded', function() {
  Vault.init();
});
