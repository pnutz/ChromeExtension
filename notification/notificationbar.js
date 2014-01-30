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
});