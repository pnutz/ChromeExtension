var data = [ 
      ["Receipt Item", "Quantity", "Cost"],
      ["Item1", 1, 423.43],
      ["Item2", 2, 435]
    ];

document.addEventListener('DOMContentLoaded', function() {
	// notification yes
	$("#yes").click(function()
	{
		window.parent.postMessage("yes", '*');
	});

	// notification no
	$("#no").click(function()
	{
		window.parent.postMessage("no", '*');
	});
	
	$("#x").click(function()
	{
		window.parent.postMessage("x", '*');
	});

  $("#receipt-items").handsontable({
    data : data,
    startRows : 4,
    startCols : 4,
    stretchH : 'all',
    width : $("#receipt-items-container").width() 
  });
});
