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
   * @brief Remove 
   */
  SetupRemoveTagButtonCallbacks : function ()
  {
    $("." + TagClassIds.REMOVE_TAG_BUTTON).click( function () {
      $(this).parent().find("input").parent().show();
      $(this).parent().find("input").focus();
    });
  },

  /**
   * @brief Hides the input field and shows the add tag button again
  */
  CancelAddNewTagInput : function (oTagField)
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
  }
}
/*
 * END HELPERS ---------------------------------------------------------
 */

/*
 * brief Class to represent a Tag Object
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
  var sTagHtml = "<span id='" + this.sId +  "' class='" + TagClassIds.TAG + " label label-default'>" + this.sTagName + 
                 "<a href='#'><span style='display:none;' class='" + TagClassIds.REMOVE_TAG_BUTTON + 
                 " glyphicon glyphicon-remove'></span></a>" + 
                 "</span>";
  return sTagHtml;
};



