var dummyArray = [];
var controllers;
var vData = null;
var colIndex = 
{
  DATE : 0,
  VENDOR: 1,
  TRANSACTION: 2, 
  TOTAL : 3,
  NOTE : 4, 
  FOLDER : 5
};

var Vault = 
{
  mData: 
  {
    receipts : [],
    dateFormat : "yy-mm-dd",
    dataTable : null,
    rangePreset : null,
    endDate : null,
    startDate : null
  },
  appendCred_: function(url)
  {
    var credUrl = "";
    
    if ("userEmail" in localStorage && "authToken" in localStorage) 
    {
      credUrl =  url + 
        "?email=" + localStorage["userEmail"] + 
        "&token=" + localStorage["authToken"];
    } 
    else 
      console.error("Missing credentials!");

    return credUrl;
  },
  initMembers: function()
  {
    this.mData.dataTable = $("#vault-receipts");
    this.mData.rangePreset = $("#vault-date-preset");
    this.mData.endDate = $("#end-date");
    this.mData.startDate = $("#start-date");
  },
  init: function ()
  {
    var self = this;
    this.initMembers();
    vData = this.mData;
    // get the controller urls
    controllers = new ControllerUrls(localStorage["webAppHost"]);
    // initialize the tab navigation bar
    $('#vault-navbar a').click(function (e) {
      e.preventDefault();
      $(this).tab('show');
    });

    // For when user clicks the new folder button
    $('#new-folder-submit').click(function (e) {
      self.addFolder_();
      $("#add-folder-modal").modal("hide");
      // Refresh folder list
      self.clearFolders_();
      self.getFolders_();
    });

    // If authentication token and email exist then grab receipt data.
    if ("authToken" in localStorage && "userEmail" in localStorage)
    {
      this.getReceipts_();
      this.getFolders_();
      this.initDatePicker("#start-date");
      this.initDatePicker("#end-date");
      this.mData.rangePreset.change(this.presetChangedCallback);
    }
    else
      console.log("missing credentials");
  },
  presetChangedCallback: function() {
    var select = parseInt(vData.rangePreset.val());
    if (select == 0)
      return;

    var thisDate = new Date();
    vData.endDate.datepicker("setDate", new Date());

    switch(parseInt(vData.rangePreset.val())) {
      case 1: //today
        thisDate.setHours(0);
        break;
      case 2: //Yesterday
        thisDate.setDate(thisDate.getDate() - 1);
        break;
      case 3: //this week
        thisDate.setDate(thisDate.getDate() - thisDate.getDay());
        break;
      case 4: //last weeks 
        //Get some day in last week
        thisDate.setDate(thisDate.getDate() - 7 - thisDate.getDay()); 
        break;
      case 5: //this month
        thisDate.setDate(1); 
        break;
      case 6: //last month
        thisDate.setMonth(thisDate.getMonth() - 1); 
        thisDate.setDate(1); 
        break;
    }

    thisDate.setHours(0);
    vData.startDate.datepicker("setDate", thisDate);
    vData.startDate.change();
  },
  initDatePicker: function(dateFormId) {
    var self = this;
    // Apply date picker
    $(dateFormId).datepicker({
      constrainInput: true 
    });

    // When date inputs change
    $(dateFormId).change(function(){
      // Clear previous filtering
      console.log("changed");
      $.fn.dataTableExt.afnFiltering.pop();
      self.mData.dataTable.dataTable().fnDraw();
      self.isWithinDate_(new Date($("#start-date").val()), new Date($("#end-date").val()))
      self.mData.dataTable.dataTable().fnDraw();
    });
  },
  getReceipts_: function() {
    var self = this;
    var request = $.ajax({
      url: this.appendCred_(controllers.GetUrl("receipts") + ".json"),
      type: 'GET',
      dataType: 'json'
    }).done(function(data) {
      self.mData.receipts = data;
      // painfully convert each item to the desired date format before 
      var earliestDate = new Date(data[0]["date"]);
      var latestDate = new Date(data[0]["date"]);
      $.each(data, function(index, value) {
        // create a date object for comparison
        var thisDate = new Date(value["date"]);

        // Update the end-date so that it has the latest date value
        if (thisDate > latestDate) {
          latestDate = thisDate;
          $("#end-date").datepicker("setDate", thisDate);
        } else if (thisDate < earliestDate) {
          earliestDate = thisDate;
          $("#start-date").datepicker("setDate", thisDate);
        }

        // In the mean time modify the date format for each date
        value["date"] = $.datepicker.formatDate(self.mData.dateFormat, new Date(value["date"])); 
      });

      // After getting all the dates, render the data table
      self.mData.dataTable.DataTable({
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
  filterReceiptList_: function(iFolderId) {
    // Empty array shows all receipts
    var aFolders = [];
    if (iFolderId !== null && iFolderId !== undefined)
      aFolders.push(parseInt(iFolderId));

    $("#vault-folders-navbar > li.subfolder[parent_id='" + iFolderId +"'] > a").each(function(index){
      aFolders.push(parseInt($(this).attr("folder_database_id")));
    });

    $.fn.dataTableExt.afnFiltering.pop();
    this.mData.dataTable.dataTable().fnDraw();
    this.filterFolders_(aFolders)
    this.mData.dataTable.dataTable().fnDraw();
  },
  getFolders_: function()
  {
    var self = this;
    var request = $.ajax({
          url: this.appendCred_(controllers.GetUrl("folders") + ".json"),
          type: 'GET',
          dataType: 'json'
        }).done(function(data) {
          var folderDict = {};
          // create a dictionary modelling the structure of the folders
          $.each(data, function(index, value) {
            // if this is an upper layer folder
            if (value.folder_id === null) {
              console.log(value.id);
              // if it doesn't exist!
              if (!(value.id in folderDict))
                folderDict[value.id] = { subFolders : [], data: value };
              else // somehow this parent folder's sub folder was read first
                folderDict[value.id].data = value;
            } else { // sub folder
              // if parent folder in dictionary
              if (value.folder_id in folderDict)
                folderDict[value.folder_id].subFolders.push(value);
              else // somehow this parent folder's sub folder was read first
                folderDict[value.folder_id] = { subFolders : [value], data: null };
            }
          });

          console.log(folderDict);
          $.each(folderDict, function(index, value) {
            self.addFolderToList_(value.data);
            $.each(value.subFolders, function(subIndex, subValue) {
              self.addFolderToList_(subValue);
            });
          });

          //Add hooks to all the folders
          self.addFolderEventCallbacks_();

        }).fail(function (jqXHR, textStatus, errorThrown) {
        // log the error to the console
          console.error(
            "The following error occurred: " + textStatus,
            errorThrown);
        });
  },
  /**
   * @brief creates a folder element and adds it to the folder
   *  side bar
   */ 
  addFolderToList_: function(folderData) {
    var newListItem = $("<li></li>");
    // Add class for later removal when adding new folders
    newListItem.addClass("requested");
    var newFolder = $("<a></a>")
    // sub folder specific data
    if (folderData.folder_id !== null) {
      newListItem.addClass("subfolder");
      newListItem.attr("parent_id", folderData.folder_id);
      newListItem.hide();
      folderData.name = "-" + folderData.name;
    } else { // parent folder specifics
      newListItem.addClass("parent");
    }

    newFolder.text(folderData.name);
    // Attribute is based on the id of the folder in the WebApp DB
    newFolder.attr("folder_database_id", folderData.id);
    newFolder.attr("href", "#vault-receipts-pane");
    newFolder.attr("data-toggle", "pill");
    newListItem.append(newFolder);
    newListItem.insertBefore($("#add-new-folder"));
  },
  addFolder_: function() {
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
    }).done(function(data) {
      // do stuff on success
    }).fail(function (jqXHR, textStatus, errorThrown) {
    // log the error to the console
      console.error(
        "The following error occurred: " + textStatus,
        errorThrown);
    });
  },
  clearFolders_: function() {
    $("#vault-folders-navbar > .requested").remove();
  },
  addFolderEventCallbacks_: function() {
    var self = this;
    // Add hook for folder change, except the add new folder
    $("#vault-folders-navbar > li > a").not("#add-new-folder > a").click(function(e) {
      $("#folder-name").text(this.text); 
      var folder = $(this)
      self.filterReceiptList_(folder.attr("folder_database_id"));
    });

    // Hiding and showing sub folders
    $("#vault-folders-navbar .parent > a").click(function(e) {
      var iFolderId = $(this).attr("folder_database_id");
      // show all sub folders belonging to this folder and hide all other sub folders
      $("#vault-folders-navbar > li.subfolder[parent_id='" + iFolderId +"']").show();
      $("#vault-folders-navbar > li.subfolder[parent_id!='" + iFolderId +"']").hide();
    });
  },
  /**
   * @brief custom filtering of DataTale to filter 
   * and show only dates that are within range
   */
  isWithinDate_: function(startDate, endDate) {
    $.fn.dataTableExt.afnFiltering.push(function( oSettings, aData, iDataIndex ) {
      var oMin= startDate.getTime();
      var oMax = endDate.getTime();
      var oCurr = new Date(aData[colIndex.DATE]).getTime();
      // Check that the data value is within the date range
      if ( oMin <= oCurr && oCurr <= oMax ) {
        return true;
      }

      return false;
    });
  },
  /**
   * @brief custom filtering of DataTale to filter 
   * and show only dates that are within range
   */
  filterFolders_: function(aFolders) {
    console.log(aFolders);
    $.fn.dataTableExt.afnFiltering.push(function( oSettings, aData, iDataIndex ) {
      return $.inArray(aData[colIndex.FOLDER], aFolders) >= 0;
    });
  }
};

document.addEventListener('DOMContentLoaded', function() {
  Vault.init();
});
