var colIndex = 
{
  DATE : 0,
  VENDOR: 1,
  TRANSACTION: 2, 
  TOTAL : 3,
  TITLE : 4, 
  FOLDER : 5
};

function DataTable (sId)
{
  this.oElem = $(sId);
  this.oDataTable = null;
  this.sDateFormat = "yy-mm-dd";
  this.oEarliestDate = new Date(0);
  this.oLatestDate = new Date(0);
  this.oControllers = null;
};

DataTable.prototype.Init = function(controllers)
{
  this.oControllers = controllers;
  this.GetReceipts_();
};

DataTable.prototype.ShowFolders = function (aFolders) {
  $.fn.dataTableExt.afnFiltering.pop();
  this.oElem.dataTable().fnDraw();
  this.FilterFolders_(aFolders)
  this.oElem.dataTable().fnDraw();
};

DataTable.prototype.ShowDateRange = function (oStartDate, oEndDate) {
  $.fn.dataTableExt.afnFiltering.pop();
  this.oElem.dataTable().fnDraw();
  this.IsWithinDate_(oStartDate, oEndDate);
  this.oElem.dataTable().fnDraw();
};

DataTable.prototype.PopulateTableData_ = function(data) {
  var self = this;
  this.oDataTable = this.oElem.DataTable({
    "data" :  data,
    "columnDefs" : [
     { 
        "targets" : [5], // hide folder ids since we only want them for filtering
        "visible" : false
     },
     { // For formatting the date column
       "targets" : [0],
       "render" : function (data, type, row) {
         var oDate = new Date(data);
         return oDate.getDate() + '-' + (oDate.getMonth() + 1) + '-' + oDate.getFullYear();
       }
     }
    ],
    "columns" : [
      {"data" : "date"},
      {"data" : "vendor_id"},
      {"data" : "transaction_number"},
      {"data" : "total"},
      {"data" : "title"},
      {"data" : "folder_id"},
    ],
  });

  // set up showing child rows when receipt row is clicked
  this.oElem.find("tbody").on("click", "tr", function() {
    // $(this) is the jquery object for the current row
    // oRow is the DataTable object for the current row 
    var oRow = self.oDataTable.row($(this));
    console.log(oRow.data());
    if (oRow.child.isShown()) {
      oRow.child.hide();
      $(this).removeClass("shown");
      $(this).removeClass("selected");
    } else {
      oRow.child(self.FormatData_(oRow.data())).show();
      $(this).addClass("shown");
      $(this).addClass("selected");
    }
  });
};

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
    var oCurr = new Date(aData[colIndex.DATE]).getTime();
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
  console.log(aFolders);
  $.fn.dataTableExt.afnFiltering.push(function( oSettings, aData, iDataIndex ) {
    return $.inArray(aData[colIndex.FOLDER], aFolders) >= 0;
  });
};

/**
 * @brief returns the formatted HTML <table> to be displayed
 * when a row has been clicked
 * @note: https://datatables.net/examples/api/row_details.html
 */
DataTable.prototype.FormatData_ = function(mRowData) {
  return '<table>' + 
         '<tr><td>Transaction Number</td><td>' + mRowData.transaction_number +'<td></tr>' +
         '<tr><td>Note</td><td>' + mRowData.note +'<td></tr>' +
         '</table>';
};




