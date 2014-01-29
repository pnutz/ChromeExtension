var title = null;
var date = null;
var vendor_name = null;
var total = null;
var currency = null;

// use newdata flag to check in addreceipt to pull? what if not all data was parsed
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log("onMessage:", request);
	if (request.greeting != null && request.greeting == "genReceipt")
	{
		title = request.title
		date = request.date
		vendor_name = request.vendor_name
		total = request.total
		currency = request.currency
		
		chrome.windows.create({"url" : "addreceipt.html", "type" : "popup"});
	}
	// uses html sanitizer to remove dangerous tags from the page html
	else if (request.greeting != null && request.greeting == "parseHTML")
	{
		function urlX(url) { if(/^https?:\/\//.test(url)) { return url }}
    function idX(id) { return id }
    var output = html_sanitize(request.data, urlX, idX);
		// replace all instances of <b> and </b>
		output = output.replace(/<\/?b>/g, '');
		console.log(output);
		output.search("Order Placed:");
	}
});