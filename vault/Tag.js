var ReceiptType = 
{
  RECEIPT : 0,
  RECEIPT_ITEM : 1,
};

// TODO: This may be better done with inheritance
// rather than just forcefully slapped on to this class
var LabelType =
{
  TAG : 0,
  ADD_TAG_BUTTON : 1,
  ADD_TAG_FIELD: 2
};

var TagClassIds =
{
  ADD_TAG_FIELD : "tags-field",
  ADD_TAG_BUTTON : "add-tag",
  REMOVE_TAG_BUTTON : "tag-label-remove",
  TAG : "tag-label",
};

var TagTypeIdPrefix = {};
TagTypeIdPrefix[ReceiptType.RECEIPT] = "receipt-";
TagTypeIdPrefix[ReceiptType.RECEIPT_ITEM] = "receipt-item-";

/* 
 * HELPERS ---------------------------------------------------------
 */
var TagHelper =
{
  /**
   * @brief obtain an id for a tag (add button/tag/input field)
   * @param iTagType the type of the tag (add_button,tag,input_field)
   * @param iReceiptType the type of the tag (receipt/receipt_item)
   * @param iReceiptId the database id of the receipt/receipt_item
   * @return id of the tag 
   */
  GetTagIdString: function (iTagType, iReceiptType, iReceiptId)
  {
    var sTagType = "";
    switch (iTagType)
    {
    case LabelType.TAG:
      sTagType = TagClassIds.TAG;
      break;
    case LabelType.ADD_TAG_BUTTON:
      sTagType = TagClassIds.ADD_TAG_BUTTON;
      break;
    case LabelType.ADD_TAG_FIELD:
      sTagType = TagClassIds.ADD_TAG_FIELD;
      break;
    }
    return sTagType + "-" + TagTypeIdPrefix[iReceiptType] + iReceiptId; 
  },

  /**
   * @brief Format an html string to render the add tag button
   * @param iReceiptType the type of the tag (receipt/receipt_item)
   * @param iReceiptId the database id of the receipt/receipt_item
   * @return html to render the tag
   */
  GetAddTagHtml: function (iReceiptType, iReceiptId)
  {
    var sTagHtml =  "<a id='" + this.GetTagIdString(LabelType.ADD_TAG_BUTTON, iReceiptType, iReceiptId) + "'" +  
                    "class='" + TagClassIds.ADD_TAG_BUTTON + "' href='#'>" + 
                    "<span class='label label-default'>" + 
                    "<span class='glyphicon glyphicon-plus'></span></span></a>";
    return sTagHtml;
  },

  /**
   * @brief Returns the html of the input tag
   * @param iReceiptType the type of the tag (receipt/receipt_item)
   * @param iReceiptId the database id of the receipt/receipt_item
   * @return html to render the tag field
   */
  GetTagFieldHtml : function (iReceiptType, iReceiptId)
  {
    var sElemId = this.GetTagIdString(LabelType.ADD_TAG_FIELD, iReceiptType, iReceiptId);
    // displays a hidden wrapper
    var sTagHtml = "<span id='wrapper-" + sElemId + "' " +
                   "style='display:none;'" +                 
                   "class='label label-default'> <input class='" + TagClassIds.ADD_TAG_FIELD + "'" + 
                    " id='" + sElemId + "' type='text'/></span>";
    return sTagHtml;
  },

  /**
   * @brief Shows the input field when the add tag button is clicked
   */
  SetupAddTagButtonCallbacks : function ()
  {
    $("." + TagClassIds.ADD_TAG_BUTTON).click( function () {
      $(this).hide();
      // FIXME kind of a shitty way to find the input and its wrapper
      $(this).parent().find("input").parent().show();
      $(this).parent().find("input").focus();
    });
  },

  /**
   * @brief Setup callback to remove a tag
   * @param sSelector the selector of the tag label that contains the 
   * receipt id and tag id, not the actual button id
   */
  SetupRemoveTagButtonCallbacks : function (sSelector)
  {
    var $callbackSelector = sSelector === null ? 
      $("." + TagClassIds.REMOVE_TAG_BUTTON) : $(sSelector + " ." + TagClassIds.REMOVE_TAG_BUTTON);
    console.log("setup removecallback");
    console.log($callbackSelector);
    $callbackSelector.click( function () {
      // The element with the database id information is 2 levels up
      var $wrapper = $(this).parent().parent();
      var aIdSplit = $wrapper.attr("id").split("-");
      // depending on whether or not it is a receipt_item or receipt the string split
      // will create a different size array
      var iAddOne = aIdSplit.length > 3 ? 1 : 0;
      var sType = iAddOne ? "receipt_item" : "receipt";
      var iTagId = aIdSplit[2 + iAddOne];
      var iReceiptId = aIdSplit[1 + iAddOne];
      var sUrl = g_oControllers.AppendCred(
        g_oControllers.GetUrl("tags") +
        "/" + sType +
        "/" + iReceiptId +
        "/" + iTagId + ".json");

      var request = $.ajax({
          url: sUrl,
          type: 'DELETE',
          dataType: 'json'
        }).done(function(data) {
          console.log("Successfully removed tag");
          $wrapper.hide();
        }).fail(function (jqXHR, textStatus, errorThrown){
        // log the error to the console
          console.error(
            "The following error occurred: " + textStatus,
            errorThrown);
        });
    });
  },

  /**
   * @brief Hides the input field and shows the add tag button again
  */
  HideAddNewTagInput : function (oTagField)
  {
    $(oTagField).parent().hide();
    $(oTagField).parent().siblings("a").show();
  },

  /**
   * @brief Shows the remove button when the mouse hovers over the tags
   */
  SetupTagHoverCallbacks : function ()
  {
    $("." + TagClassIds.TAG).hover(
      function () {$(this).find("." + TagClassIds.REMOVE_TAG_BUTTON).show()},
      function () {$(this).find("." + TagClassIds.REMOVE_TAG_BUTTON).hide()}
    );
  },

  /**
   * @brief Register a function to be called when the remove button is clicked
   */
  RegisterRemoveButtonClickCallback: function (callbackFunction)
  {
    // TODO: pass data back into callback
    $("." + TagClassIds.REMOVE_TAG_BUTTON).click(callbackFunction);
  },

  SetupTagKeyPress : function (sSelector)
  {
    self = this;
    $(sSelector).keyup(function(e) {
      switch (e.keyCode)
      {
      // Fallthrough
      case KeyboardCode.ENTER:
        self.AddTag_($(this).attr("id"), $(this).val());
      case KeyboardCode.ESCAPE:
        self.HideAddNewTagInput($(e.currentTarget));
      }
    });
  },

  /**
   * @brief Register a function to be called when the remove button is clicked
   */
  DeleteTag_: function (sElementId)
  {
    var self = this;
    console.log(sElementId);
    var aIdSplit = sElementId.split("-");
    var iReceiptId = aIdSplit.length > 3 ? aIdSplit[2] : aIdSplit[1];
    var iTagId = aIdSplit.length > 3 ? aIdSplit[3] : aIdSplit[2];
    var mData = { name : sName };
    var sUrl = self.oControllers.AppendCred(
      self.oControllers.GetUrl("tags") +
      "/" + sType +
      "/" + aIdSplit[aIdSplit.length - 1]+".json");

    var request = $.ajax({
        url: sUrl,
        type: 'POST',
        data: mData,
        dataType: 'json'
      }).done(function(data) {
        console.log("Successfully set tag");
      }).fail(function (jqXHR, textStatus, errorThrown){
      // log the error to the console
        console.error(
          "The following error occurred: " + textStatus,
          errorThrown);
      });
  },
  /**
   * @brief sends a POST request to the server to add a tag
   * @param sElementId the id of the receipt or receipt_item
   * @param sName the name of the tag
   */
  AddTag_ : function(sElementId, sName, fHandler) {
    console.log(sElementId);
    console.log(sName);
    var self = this;
    var aIdSplit = sElementId.split("-");
    var iReceiptType = aIdSplit.length > 4 ? ReceiptType.RECEIPT_ITEM : ReceiptType.RECEIPT; 
    var sType = iReceiptType === ReceiptType.RECEIPT_ITEM ? "receipt_item" : "receipt";
    var mData = { name : sName };
    var iReceiptId = aIdSplit[aIdSplit.length - 1];
    var sUrl = g_oControllers.AppendCred(
      g_oControllers.GetUrl("tags") +
      "/" + sType +
      "/" + iReceiptId +".json");

    var request = $.ajax({
        url: sUrl,
        type: 'POST',
        data: mData,
        dataType: 'json'
      }).done(function(data) {
        console.log("Successfully set tag (data is " + data + ")");
        // Render for viewing
        self.RenderNewTag_(iReceiptType, iReceiptId, sName, data);
        // Setup the hover
        self.SetupTagHoverCallbacks();
      }).fail(function (jqXHR, textStatus, errorThrown){
      // log the error to the console
        console.error(
          "The following error occurred: " + textStatus,
          errorThrown);
      });
  },
  
  /*
   * @brief show tag only for the purpose of presenting
   * @param iReceiptType the type of receipt
   * @param iReceiptId the id of the receipt (databasE)
   * @param sTagName the tag name 
   */
  RenderNewTag_ : function (iReceiptType, iReceiptId, sTagName, iTagDbId)
  {
    var iReceiptItemId = iTagDbId === null ? "NoId" : iTagDbId; 
    var sElementId = iReceiptType === ReceiptType.RECEIPT ? 
      "add-tag-receipt-" + iReceiptId : 
      "add-tag-receipt-item-" + iReceiptId;
    var oNewTag = new Tag(iTagDbId, iReceiptType, sTagName, iReceiptId);
    $(oNewTag.GetHtml()).insertBefore("#" + sElementId);
    console.log(sElementId);
    TagHelper.SetupRemoveTagButtonCallbacks("#" + oNewTag.sId);
  }
}
/*
 * END HELPERS ---------------------------------------------------------
 */

/*
 * brief Class to represent a Tag Object
 * @param iTagId the id of the tag (database)
 * @param iTagType the ReceiptType of the tag
 * @param sName the name of the tag
 * @param iReceiptId the id of the receipt/item that the tag belongs to
 */
function Tag(iTagId, iTagType, sName, iReceiptId)
{
  this.sTagName = sName;
  this.iTagType = iTagType;
  this.iReceiptId = iReceiptId;
  // Append the tag database Id to the element id
  this.sId = TagTypeIdPrefix[iTagType] + iReceiptId + "-" + iTagId;
};

/**
 * @brief Format an html string to render the tags
 * @param sTagName the name of the tag to render 
 * @return html to render the tag
 */
Tag.prototype.GetHtml = function ()
{
  var sTagHtml = "<div id='" + this.sId +  "' class='" + TagClassIds.TAG + " label label-default'>" + this.sTagName + 
                 "<a href='#'><span style='display:none;' class='" + TagClassIds.REMOVE_TAG_BUTTON + 
                 " glyphicon glyphicon-remove'></span></a>" + 
                 "</div>";
  return sTagHtml;
};



