var ColIndex =
{
  DATE : 0,
  VENDOR: 1,
  TOTAL : 2,
  TITLE : 3,
  TAGS : 4,
  FOLDER : 5,
  RECEIPT : 6,
  TRANSACTION: 7,
};

var enum_Action =
{
  MODIFY : 0,
  REMOVE : 1,
  CREATE : 2
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
  this.sReceiptExtraDetailsClass = "extra-details"
};

DataTable.prototype.Init = function()
{
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

DataTable.prototype.RePopulateTable_ = function ()
{
  this.oElem.dataTable().fnClearTable();
  this.oElem.dataTable().fnDestroy();
  this.PopulateTableData_(mReceiptsData);
};

DataTable.prototype.PopulateTableData_ = function(data) {
  var self = this;
  this.mReceiptsData = data;
    this.oDataTable = this.oElem.DataTable({
    // datatable dom setting "t" allows for scrolling
    "dom" : "t",
    "autoWidth" : false,
    "data" :  this.mReceiptsData,
    "paging" : false,
    "scrollY" : "100%",
    //"scrollCollapse" : true,
    "columnDefs" : [
     {
        //Hide these columns
        "targets" : [ColIndex.TRANSACTION,
                     ColIndex.FOLDER,
                     ColIndex.RECEIPT], 
        "visible" : false
     },
     { // For formatting the date column
       "targets" : [ColIndex.DATE],
       "searchable" : false,
       "render" : function (data, type, row) {
         var oDate = new Date(data);
         return oDate.getDate() + '-' + (oDate.getMonth() + 1) + '-' + oDate.getFullYear();
       }
     },
     { // For displaying tags on the receipt level
       "targets" : ColIndex.TAGS,
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
    // Use "." to reference nested members
    "columns" : [
      {"data" : "date", "width" : "5%"},
      {"data" : "vendor.name", "width" : "5%"},
      {"data" : "total", "width" : "5%"},
      {"data" : "title", "width" : "15%"},
      {"data" : "tags", "width" : "5%"},
      {"data" : "folder_id", "width": "0%"},
      {"data" : "id", "width": "0%"},
      {"data" : "transaction_number", "width" : "5%"},
    ],
  });

  //TODO: find a way to not have to call these callback functions twice
  TagHelper.SetupAddTagButtonCallbacks();
  TagHelper.SetupTagHoverCallbacks();
  TagHelper.SetupTagKeyPress("." + TagClassIds.ADD_TAG_FIELD);
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
      var sReceiptDetailsId = "receipt-details-" + oRow.data().id;
      if ($row.hasClass("selected")) {
//      if (oRow.child.isShown()) {
//        oRow.child.hide();
        $row.removeClass("shown");
        $row.removeClass("selected");
        $("#" + sReceiptDetailsId).remove();
      } else {
//        oRow.child(self.FormatData_(oRow.data())).show();
        $("#receipt-detail-div").append("<div id='" + sReceiptDetailsId + "'></div>");
        $("#" + sReceiptDetailsId).addClass("receipt-details-card");
        $("#" + sReceiptDetailsId).addClass("well");
        $("#receipt-details-template").clone().show().appendTo("#" + sReceiptDetailsId);
//       oRow.child($("<div id='" + sReceiptDetailsId + "'></div>")).show();
//        self.RenderDetails_(oRow.data(), sReceiptDetailsId);
        self.RenderDetails_(oRow.data(), sReceiptDetailsId);
//        $row.addClass("shown");
        $row.addClass("selected");
        //TODO: temporary, we should only apply the handler to 
        // visible buttons for this receipt only
        TagHelper.SetupAddTagButtonCallbacks();
        TagHelper.SetupTagHoverCallbacks();
        //Set up the enter key binding event for when enter key pressed
        TagHelper.SetupTagKeyPress("#" + sReceiptDetailsId + " " + "." + TagClassIds.ADD_TAG_FIELD);
      }
    }
  });
  TagHelper.SetupRemoveTagButtonCallbacks(null);

};

/**
 * @brief retrieve receipts from the server and populate
 * the table
 */
DataTable.prototype.GetReceipts_ = function() {
    var self = this;
    var request = $.ajax({
      url: g_oControllers.AppendCred(g_oControllers.GetUrl("receipts") + ".json"),
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
 * @brief render the html of the child rows
 * @params mRowData a map of the row data
 * @params sDetailId the id of the div to append the html to (no '#')
 */
DataTable.prototype.RenderDetails_ = function(mRowData, sDetailsId)
{
  var self = this;
  // Make table for receipt items
  $("#" + sDetailsId).append(this.GetReceiptItemsJObject_(mRowData.receipt_items));

  // Other receipt Details
  var $detailsTable = $("<table class='receipt-details-info table table-condensed'></table>");
  $detailsTable.append("<tr><th colspan='2'>Details</th></tr>");
  $detailsTable.append("<tr><td><b>Transaction Number</b></td><td>" + mRowData.transaction_number + "</td></tr>");
  $detailsTable.append("<tr><td><b>Note</b></td><td>" + mRowData.note + "</td></tr>");
  $("#" + sDetailsId).append($detailsTable);

  //TODO:
  //NOTE:
  // When entering/modifying receipt item details the subtotal and the total should be recalculated.
  // Any discrepancies between what the total calculated by the sum of the receipt items and the 
  // user given total should be taken care of by adding "modifiers" (credit/coupon) so that the totals will match


  // Snapshot
  var $snapshotDiv = $("<div class='receipt-details-snapshot''><b>Snapshot</b></div>");
  $snapshotDiv.append("<img style='width:100%; height:100%;'src='http://upload.wikimedia.org/wikipedia/commons/0/0b/ReceiptSwiss.jpg'>");
  $("#" + sDetailsId).append($snapshotDiv);
};


DataTable.prototype.GetReceiptItemsJObject_ = function (aReceiptItems) {
  var $mainTable = $("<table class='receipt-details-items table table-condensed' style='float:left; width:40%;'></table>");
  var fItemTotal = 0.0;
  var aHeaders = ["Item", "Quantity", "Unit Price", "Tags"]
  var $headerRow = $("<tr></tr>");
  // Apply the headers
  $.each(aHeaders, function (index, value) {
    var $header = $("<th></th>");
    $header.text(value);
    $headerRow.append($header);
  });
  $mainTable.append($headerRow);

  // put items in the table
  $.each(aReceiptItems, function(index, value) {
    var $itemRow = $("<tr></tr>");
    $itemRow.append("<td>" + value.item_name + "</td>");
    $itemRow.append("<td>" + value.quantity + "</td>");
    $itemRow.append("<td>" + value.cost + "</td>");
    fItemTotal += value.cost * value.quantity;

    var $tagsList = $("<td></td>");
    $.each(value["tags"], function(index, tagValue) {
      var oTag = new Tag(tagValue.id, ReceiptType.RECEIPT_ITEM, tagValue.name, value.id);
      $tagsList.append(oTag.GetHtml());
    });

    // Add the text input fields for tags after each receipt item
    $tagsList.append(TagHelper.GetTagFieldHtml(ReceiptType.RECEIPT_ITEM, value.id));
    $tagsList.append(TagHelper.GetAddTagHtml(ReceiptType.RECEIPT_ITEM, value.id));

    $itemRow.append($tagsList);
    $mainTable.append($itemRow);
  });
  // Append the subtotal, for now pretend item total without taxes and modifiers is the sub total
  $mainTable.append("<tr><td colspan=3><b>SubTotal</b></td><td>$" + fItemTotal + "</td></tr>"); 
  return $mainTable;
};

/**
 * @brief returns the formatted HTML <table> to be displayed
 * when a row has been clicked
 * @note: https://datatables.net/examples/api/row_details.html
 */
DataTable.prototype.FormatData_ = function(mRowData) {
  var self = this;
  var sDetailsTable ='<table class="' + this.sReceiptExtraDetailsClass + '"><tr><th>Items</th><th>Details</th><th>Snapshot</th></tr>';
  var sRow = "<tr>";

  var sDetailsCell = 
    '<td><table>' +  
    '<tr><td>Transaction Number</td><td>' + mRowData.transaction_number +'</td></tr>' +
    '<tr><td>Note</td><td>' + mRowData.note +'</td></tr>' + 
    '</table></td>';
  var sReceiptItemsList = "<td><table><tr><th>Name</th><th>Cost</th><th>Tags</th></tr>" ; 
  $.each(mRowData.receipt_items, function(index, value) {
    sReceiptItemsList += '<tr><td>' + value["item_name"] + '</td><td>' + value["cost"] + "</td>";

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
    sReceiptItemsList += "</td></tr>";
  });
  
  sReceiptItemsList += '</table></td>'

  sRow += sReceiptItemsList + sDetailsCell + "</tr>";

  sDetailsTable += sRow + "</table>";
  return sDetailsTable;
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

/*
 * brief notify the datatable of action performed on receipt
 * and repopulates the table to reflect changes
 */
DataTable.prototype.ReceiptUpdated = function (iAction, iReceiptId)
{
  var self = this;
  g_oControllers.GetRequest("receipts", iReceiptId, function(data) {
    switch (iAction)
    {
      case enum_Action.REMOVE:
      case enum_Action.CREATE:
      case enum_Action.MODIFY:
      default:
        $.each(self.mReceiptsData, function(index, value) {
          if (value.id === iReceiptId)
            self.mReceiptsData[index] = data;
        });
        console.err("Bad action");
    }

    self.RePopulateTable_();
  });
};
