var colHeaders =
      ["Receipt Item", "Quantity", "Cost"];
var data = [ 
      ["Item1", 1, 423.43],
      ["Item2", 2, 435]
    ];

document.addEventListener('DOMContentLoaded', function() {
  var tableWidth = $("#receipt-items-container").width();
  var tableThird = tableWidth/3;
  $("#receipt-items").handsontable({
    data : data,
    startRows : 4,
    startCols : 4,
    stretchH : 'last', //Setting this to 'all' causes resizing issues
    colWidths : [250, 250, 250],
    width : tableWidth,
    colHeaders : colHeaders,
    rowHeaders : true,
    manualColumnResize : true
  });
});
