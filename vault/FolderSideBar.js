var folderType =
{
  PARENT : 0,
  SUBFOLDER : 1,
  FOLDER : 2,
  ADD_NEW_FOLDER : 3
};

function FolderSideBar (oElement) {
  this.oElem = oElement;
  this.mFolders = null;
  this.mData = {
    newFolderModalSelect : $("#parent-folder-select")
  };
  this.mClassNames = {
    AddNewFolder : "add-folder-button",
    sParentFolder : "parent-folder",
    sSubFolder : "subfolder"
  };
}

FolderSideBar.prototype.Init = function(data) {
  var self = this;
  self.mFolders = {};
  // Create an empty option for the modal box's parent select 
  var parentOption = $("<option></option>");
  parentOption.attr("value", "");
  parentOption.text("<New Parent Folder>");
  self.mData.newFolderModalSelect.append(parentOption);
  // create a dictionary modelling the structure of the folders
  $.each(data, function(index, value) {
    // if this is an upper layer folder
    if (value.folder_id === null) {
      value["type"] = folderType.PARENT;
      console.log(value.id);
      // if it doesn't exist!
      if (!(value.id in self.mFolders))
        self.mFolders[value.id] = { subFolders : [], data: value };
      else // somehow this parent folder's sub folder was read first
        self.mFolders[value.id].data = value;

      // While creating the folder structures, let's populate
      // the modal box's parent folder options
      var parentOption = $("<option></option>");
      parentOption.attr("value", value.id);
      parentOption.text(value.name);
      self.mData.newFolderModalSelect.append(parentOption);
    } else { // sub folder
      value["type"] = folderType.SUBFOLDER;
      // if parent folder in dictionary
      if (value.folder_id in self.mFolders) {
        self.mFolders[value.folder_id].subFolders.push(value);
      } else { // somehow this parent folder's sub folder was read first
        self.mFolders[value.folder_id] = { subFolders : [value], data: null };
      }
    }
  });

  console.log(this.mFolders);
  $.each(self.mFolders, function(index, value) {
    self.RenderFolderOnList_(value.data);
    $.each(value.subFolders, function(subIndex, subValue) {
      self.RenderFolderOnList_(subValue);
    });
    // add the "add new folder" button
    self.RenderFolderOnList_({ type : folderType.ADD_NEW_FOLDER, folder_id : value.data.id});
  });

  // Add the "add new folder" button for top level folders
  this.RenderFolderOnList_({ type : folderType.ADD_NEW_FOLDER, folder_id : null});

  //Add hooks to all the folders
  this.addFolderEventCallbacks_();

  //Add hooks to add new folder button
  this.AddNewFolderButtonCallbacks_();
};

FolderSideBar.prototype.ClearFolders = function() {
    $("#vault-folders-navbar > .requested").remove();
};

FolderSideBar.prototype.GetFolderIds = function(iFolderId) {
  var aFolders = [];
  if (iFolderId !== null && iFolderId !== undefined)
    aFolders.push(parseInt(iFolderId));

  this.oElem.find("li.subfolder[parent_id='" + iFolderId +"'] > a").each(function(index){
    aFolders.push(parseInt($(this).attr("folder_database_id")));
  });

  return aFolders;
}

/**
 * @brief creates a folder element and adds it to the folder
 *  side bar
 */ 
FolderSideBar.prototype.RenderFolderOnList_ = function(folderData) {
    var newListItem = $("<li></li>");
    // Add class for later removal when adding new folders
    newListItem.addClass("requested");
    var newFolder = $("<a></a>")

    // Check if folder type is ADD NEW FOLDER button
    if (folderData.type === folderType.ADD_NEW_FOLDER) {
      newListItem.addClass(this.mClassNames.AddNewFolder);
      // open up modal window for adding receipts
      newFolder.attr("data-toggle", "modal");
      newFolder.attr("data-target", "#add-folder-modal");
      newFolder.attr("href", "#");
      folderData.name = "+ Add New Folder";
    } else { // Actual folder type
      // Attribute is based on the id of the folder in the WebApp DB
      newFolder.attr("data-toggle", "pill");
      newFolder.attr("href", "#vault-receipts-pane");
      newFolder.attr("folder_database_id", folderData.id);
    } 

    // sub folder specific data
    if (folderData.folder_id !== null) {
      newListItem.addClass(this.mClassNames.sSubFolder);
      newListItem.attr("parent_id", folderData.folder_id);
      newListItem.hide();
      folderData.name = "-" + folderData.name;
    } else { // parent folder specifics
      newListItem.addClass("parent");
    }

    // Common data all "folders" have
    newFolder.text(folderData.name);
    newListItem.append(newFolder);
    this.oElem.append(newListItem);
};

FolderSideBar.prototype.addFolderEventCallbacks_ = function() {
  // Hiding and showing sub folders
  $("#vault-folders-navbar .parent > a").click(function(e) {
    var iFolderId = $(this).attr("folder_database_id");
    // show all sub folders belonging to this folder and hide all other sub folders
    $("#vault-folders-navbar > li.subfolder[parent_id='" + iFolderId +"']").show();
    $("#vault-folders-navbar > li.subfolder[parent_id!='" + iFolderId +"']").hide();
  });
};

FolderSideBar.prototype.AddNewFolderButtonCallbacks_ = function() {
  var self = this;
  this.oElem.find("." + this.mClassNames.AddNewFolder).click(function () {
    var iParentId = $(this).closest("li").attr("parent_id");
    self.mData.newFolderModalSelect.val(iParentId);
  });
};

FolderSideBar.prototype.GetModalSelectedParentFolder = function () {
  return this.mData.newFolderModalSelect.val();
};

