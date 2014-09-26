var TagType = 
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

var TagTypeIdPrefix = {}
TagTypeIdPrefix[TagType.RECEIPT] = "receipt-";
TagTypeIdPrefix[TagType.RECEIPT_ITEM] = "receipt-item-";

/* 
 * HELPERS ---------------------------------------------------------
 */
var TagHelper =
{

  /**
   * @brief Format an html string to render the add tag button
   * @param iTagType the type of the tag (receipt/receipt_item)
   * @param iReceiptId the database id of the receipt/receipt_item
   * @return html to render the tag
   */
  GetAddTagHtml: function (iTagType, iReceiptId)
  {
    var sTagHtml =  "<a id='" + TagTypeIdPrefix[iTagType] + iReceiptId + "'" +  
                    "class='" + TagClassIds.ADD_TAG_BUTTON + "' href='#'>" + 
                    "<span class='label label-default'>" + 
                    "<span class='glyphicon glyphicon-plus'></span></span></a>";

    return sTagHtml;
  },

  /**
   * @brief Returns the html of the input tag
   * @param iTagType the type of the tag (receipt/receipt_item)
   * @param iReceiptId the database id of the receipt/receipt_item
   * @return html to render the tag field
   */
  GetTagFieldHtml : function (iTagType, iReceiptId)
  {
    var sElemId = TagTypeIdPrefix[iTagType] + iReceiptId;
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
      $("#wrapper-" + $(this).attr("id")).show();
    });
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
  this.sId += TagTypeIdPrefix[iTagType] + iTagId;
};

/**
 * @brief Format an html string to render the tags
 * @param sTagName the name of the tag to render 
 * @return html to render the tag
 */
Tag.prototype.GetHtml = function ()
{
  var sTagHtml = "<span class='" + TagClassIds.TAG + " label label-default'>" + this.sTagName + 
                 "<a href='#'><span style='display:none;' class='" + TagClassIds.REMOVE_TAG_BUTTON + 
                 " glyphicon glyphicon-remove'></span></a>" + 
                 "</span>";
  return sTagHtml;
};



