//var dummyArray = 
var controllers;
var vData = null;
var Vault =
{
  mData:
  {
    receipts : [],
    dateFormat : "yy-mm-dd",
    sNavbarItemClass : ".vault-navbar-item-name",
    dataTable : null,
    rangePreset : null,
    endDate : null,
    startDate : null,
    mClassNames : {},
    iNavBarItemWidth : null
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

  initMembers: function() {
    this.mData.dataTable = new DataTable("#vault-receipts");
    this.mData.foldersBar = new FolderSideBar($("#vault-folders-navbar"));
    this.mData.rangePreset = $("#vault-date-preset");
    this.mData.endDate = $("#end-date");
    this.mData.startDate = $("#start-date");
  },
  init: function () {
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

    $(".vault-navbar-item-name").hide();
    self.mData.iNavBarItemWidth = $("#vault-navbar > li").width();
    $("#vault-navbar").mouseenter(function() {
      $("#vault-navbar-container").stop().animate({width : "11%"}, 
      {
        done : function(animation, jumpedToEnd) {
          $(this).find(self.mData.sNavbarItemClass).stop().show("slow");
        }
      });
      $(this).find(self.mData.sNavbarItemClass).stop().show();
    });
    $("#vault-navbar").mouseleave(function() {
      $(this).find(self.mData.sNavbarItemClass).stop().hide("slow");
      $("#vault-navbar-container").stop().animate({width : self.mData.iNavBarItemWidth + "px"});
    });


    // For when user clicks the new folder button
    $('#new-folder-submit').click(function (e) {
      console.log("idata = " + vData.foldersBar.GetModalSelectedParentFolder());
      self.addFolder_(vData.foldersBar.GetModalSelectedParentFolder());
      $("#add-folder-modal").modal("hide");
      // Refresh folder list
      vData.foldersBar.ClearFolders();
      self.getFolders_();
    });

    // If authentication token and email exist then grab receipt data.
    if ("authToken" in localStorage && "userEmail" in localStorage) {
      this.getReceipts_();
      this.getFolders_();
      this.initDatePicker("#start-date");
      this.initDatePicker("#end-date");
      this.mData.rangePreset.change(this.presetChangedCallback);
    } else {
      console.log("missing credentials");
    }
  },

  /**
   * @brief the callback for when the date preset field is changed
   */
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
      vData.dataTable.ShowDateRange(new Date($("#start-date").val()), new Date($("#end-date").val()));
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
      vData.dataTable.Init(controllers);
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
    vData.dataTable.ShowFolders(vData.foldersBar.GetFolderIds(iFolderId));
  },

  /**
   *@brief gets all snapshot/non-snapshot document information for user
   */
  getDocuments_: function(is_snapshot) {
    var self = this;
    $.ajax({
      url: this.appendCred_(controllers.GetUrl("documents") + ".json") + "&is_snapshot=" + is_snapshot.toString(),
      type: 'GET',
      dataType: 'json'
    }).done(function(data) {
      // add image source to each receipt (by id) here
      // possibly store data and calculate this by event?

      //$("body").append("<img src = '" + self.appendStyle_(self.appendCred_(controllers.GetUrl("documents") + "/" + data[51].id)) + "'></img>");


    }).fail(function(jqXHR, textStatus, errorThrown) {
      // log the error to the console
      console.error(
        "The following error occurred: " + textStatus,
        errorThrown);
    });
  },

  /**
   *@brief appends thumbnail style to image source for rails server
   *       source defaulted to original when appendStyle_ is not run
   *       assumes appendCred_ is run prior to appending style
   */
  appendStyle_: function(url)
  {
    return url + "&style=thumb";
  },

  getFolders_: function() {
    var self = this;
    var request = $.ajax({
      url: this.appendCred_(controllers.GetUrl("folders") + ".json"),
      type: 'GET',
      dataType: 'json'
    }).done(function(data) {
      // Render the folder side bar with the received Data
      vData.foldersBar.Init(data);
      self.AddFolderEventCallbacks_();

    }).fail(function (jqXHR, textStatus, errorThrown) {
    // log the error to the console
      console.error(
        "The following error occurred: " + textStatus,
        errorThrown);
    });
  },
  addFolder_: function(iParentId) {
    var self = this;
    folderData = {};
    folderData["folder"] =
    {
      description : $("#new-folder-description").val(),
      name : $("#new-folder-name").val(),
      folder_type_id : null,
      folder_id : iParentId // null values would mean we are making a parent level folder
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
  AddFolderEventCallbacks_: function () {
    var self = this;
    // Add hook for folder change, except the add new folder
    $("#vault-folders-navbar > li > a").not(".add-folder-button > a").click(function(e) {
      $("#folder-name").text(this.text);
      var folder = $(this)
      self.filterReceiptList_(folder.attr("folder_database_id"));
    });

  }
};

document.addEventListener('DOMContentLoaded', function() {
  Vault.init();
});
