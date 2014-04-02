// form data
/*var title = null,
date = null,
vendor = null,
total = null,
currencies = null,
transaction = null,
receipt_items = null,
name,
cost,
quantity,*/
 
// addReceipt popup sets to tabId when it opens, null when closed
var newReceipt = null,
port,
receiptPort,
pullState = "pull-off",
// track last non chrome- url tab
currentTabId,
removeReceipt = null,

// purchase notification
purchaseTabId,
pendingRequestId,
getRequestId,
// status variable to track purchase notification (all main_frame web requests)
/*
noPurchase - nothing happening
POSTRequest - found POST
POSTComplete - completed found POST
GETRequest - found a GET following POSTComplete
UpdateLoading - Loading URL after GET Request (CAN SKIP - but don't know if changed page?! [url != undefined])
GETComplete - (any) GET request was completed
UpdateComplete - Completely Loaded URL
*/
notificationStatusArray = ["noPurchase", "POSTRequest", "POSTComplete", "GETRequest", "UpdateLoading", "GETComplete", "UpdateComplete"],
notificationStatus = notificationStatusArray[0],
notificationTimeout,
TIMEOUT = 10000,

attributes = {},
aServerHost = "http://localhost:8888";

// store json message with the latest data for each attribute
function appendAttributeData(receipt_attr, selection, data, html, text, url, domain) {

  /* format
    attributes {  name: {},
                  date: {},
                  items: {
                    1: {
                          name: {},
                          quantity: {},
                          price: {}
                      },
                    2: {
                          name: {},
                          quantity: {},
                          price: {}
                      }
                  }
  */

  // non-receipt-item attributes
  if (receipt_attr.indexOf("-") == -1) {
    attributes[receipt_attr] = {
      attribute: receipt_attr,
      selection: selection,
      element: data,
      html: html,
      text: text,
      url: url,
      domain: domain
    };
  // receipt-item attributes
  } else {
    var index = receipt_attr.indexOf("-");
    var attr = receipt_attr.substring(index + 1);
    var item_num = receipt_attr.substring(0, index);
    // initialize items key
    if (attributes["items"] == null) {
      attributes["items"] = {};
    }
    if (attributes["items"][item_num] == null) {
      attributes["items"][item_num] = {};
    }
    attributes["items"][item_num][attr] = {
      attribute: attr,
      selection: selection,
      element: data,
      html: html,
      text: text,
      url: url,
      domain: domain
    };
  }
  console.log(attributes);
}

function sendAttributeTemplate() {
	var host = aServerHost + "/template";
	var message = {
		token: localStorage["authToken"],
		userID: localStorage["userID"],
		email: localStorage["userEmail"],
    attributes: {}
	};
  message["attributes"] = JSON.stringify(attributes);
  
	request = $.post(host, message, function (data, status) {
		alert("Data: " + data + "\nStatus: " + status);
	})
	.fail( function(xhr, textStatus, errorThrown) {
		alert(xhr.responseText);
	});
}

function sendDomain(html, url, domain) {
	var host = aServerHost + "/load";
	var message = {
		token: localStorage["authToken"],
		userID: localStorage["userID"],
		email: localStorage["userEmail"],
		html: html,
		url: url,
		domain: domain
	};
	
	request = $.post(host, message, function (data, status) {
    var json_data = "[" + data + "]";
    var response = $.parseJSON(json_data);
    // message attribute field text to receipt popup
    $.each(response[0], function(key, value) {
      receiptPort.postMessage({"request": value, "attribute": key});
    });
		alert("Data: " + json_data + "\nStatus: " + status);
	})
	.fail( function(xhr, textStatus, errorThrown) {
		alert(xhr.responseText);
	});
}

// searches string to return a string between substring1 and substring2 - finds first instance of substring2 after substring1
function stringBetween(string, substring1, substring2) {
	var first_index = string.indexOf(substring1);
	return string.substring(first_index + substring1.length, string.indexOf(substring2, first_index));
}

// html sanitizer helper methods
function urlX(url) { if(/^https?:\/\//.test(url)) { return url }};
function idX(id) { return id };

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

function receiptSetup(first) {
	// setup message passing connection with current tab
	port = chrome.tabs.connect(currentTabId, {name: "newReceipt"});
	console.log("Connected to port: " + port.name + " for tab: " + currentTabId);
	
  // prompt content.js for data if new receipt popup
  if (first) {
    port.postMessage({"request": "initializeData"});
  }
  
	// maintain existing pull state
	port.postMessage({"request": pullState});
	
	port.onMessage.addListener(function(msg) {
    var pageHTML = msg.html;
		pageHTML = html_sanitize(pageHTML, urlX, idX);
    
		if (msg.response == "initializeData") {
      // message node js server html & domain data
      sendDomain(pageHTML, msg.url, msg.domain);
    } else {
      var element = msg.data;
      element = html_sanitize(element, urlX, idX);

   		var parser = new DOMParser();
      var doc = parser.parseFromString(element, "text/html");
      
      // iframe message, url/domain may not match
      
      var sendData;
      if (msg.selection === null)
      {
        sendData = doc.body.innerText;
      }
      else
      {
        sendData = msg.selection;
      }
      console.log("Received msg: " + sendData + " from port: " + port.name);

      // message attribute field text to receipt popup
      window[sendData] = sendData;
      receiptPort.postMessage({"request": sendData});
      
      // message node js server attribute data
      if (msg.selection == null) {
        appendAttributeData(msg.response, "", element, pageHTML, msg.text, msg.url, msg.domain);
      } else if (msg.selection.trim() !== "") {
        appendAttributeData(msg.response, msg.selection, element, pageHTML, msg.text, msg.url, msg.domain);
      }
    }
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

function setNotificationStatus(index) {
	notificationStatus = notificationStatusArray[index];
	clearTimeout(notificationTimeout);
	notificationTimeout = setTimeout(function() {
		if (notificationStatus === notificationStatusArray[index])
		{
			console.log(notificationStatus + " TIMEOUT");
			notificationStatus = notificationStatusArray[0];
		}
	}, TIMEOUT);
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

// track tab changes
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
	// tab created or refreshed (changeInfo.url only set if different from previous state - in loading status)
	if (changeInfo.status == "complete" && changeInfo.url === undefined)
	{	
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
		
		// purchase notification handling (waiting for next page to load) -- next complete page load
		if (tabId === purchaseTabId && notificationStatus === notificationStatusArray[6])
		{
			chrome.tabs.sendMessage(tabId, {greeting: "showNotification"});
			
			notificationStatus = notificationStatusArray[0];
			clearTimeout(notificationTimeout);
		}
	}
	// looking for redirect
	else if (changeInfo.status == "loading" && changeInfo.url != undefined)
	{
		if (tabId === purchaseTabId && notificationStatus === notificationStatusArray[4])
		{
			setNotificationStatus(5);
		}
	}
	if (changeInfo.favIconUrl == null)
	{
		console.log(notificationStatus + " onUpdated");
		console.log(changeInfo);
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
	// purchase notification handling (if tab is closed)
	else if (tabId === purchaseTabId)
	{
		notificationStatus = notificationStatusArray[0];
		clearTimeout(notificationTimeout);
		
		console.log(notificationStatus);
	}
});

function closeReceipt() {
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
  attributes = {};
}

// all HTTP requests fall under:
// onCompleted - CAN REDIRECT
// onErrorOccurred - if not completed - don't worry about
// onBeforeRedirect

// web request types
// main_frame: main window
// sub_frame: iframe
// xmlhttprequest: AJAX, data transfer for URL without full page refresh (not just xml)
// ignore: stylesheet, script, image, object, other

// currently only accepts one purchase request, to prevent overwriting
/*chrome.webRequest.onBeforeRequest.addListener(function (details) {
	if (details.tabId === purchaseTabId && details.type == "main_frame")
	{
		// post request detected
		if (details.method == "POST" && notificationStatus == notificationStatusArray[1])
		{
			pendingRequestId = details.requestId;
			
			setNotificationStatus(2);
		}
		// get request detected
		else if (details.method == "GET" && notificationStatus == notificationStatusArray[3])
		{
			getRequestId = details.requestId;
			
			setNotificationStatus(4);
		}
		
		console.log(notificationStatus + " onBeforeRequest");
		console.log(details);
	}
}, {urls: ["<all_urls>"]}, ["requestBody"]);

// error detected, clean up request
chrome.webRequest.onErrorOccurred.addListener(function (details) {
	if (details.tabId === purchaseTabId)
	{
		if (details.requestId === pendingRequestId || details.requestId === getRequestId)
		{
			notificationStatus = notificationStatusArray[0];
			clearTimeout(notificationTimeout);

			purchaseTabId = null;
			getRequestId = null;
		}
		
		console.log(notificationStatus + " onErrorOccurred");
		console.log(details);
	}
}, {urls: ["<all_urls>"]});

chrome.webRequest.onBeforeRedirect.addListener(function (details) {
	if (details.type == "main_frame")
	{
		// post request completed
		if (details.requestId === pendingRequestId && notificationStatus === notificationStatusArray[2])
		{
			setNotificationStatus(3);
		}
		// if get request was a redirect
		else if (details.requestId === getRequestId)
		{
			setNotificationStatus(3);
			getRequestId = null;
		}
		
		console.log(notificationStatus + " onBeforeRedirect");
		console.log(details);
	}
}, {urls: ["<all_urls>"]});

// get requests are only completed
chrome.webRequest.onCompleted.addListener(function (details) {
	if (details.type == "main_frame")
	{
		// post request completed
		if (details.requestId === pendingRequestId && notificationStatus === notificationStatusArray[2])
		{
			setNotificationStatus(3);
		}
		// a get request completed
		else if (details.requestId === getRequestId)
		{
			setNotificationStatus(6);
			getRequestId = null;
		}
		
		console.log(notificationStatus + " onCompleted");
		console.log(details);
	}
}, {urls: ["<all_urls>"]});*/

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
			if (notificationStatus === notificationStatusArray[0])
			{
				setNotificationStatus(1);
				
				purchaseTabId = sender.tab.id;
				console.log(notificationStatus + ": purchaseComplete " + purchaseTabId);
			}
			else
			{
				console.log("purchaseComplete rejected from " + sender.tab.id);
			}
			break;
		
    // MANUAL CASE, NOT NECESSARY ANYMORE
		// uses html sanitizer to remove dangerous tags from the page html
		/*case "parseHTML":
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
				
				createReceiptPopup();
			}
			break;*/
		
		// new Receipt popup - only connects to one at a time!
		case "newReceipt":
			if (newReceipt == null)
			{
				newReceipt = sender.tab.id;
				if (currentTabId != null)
				{
					receiptSetup(true);
				}
			}
			break;
		
    // receipt popup saved, send data to aServer
    case "saveReceipt":
      sendAttributeTemplate();
      closeReceipt();
      break;
    
		case "closeReceipt":
			closeReceipt();
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
