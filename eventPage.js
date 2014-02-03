// form data
var title = null;
var date = null;
var vendor = null;
var total = null;
var currencies = null;
var transaction = null;
var receipt_items = null;

// addReceipt popup sets to true when it opens
var addReceipt = false;
var port;
var receiptPort;
var pullState = "pull-off";
// track last non chrome- url tab
var currentTabId;
// track receipt popup tab
var receiptTabId;

// searches string to return a string between substring1 and substring2 - finds first instance of substring2 after substring1
function stringBetween(string, substring1, substring2) {
	var first_index = string.indexOf(substring1);
	return string.substring(first_index + substring1.length, string.indexOf(substring2, first_index));
}

function receiptSetup() {
	// setup message passing connection with current tab
	port = chrome.tabs.connect(currentTabId, {name: "addReceipt"});
	console.log("Connected to port: " + port.name + " for tab: " + currentTabId);
	
	// maintain existing pull state
	port.postMessage({"request": pullState});
	
	port.onMessage.addListener(function(msg) {
		console.log("Received msg: " + msg.data + " from port: " + port.name);
		if (msg.response == "sendDate")
		{
			date = msg.data;
			receiptPort.postMessage({"request": "date"});
		}
		else if (msg.response == "sendVendor")
		{
			vendor = msg.data;
			receiptPort.postMessage({"request": "vendor"});
		}
		else if (msg.response == "sendTransaction")
		{
			transaction = msg.data;
			receiptPort.postMessage({"request": "transaction"});
		}
	});
	
	port.onDisconnect.addListener(function(msg) {
		console.log("Port disconnected from tab " + currentTabId);
		port = null;
	});
}

function receiptPopupSetup() {
	// setup message passing with add receipt popup
	receiptPort = chrome.tabs.connect(receiptTabId, {name: "pullBackground"});
	console.log("Connected to receipt port: " + receiptPort.name + " for tab: " + receiptTabId);
	receiptPort.onDisconnect.addListener(function(msg) {
		console.log("Receipt port disconnected " + receiptTabId);
		receiptPort = null;
	});
}

// track latest active tab and store it if it isn't a chrome-extension OR addreceipt popup
chrome.tabs.onActivated.addListener(function(activeInfo) {
	chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
		//console.log("onActivated - " + tab[0].id);
		if (tab[0].url.match(/chrome-extension:\/\//) && tab[0].url.match(/addreceipt.html/))
		{
			receiptTabId = activeInfo.tabId;
			
			// setup run in onUpdated
		}
		else if (!tab[0].url.match(/chrome-extension:\/\//) && !tab[0].url.match(/chrome:\/\//))
		{
			currentTabId = activeInfo.tabId;
			console.log(currentTabId + activeInfo.windowId);
			console.log(tab[0].url);
			
			if (port != null)
			{
				port.disconnect();
				port = null;
			}
			
			// popup already exists, setup connection to new tab
			if (addReceipt == true)
			{
				receiptSetup();
			}
		}
	});
});

// track tab load/refreshed
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
	// tab refreshed, url only set if different from previous state
	if (changeInfo.status == "complete" && changeInfo.url === undefined)
	{
		//console.log("onUpdated " + tabId);
		if (tabId === currentTabId && addReceipt == true)
		{
			receiptSetup();
		}
		else if (tabId === receiptTabId && changeInfo.url === undefined)
		{
			receiptPopupSetup();
		}
	}
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log("onMessage:", request);
	
	// uses html sanitizer to remove dangerous tags from the page html
	if (request.greeting == "parseHTML")
	{
		// html method
		function urlX(url) { if(/^https?:\/\//.test(url)) { return url }}
    function idX(id) { return id }
		var output = request.data;
    output = html_sanitize(request.data, urlX, idX);
		// sanitized html
		//console.log(output);
		/*var parser = new DOMParser();
		var doc = parser.parseFromString(output, "text/html");
		// DOM
		console.log(doc);*/
		
		// trying text method
		var text = request.text;
		console.log(text);
		
		// MANUAL CASE FOR AMAZON
		if (request.url.indexOf("amazon") != -1)
		{
			var dateSearch = "Order Placed:";
			var orderNumberSearch = "Amazon.ca order number:";
			var orderTotal = "Order Total:";
			var money = "$";
			var currencyStatus = "";
			var shipped = "Shipment #1:";
			var shipped_print = "Shipped on";
			var price = "Price";
			var howMany = "of:";
			var condition = "Condition:";
			var soldBy = "Sold by:";
			var sellerProfile = "(seller profile)";
			var shipping = "Shipping & Handling";
			var tax1 = "Estimated GST/HST";
			var tax2 = "Estimated PST/RST/QST";
			
			date = stringBetween(text, dateSearch, orderNumberSearch).trim();
			var tempdate = new Date(date);
			date = ("0" + tempdate.getMonth() + 1).slice(-2) + "/" + ("0" + tempdate.getDate()).slice(-2) + "/" + tempdate.getFullYear()
			console.log("Date: " + date);
			title = "Amazon Purchase On " + date;
			console.log("Title: " + title);
			transaction = stringBetween(text, orderNumberSearch, orderTotal).trim();
			console.log("Order Number: " + transaction);
			currencyStatus = stringBetween(text, orderTotal, money).trim();
			currencies = currencyStatus;
			
			if (currencies == "")
			{
				currencies = "USD";
			}
			else if (currencies == "CDN")
			{
				currencies = "CAD";
			}
			console.log("Currency: " + currencies);
			if (text.indexOf(shipped) == -1)
			{
				total = stringBetween(text, money, shipped_print).trim();
			}
			else
			{
				total = stringBetween(text, money, shipped).trim();
			}
			console.log("Total: " + total);
			// vendor is amazon
			if (text.indexOf(sellerProfile) == -1)
			{
				if (currencyStatus == "")
				{
					vendor = stringBetween(text, soldBy, money).trim();
				}
				else
				{
					vendor = stringBetween(text, soldBy, currencyStatus).trim();
				}
			}
			// vendor is not amazon -- for amazon, vendor should be amazon, not individual stores purchased from
			else
			{
				vendor = stringBetween(text, soldBy, sellerProfile).trim();
			}
			console.log("Vendor: " + vendor);
			
			// set text after first occurrence of currency - we know total (w/ currency) is displayed at the top
			if (currencyStatus == "")
			{
				text = text.substring(text.indexOf(money) + money.length);
			}
			else
			{
				text = text.substring(text.indexOf(currencyStatus) + currencyStatus.length);
			}
			
			// find number of receipt_items on page
			var receiptItemCount = 0;
			var ofIndex = text.indexOf(howMany);
			while (ofIndex != -1)
			{
				receiptItemCount++;
				ofIndex = text.indexOf(howMany, ofIndex + 1);
			}
			
			receipt_items = [];

			var name;
			var cost;
			var quantity;
			var costIndex;
			var costEnd;
			var float_cost;
			for (var currentItem = 1; currentItem <= receiptItemCount; currentItem++)
			{
				// special case for 1st item in list
				if (currentItem == 1)
				{
					quantity = stringBetween(text, price, howMany).trim();
				}
				// every other item in list
				else
				{
					quantity = text.substring(0, text.indexOf(howMany)-1).trim();
				}
				
				// at most 2 decimal places for each price
				if (currencyStatus == "")
				{
					costIndex = text.indexOf(money);
					costEnd = text.indexOf(".", costIndex);
					cost = text.substring(costIndex + money.length, costIndex + costEnd);
					costEnd = cost.indexOf(".") + 3;
					cost = cost.substring(1, costEnd);
				}
				else
				{
					costIndex = text.indexOf(currencyStatus);
					costEnd = text.indexOf(".", costIndex) + 2;
					cost = text.substring(costIndex + currencyStatus.length, costIndex + costEnd);
					costEnd = cost.indexOf(".") + 3;
					cost = cost.substring(2, costEnd);
				}

				
				name = stringBetween(text, howMany, condition).trim();
				
				// remove product type if it exists
				name = name.replace(/\[.+\]/g, '').trim();
				
				// calculate cost
				float_cost = parseFloat(cost) / parseFloat(quantity);
				
				console.log("Name: " + name);
				console.log("Cost: " + float_cost);
				console.log("Quantity: " + quantity);
				
				receipt_items.push({'name': name, 'cost': float_cost, 'quantity': quantity});
				
				// set text after first occurrence of cost
				text = text.substring(text.indexOf(cost) + cost.length)
			}
			
			quantity = 1;
			
			// shipping & handling
			text = text.substring(text.indexOf(shipping));
			
			// at most 2 decimal places for each price
			if (currencyStatus == "")
			{
				costIndex = text.indexOf(money);
				costEnd = text.indexOf(".", costIndex) + 2;
				cost = text.substring(costIndex + money.length, costIndex + costEnd);
				costEnd = cost.indexOf(".") + 3;
				cost = cost.substring(1, costEnd);
			}
			else
			{
				costIndex = text.indexOf(currencyStatus);
				costEnd = text.indexOf(".", costIndex) + 2;
				cost = text.substring(costIndex + currencyStatus.length, costIndex + costEnd);
				costEnd = cost.indexOf(".") + 3;
				cost = cost.substring(2, costEnd);
			}
			
			receipt_items.push({'name': shipping, 'cost': cost, 'quantity': quantity});
			
			// tax1
			text = text.substring(text.indexOf(tax1));
			
			// at most 2 decimal places for each price
			if (currencyStatus == "")
			{
				costIndex = text.indexOf(money);
				costEnd = text.indexOf(".", costIndex) + 2;
				cost = text.substring(costIndex + money.length, costIndex + costEnd);
				costEnd = cost.indexOf(".") + 3;
				cost = cost.substring(1, costEnd);
			}
			else
			{
				costIndex = text.indexOf(currencyStatus);
				costEnd = text.indexOf(".", costIndex) + 2;
				cost = text.substring(costIndex + currencyStatus.length, costIndex + costEnd);
				costEnd = cost.indexOf(".") + 3;
				cost = cost.substring(2, costEnd);
			}
			
			receipt_items.push({'name': tax1, 'cost': cost, 'quantity': quantity});
			
			// tax2
			text = text.substring(text.indexOf(tax2));
			
			// at most 2 decimal places for each price
			if (currencyStatus == "")
			{
				costIndex = text.indexOf(money);
				costEnd = text.indexOf(".", costIndex) + 2;
				cost = text.substring(costIndex + money.length, costIndex + costEnd);
				costEnd = cost.indexOf(".") + 3;
				cost = cost.substring(1, costEnd);
			}
			else
			{
				costIndex = text.indexOf(currencyStatus);
				costEnd = text.indexOf(".", costIndex) + 2;
				cost = text.substring(costIndex + currencyStatus.length, costIndex + costEnd);
				costEnd = cost.indexOf(".") + 3;
				cost = cost.substring(2, costEnd);
			}
			
			receipt_items.push({'name': tax2, 'cost': cost, 'quantity': quantity});
								
			/*receipt_items = [
				{
					'name': "Nintendo 3DS XL",
					'cost': 12.99,
					'quantity': 2
				},
				{
					'name': "SteelSeries QcK Gaming Mouse Pad (Black)",
					'cost': 9.98,
					'quantity': 1
				},
				{
					'name': "Shipping & Handling",
					'cost': -4.48,
					'quantity': 1
				}
			];*/
			chrome.windows.create({"url" : "addreceipt.html", "type" : "popup"});
		}
	}
	// new addReceipt popup - only connects to one at a time, ensure this!
	else if (request.greeting == "addReceipt" && addReceipt == false)
	{
		addReceipt = true;
		
		if (currentTabId != null)
		{
			receiptSetup();
		}
	}
	else if (request.greeting == "closeReceipt")
	{
		console.log("Popup closed - Disconnected from port & receiptPort");
		addReceipt = false;
		pullState = "pull-off";
		
		if (port != null)
		{
			port.disconnect();
		}
		port = null;
		
		if (receiptPort != null)
		{
			receiptPort.disconnect();
		}
		receiptPort = null;
	}
	// message from addReceipt, requesting data from current tab
	else if (request.greeting.indexOf("pull-") != -1 && port != null)
	{
		// save state of what is being sent
		pullState = request.greeting;
		port.postMessage({"request": pullState});
	}
});