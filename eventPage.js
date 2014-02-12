// form data
var title = null;
var date = null;
var vendor = null;
var total = null;
var currencies = null;
var transaction = null;
var receipt_items = null;
var name;
var cost;
var quantity;

// addReceipt popup sets to tabId when it opens, null when closed
var newReceipt = null;
var port;
var receiptPort;
var pullState = "pull-off";
// track last non chrome- url tab
var currentTabId;
var removeReceipt = null;

// purchase notification
var purchaseTabId;

// searches string to return a string between substring1 and substring2 - finds first instance of substring2 after substring1
function stringBetween(string, substring1, substring2) {
	var first_index = string.indexOf(substring1);
	return string.substring(first_index + substring1.length, string.indexOf(substring2, first_index));
}

function createReceiptPopup()
{
	// addreceipt popup exists
	if (newReceipt != null)
	{
		// will handle creating addreceipt popup at chrome.tabs.onRemoved event.  set removeReceipt to popupId
		removeReceipt = newReceipt;
		chrome.tabs.remove(newReceipt);
		return;
	}
	// addreceipt window did not exist, open new one
	chrome.windows.create({"url" : "addreceipt.html", "type" : "popup"});
}

function receiptSetup() {
	// setup message passing connection with current tab
	port = chrome.tabs.connect(currentTabId, {name: "newReceipt"});
	console.log("Connected to port: " + port.name + " for tab: " + currentTabId);
	
	// maintain existing pull state
	port.postMessage({"request": pullState});
	
	port.onMessage.addListener(function(msg) {
		console.log("Received msg: " + msg.data + " from port: " + port.name);
		
		window[msg.data] = msg.data;
		receiptPort.postMessage({"request": msg.data});
	});
	
	port.onDisconnect.addListener(function(msg) {
		console.log("Port disconnected from tab " + currentTabId);
		port = null;
	});
}

function receiptPopupSetup() {
	// setup message passing with add receipt popup
	receiptPort = chrome.tabs.connect(newReceipt, {name: "pullBackground"});
	console.log("Connected to receipt port: " + receiptPort.name + " for tab: " + newReceipt);
	receiptPort.onDisconnect.addListener(function(msg) {
		console.log("Receipt port disconnected " + newReceipt);
		receiptPort = null;
	});
}

// track latest active tab and store it if it isn't a chrome-extension OR addreceipt popup
chrome.tabs.onActivated.addListener(function(activeInfo) {
	chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
		//console.log("onActivated - " + tab[0].id);
		// if active tab isn't addreceipt popup - ASYNCHRONOUS, so newReceipt may not be set
		if (!tab[0].url.match(/chrome-extension:\/\//) || !tab[0].url.match(/addreceipt.html/))
		{
			currentTabId = activeInfo.tabId;
			console.log(currentTabId + " " + tab[0].url);
			
			// popup already exists, setup connection to new tab
			if (newReceipt != null)
			{
				if (port != null)
				{
					port.disconnect();
					port = null;
				}
			
				receiptSetup();
			}
		}
	});
});

// track tab load/refreshed
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
	// tab created or refreshed (changeInfo.url only set if different from previous state)
	if (changeInfo.status == "complete" && changeInfo.url === undefined)
	{
		//console.log("onUpdated " + tabId);
		// setup communication if tab not addreceipt refreshed/created, but addreceipt exists
		if (newReceipt != null && tabId != newReceipt)
		{
			if (port != null)
			{
				port.disconnect();
				port = null;
			}
			
			receiptSetup();
		}
		// re-setup communication if addreceipt popup refreshed/created
		else if (newReceipt === tabId)
		{
			receiptPopupSetup();
		}
	}
});

// track tab removed
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
	// if tried to open a receipt window and another was already open, wait for first to be closed before opening
	if (tabId === removeReceipt)
	{
		removeReceipt = null;
		chrome.windows.create({"url" : "addreceipt.html", "type" : "popup"});
	}
});

// SINCE ASYNCHRONOUS, IF CHROME MESSAGE COMES LATER, POST WILL BE MISSED

// ONE POSTBACK is same url, check if it changes on next postback? CONFIRM THIS

/*chrome.webRequest.onBeforeRedirect.addListener(function (details) {
	console.log(details);
	console.log("purchase WEBREQUEST " + purchaseTabId);
}, {urls: ["<all_urls>"]});*/

// completed postback
chrome.webRequest.onCompleted.addListener(function (details) {
	if (details.method == "POST" && purchaseTabId === details.tabId)
	{
		console.log(details);
	}
}, {urls: ["<all_urls>"]});

// message handling - by request.greeting
/*
addReceipt:
	from: popup.js
	trigger: Add Receipt selected from popup
	action: creates new addreceipt popup if one does not exist

purchaseComplete:
	from: content.js
	trigger: purchase input onSubmit event triggered
	action: checks if page successfully http postbacks and redirects to new page
	-- WHAT IF THEY DO ANOTHER TAB AT SAME TIME?! track correct tab
parseHTML:
	from: content.js
	trigger: notification bar, YES selected
	action: create new addreceipt popup with amazon receipt details
	
newReceipt:
	from: addreceipt.js
	trigger: addreceipt window created
	action: setup receipt details
	
closeReceipt:
	from: addreceipt.js
	trigger: addreceipt onunload event triggered (window closed)
	action: clean up receipt details

default:
{
pull-off:
pull-date:
pull-...:
}
	from: addreceipt.js
	trigger: button toggled on/off for attribute date, etc.
	action: send content.js the requested pull state
*/
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log("onMessage:", request);
	
	switch (request.greeting)
	{
		// user tried to add receipt from popup
		case "addReceipt":
			createReceiptPopup();
			break;
			
		// setup auto-notification for purchase
		case "purchaseComplete":
			purchaseTabId = sender.tab.id;
			console.log("purchaseComplete " + purchaseTabId);
			break;
		
		// uses html sanitizer to remove dangerous tags from the page html
		case "parseHTML":
			// html method
			function urlX(url) { if(/^https?:\/\//.test(url)) { return url }};
			function idX(id) { return id };
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
				
				createReceiptPopup();
			}
			break;
		
		// new Receipt popup - only connects to one at a time!
		case "newReceipt":
			if (newReceipt == null)
			{
				newReceipt = sender.tab.id;
				if (currentTabId != null)
				{
					receiptSetup();
				}
			}
			break;
		
		case "closeReceipt":
			console.log("Popup closed - Disconnected from port & receiptPort");
			newReceipt = null;
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
			break;
		
		default:
			// message from addReceipt, requesting data from current tab
			if (request.greeting.indexOf("pull-") != -1 && port != null)
			{
				// save state of what is being sent
				pullState = request.greeting;
				port.postMessage({"request": pullState});
			}
	}
});