document.addEventListener('DOMContentLoaded', function() {
	// notification yes
	$("#yes").click(function()
	{
		$("#yes").hide();
		$("#readytoremove").hide();
	});

	// notification no
	$("#no").click(function()
	{
		$("#no").hide();
	});
});