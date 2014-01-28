var title;
var date;
var vendor_name;
var total;
var currency;

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
});