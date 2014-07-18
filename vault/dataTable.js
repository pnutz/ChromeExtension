var colIndex = 
{
  DATE : 0,
  VENDOR: 1,
  TRANSACTION: 2, 
  TOTAL : 3,
  NOTE : 4, 
  FOLDER : 5
};

function DataTable (sId)
{
  this.oElem = $(sId);
};

DataTable.prototype.Init = function(data)
{
  this.oElem.DataTable({
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


