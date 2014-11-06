var g_oControllers;
var vData = null;
var Vault =
{
  mData:
  {
    receipts : [],
    userSettings : {},
    dateFormat : "yy-mm-dd",
    sNavbarItemClass : ".vault-navbar-item-name",
    dataTable : null,
    rangePreset : null,
    endDate : null,
    startDate : null,
    mClassNames : {},
    iNavBarItemWidth : null
  },

  initMembers: function() {
    this.mData.dataTable = new DataTable("#vault-receipts");
    this.mData.foldersBar = new FolderSideBar($("#vault-folders-navbar"));
    this.mData.rangePreset = $("#vault-date-preset");
    this.mData.endDate = $("#end-date");
    this.mData.startDate = $("#start-date");
    this.mData.mainNavBar = $("#vault-navbar");
  },

  init: function () {
    var self = this;
    this.initMembers();
    vData = this.mData;
    // get the controller urls
    g_oControllers = new ControllerUrls(localStorage["webAppHost"]);
    // initialize the tab navigation bar
    $('#vault-navbar a').click(function (e) {
      e.preventDefault();
      $(this).tab('show');
    });
    this.initSettingsTab();

    var oInterval = null;

    $(".vault-navbar-item-name").hide();
    self.mData.iNavBarItemWidth = $("#vault-navbar > li").width();
    self.mData.mainNavBar.mouseenter(function() {
        setTimeout(function() {
        if (self.mData.mainNavBar.is(":hover"))
        {
          $("#vault-navbar-container").stop().animate({width : "150px"},
          {
            done : function(animation, jumpedToEnd) {
              $(this).find(self.mData.sNavbarItemClass).stop().show("slow");
            }
          });
        }
      }, 
      300);
    });

    // when mouse leave the navbar 
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

    var endDate = new Date();
    vData.endDate.datepicker("setDate", new Date());
    var startDate = new Date();
    vData.startDate.datepicker("setDate", new Date());

    switch(parseInt(vData.rangePreset.val())) {
      case 1: //today
        endDate.setHours(0);
        break;
      case 2: //Yesterday
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        break;
      case 3: //this week
        endDate.setDate(endDate.getDate() - endDate.getDay());
        break;
      case 4: //last weeks
        //Get some day in last week
        endDate.setDate(endDate.getDate() - 7 - endDate.getDay());
        startDate.setDate(startDate.getDate() - startDate.getDay());
        break;
      case 5: //this month
        endDate.setDate(1);
        break;
      case 6: //last month
        endDate.setMonth(endDate.getMonth() - 1);
        startDate.setDate(1);
        break;
    }
    vData.endDate.datepicker("setDate", endDate);
    vData.startDate.datepicker("setDate", startDate);
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

  initSettingsTab: function() {
    var self = this;
    $("#settings-link").click(function() {
      // If authentication token and email exist then grab receipt data.
        if ("authToken" in localStorage && "userEmail" in localStorage && Object.keys(self.mData.userSettings).length === 0) {
        // the only purpose for this for now (with only currency user setting) is to set self.mData.userSettings
        self.getUserSettings_();

        var receiptRequest = $.ajax({
          url: g_oControllers.AppendCred(g_oControllers.GetUrl("currencies") + '.json'),
          type: 'GET',
          dataType: 'json'
        }).done(function(data){
          // initialize currency select-list
          var currencies = $("#currency-setting");
          $.each(data, function() {
            var option = $("<option />").val(this.id).text(this.code + " " + this.description);
            if (this.selected === "true") {
              option.attr("selected", true);
            }
            currencies.append(option);
          });
        }).fail(function (jqXHR, textStatus, errorThrown){
          // log the error to the console
          console.error(
            "The following error occurred: " + textStatus,
            errorThrown);
          alert(jqXHR.responseText);
        });
      }
    });

    $("#vault-settings-save").click(function() {
      self.mData.userSettings.currency_id = $("#currency-setting").val();
      var settingData = {};
      settingData.user_setting = self.mData.userSettings;

      $.ajax({
        url: g_oControllers.AppendCred(g_oControllers.GetUrl("user_settings") + "/" + settingData.user_setting.id + ".json"),
        type: 'PUT',
        data : settingData,
        dataType: 'json'
      }).done(function(data){
        //alert("submitted");
      }).fail(function (jqXHR, textStatus, errorThrown){
        // log the error to the console
        console.error(
          "The following error occurred: " + textStatus,
          errorThrown);
        //alert(jqXHR.responseText);
      });
    });
  },

  getReceipts_: function() {
    var self = this;
    var request = $.ajax({
      url: g_oControllers.AppendCred(g_oControllers.GetUrl("receipts") + ".json"),
      type: 'GET',
      dataType: 'json'
    }).done(function(data) {
      $("#start-date").datepicker("setDate", new Date());
      $("#end-date").datepicker("setDate", new Date());
      if ( data.length > 0 )
      {
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
      }

      // After getting all the dates, render the data table
      vData.dataTable.Init();
    }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
      console.error(
        "The following error occurred: " + textStatus,
        errorThrown);
    });
  },

  getUserSettings_: function() {
    var self = this;
    var request = $.ajax({
      url: g_oControllers.AppendCred(g_oControllers.GetUrl("user_settings") + ".json"),
      type: 'GET',
      dataType: 'json'
    }).done(function(data) {
      self.mData.userSettings = data;
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
      url: g_oControllers.AppendCred(g_oControllers.GetUrl("documents") + ".json") + "&is_snapshot=" + is_snapshot.toString(),
      type: 'GET',
      dataType: 'json'
    }).done(function(data) {
      // add image source to each receipt (by id) here
      // possibly store data and calculate this by event?

   //   $("body").append("<img src = '" + self.appendStyle_(g_oControllers.AppendCred(g_oControllers.GetUrl("documents") + "/1")) + "'></img>");


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
   *       assumes ApiComm AppendCred is run prior to appending style
   */
  appendStyle_: function(url)
  {
    return url + "&style=thumb";
  },

  getFolders_: function() {
    var self = this;
    var request = $.ajax({
      url: g_oControllers.AppendCred(g_oControllers.GetUrl("folders") + ".json"),
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
      url: g_oControllers.AppendCred(g_oControllers.GetUrl("folders") + ".json"),
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

  //TODO: this function should be moved into FolderSideBar
  //to handle the clicks, then we should provide the interface
  //to return the name of the currently selected folder etc etc
  AddFolderEventCallbacks_: function () {
    var self = this;
    // Add hook for folder change, except the add new folder
    $("#vault-folders-navbar > li > a").not(".add-folder-button > a").click(function(e) {
      var parentFolderName = "";
      if ( $(this).parent().hasClass("subfolder") )
      {
        var $parentAnchor = $("#vault-folders-navbar").find("a[folder_database_id='" + $(this).parent().attr("parent_id") +"']");
        parentFolderName = $parentAnchor.text() + " / ";
      }
      $("#folder-name").text(parentFolderName + this.text);
      var folder = $(this)
      self.filterReceiptList_(folder.attr("folder_database_id"));
    });
  }
};

document.addEventListener('DOMContentLoaded', function() {
  Vault.init();
});
