var g_oControllers = new ControllersUrl("localhost");
var ColIndex =
{
  DATE : 0,
  VENDOR: 1,
  TRANSACTION: 2,
  TOTAL : 3,
  TITLE : 4,
  TAGS : 5,
  FOLDER : 6,
  RECEIPT : 7
};

var KeyboardCode =
{
  ENTER : 13,
  ESCAPE : 27
};

function DataTable (sId)
{
  this.oElem = $(sId);
  this.oDataTable = null;
  this.sDateFormat = "yy-mm-dd";
  this.oEarliestDate = new Date(0);
  this.oLatestDate = new Date(0);
  this.mReceiptsData = null;
  this.sNoClickExpand = "no-expand";
  this.sReceiptFilterField= "vault-receipt-filter";
};

DataTable.prototype.Init = function(controllers)
{
  this.oControllers = controllers;
  this.GetReceipts_();
};

DataTable.prototype.ShowFolders = function (aFolders) {
  $.fn.dataTableExt.afnFiltering.pop();
  this.oElem.dataTable().fnDraw();
  // Only filter if array is not empty
  if (aFolders.length > 0) {
    this.FilterFolders_(aFolders)
    this.oElem.dataTable().fnDraw();
  }
};

DataTable.prototype.ShowDateRange = function (oStartDate, oEndDate) {
  $.fn.dataTableExt.afnFiltering.pop();
  this.oElem.dataTable().fnDraw();
  this.IsWithinDate_(oStartDate, oEndDate);
  this.oElem.dataTable().fnDraw();
};

DataTable.prototype.PopulateTableData_ = function(data) {
  var self = this;
  this.mReceiptsData = data;
    this.oDataTable = this.oElem.DataTable({
    "dom" : "",
    "autoWidth" : false,
    "data" :  this.mReceiptsData,
    "paging" : false,
    "columnDefs" : [
     {
        "targets" : [6, 7], // hide folder ids since we only want them for filtering
        "visible" : false
     },
     { // For formatting the date column
       "targets" : [0],
       "render" : function (data, type, row) {
         var oDate = new Date(data);
         return oDate.getDate() + '-' + (oDate.getMonth() + 1) + '-' + oDate.getFullYear();
       }
     },
     { // For displaying tags on the receipt level
       "targets" : 5,
       "render" : function (data, type, row) {
         // create an input element to add new tags
         var input = "";
         $.each(data, function(index, value) {
           var oTag = new Tag(value.id, ReceiptType.RECEIPT, value.name, row.id);
           input += oTag.GetHtml();
         });

         // row id is also the db id for the receipt
         input += TagHelper.GetTagFieldHtml(ReceiptType.RECEIPT, row.id);
         input += TagHelper.GetAddTagHtml(ReceiptType.RECEIPT, row.id);
         return self.WrapTag_(input);
      },
     },
    ],
    "columns" : [
      {"data" : "date", "width" : "5%"},
      {"data" : "vendor_id", "width" : "5%"},
      {"data" : "transaction_number", "width" : "5%"},
      {"data" : "total", "width" : "5%"},
      {"data" : "title", "width" : "15%"},
      {"data" : "tags", "width" : "5%"},
      {"data" : "folder_id", "width": "0%"},
      {"data" : "id", "width": "0%"}
    ],
  });

  //TODO: find a way to not have to call these callback functions twice
  TagHelper.SetupAddTagButtonCallbacks();
  TagHelper.SetupTagHoverCallbacks();
  self.SetupTagKeyPress();
  $("#" + self.sReceiptFilterField).keyup(function(e) {
    self.oDataTable.search($(this).val()).draw();
  });
  // set up showing child rows when receipt row is clicked
  this.oElem.find("tbody").on("click", "td", function() {
    // $(this) is the jquery object for the current cell
    // oRow is the DataTable object for the current row
    // TODO: right now the whole tag cell will not expand when clicked
    // we may want to shrink it so that only the actual tags will prevent
    // expansion
    if ($(this).children("." + self.sNoClickExpand).length === 0)
    {
      var $row = $(this).parent();
      var oRow = self.oDataTable.row($row);
      if (oRow.child.isShown()) {
        oRow.child.hide();
        $row.removeClass("shown");
        $row.removeClass("selected");
      } else {
        oRow.child(self.FormatData_(oRow.data())).show();
        $row.addClass("shown");
        $row.addClass("selected");
        //TODO: temporary, we should only apply the handler to 
        // visible buttons for this receipt only
        TagHelper.SetupAddTagButtonCallbacks();
        TagHelper.SetupTagHoverCallbacks();
        //Set up the enter key binding event for when enter key pressed
        self.SetupTagKeyPress();
      }
    }
  });

};

/**
 * @brief retrieve receipts from the server and populate
 * the table
 */
DataTable.prototype.GetReceipts_ = function() {
    var self = this;
    var request = $.ajax({
      url: self.oControllers.AppendCred(self.oControllers.GetUrl("receipts") + ".json"),
      type: 'GET',
      dataType: 'json'
    }).done(function(data) {
      // painfully convert each item to the desired date format before
      self.oEarliestDate = new Date(data[0]["date"]);
      self.oLatestDate = new Date(data[0]["date"]);
      $.each(data, function(index, value) {
        // create a date object for comparison
        var oThisDate = new Date(value["date"]);

        // Update the end-date so that it has the latest date value
        if (oThisDate > self.oLatestDate) {
          self.oLatestDate = oThisDate;
        } else if (oThisDate < self.oEarliestDate) {
          self.oEarliestDate = oThisDate;
        }
      });

      self.PopulateTableData_(data);
      // After getting all the dates, render the data table
    }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
      console.error(
        "The following error occurred: " + textStatus,
        errorThrown);
    });
};

/**
 * @brief custom filtering of DataTale to filter
 * and show only dates that are within range
 */
DataTable.prototype.IsWithinDate_ =  function(startDate, endDate) {
  $.fn.dataTableExt.afnFiltering.push(function( oSettings, aData, iDataIndex ) {
    var oMin= startDate.getTime();
    var oMax = endDate.getTime();
    var oCurr = new Date(aData[ColIndex.DATE]).getTime();
    // Check that the data value is within the date range
    if ( oMin <= oCurr && oCurr <= oMax ) {
      return true;
    }

    return false;
  });
};

/**
 * @brief custom filtering of DataTale to filter
 * and show only dates that are within range
 */
DataTable.prototype.FilterFolders_ =  function(aFolders) {
  $.fn.dataTableExt.afnFiltering.push(function( oSettings, aData, iDataIndex ) {
    return $.inArray(aData[ColIndex.FOLDER], aFolders) >= 0;
  });
};

/**
 * @brief returns the formatted HTML <table> to be displayed
 * when a row has been clicked
 * @note: https://datatables.net/examples/api/row_details.html
 */
DataTable.prototype.FormatData_ = function(mRowData) {
  var self = this;
  var sDetailsFormat =
    '<tr><td>Transaction Number</td><td>' + mRowData.transaction_number +'</td></tr>' +
    '<tr><td>Note</td><td>' + mRowData.note +'</td></tr>';
  var sFormat =
    '<table>' + sDetailsFormat + '</table>';
  console.log(sFormat);
  var sReceiptItemsList = "<tr><th>Item</th><th>Name</th><th>Cost</th><th>Tags</th></tr>" ; 
  $.each(mRowData.receipt_items, function(index, value) {
    sReceiptItemsList += '<tr><td>' + index + '</td><td>' + value["item_name"] + '</td><td>' + value["cost"] + "</td>";

    //Add tags if they exist for this receipt item
    sReceiptItemsList += "<td>";
    if ("tags" in value) {
      $.each(value["tags"], function(index, tagValue) {
        var oTag = new Tag(tagValue.id, ReceiptType.RECEIPT_ITEM, tagValue.name, value.id);
        sReceiptItemsList += oTag.GetHtml();
      });
    }

    // Add the text input fields for tags after each receipt item
    sReceiptItemsList += TagHelper.GetTagFieldHtml(ReceiptType.RECEIPT_ITEM, value.id);
    sReceiptItemsList += TagHelper.GetAddTagHtml(ReceiptType.RECEIPT_ITEM, value.id);
    sReceiptItemsList += "</td>";
  });

  sReceiptItemsList += '</tr>'
  sFormat += '<table>' + sReceiptItemsList + '</table>';

  return sFormat;
};

/**
 * @brief sends a POST request to the server to add a tag
 * @param sElementId the id of the receipt or receipt_item
 * @param sName the name of the tag
 */
DataTable.prototype.AddTag_ = function(sElementId, sName) {
  var self = this;
  console.log(sElementId);
  console.log(sName);
  var aIdSplit = sElementId.split("-");
  var sType = aIdSplit.length > 4 ? "receipt_item" : "receipt";
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
};



// TODO: Probably move this bitchass into Tag.js
DataTable.prototype.SetupTagKeyPress = function ()
{
  self = this;

  $("." + TagClassIds.ADD_TAG_FIELD).keyup(function(e) {
    switch (e.keyCode)
    {
    case KeyboardCode.ENTER:
      self.AddTag_($(this).attr("id"), $(this).val());
      break;
    case KeyboardCode.ESCAPE:
      TagHelper.CancelAddNewTagInput($(e.currentTarget));
      break;
    }
  });
};

/*
 * brief wrap a tag in a div that stops the row 
 * from expanding when the tag column is clicked
 */
DataTable.prototype.WrapTag_ = function (sTagHtml)
{
  var sTagHtml = "<div class='" + this.sNoClickExpand + "'>" + sTagHtml + "</div>";
  return sTagHtml;
};


