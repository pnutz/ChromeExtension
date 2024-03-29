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

CONSEC_PERCENT = 0.5,
TEXT_ID = "-!_!-",
CLASS_NAME = "TwoReceipt",

temp_domain = "",
attributes = {},
generated = {},
aServerHost = "http://localhost:8888";

var facebookAPI = new FaceBookAPI();

// no longer necessary, attr data is stored in content script and sent with saved_data
// store json message with the latest data for each attribute
//function appendAttributeData(receipt_attr, selection, data, html, url, domain) {
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
      url: url,
      domain: domain
    };
  // receipt-item attributes
  } else {
    var index = receipt_attr.indexOf("-");
    var attr = receipt_attr.substring(index + 1);
    var item_num = receipt_attr.substring(0, index);
    // initialize items key
    if (attributes.items == null) {
      attributes.items = {};
    }
    if (attributes.items[item_num] == null) {
      attributes.items[item_num] = {};
    }
    attributes.items[item_num][attr] = {
      attribute: attr,
      selection: selection,
      element: data,
      html: html,
      url: url,
      domain: domain
    };
  }
  console.log(attributes);
}

// this needs modification based on final receipt popup values
function sendAttributeTemplate(saved_data) {
  // formatting saved_data to match aServer defaults 
  saved_data.vendor = saved_data.vendor_name;
  saved_data.transaction = saved_data.transaction_number;
  saved_data.items = saved_data.receipt_items_attributes;
  delete saved_data.vendor_name;
  delete saved_data.transaction_number;
  delete saved_data.receipt_items_attributes;
  delete saved_data.note;
  delete saved_data.title;
  delete saved_data.purchase_type_id;
  
  var keys = Object.keys(saved_data.items);
  keys.forEach(function(key) {
    saved_data.items[key].name = saved_data.items[key].itemtype;
    delete saved_data.items[key].itemtype;
  });
  
  validateAttributeTemplates(saved_data);
  
	var host = aServerHost + "/template";
	var message = {
		token: localStorage["authToken"],
		userID: localStorage["userID"],
		email: localStorage["userEmail"],
    domain: temp_domain,
    attributes: {},
    generated: {},
    saved_data: {}
	};
  message.attributes = JSON.stringify(attributes);
  message.generated = JSON.stringify(generated);
  message.saved_data = JSON.stringify(saved_data);
  
	request = $.post(host, message, function (data, status) {
		alert("Data: " + data + "\nStatus: " + status);
	})
	.fail( function(xhr, textStatus, errorThrown) {
		alert(xhr.responseText);
	});
}

// on start of receipt, send domain to aServer and receive generated values
function sendDomain(html, url, domain) {
  temp_domain = domain;
  
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
    generated.templates = {};
    // message attribute field text to receipt popup
    $.each(response[0], function(key, value) {
      if (key != "items" && key != "templates") {
        generated[key] = value;
        generated.templates[key] = response[0].templates[key];
        receiptPort.postMessage({"request": value, "attribute": key});
      } else if (key != "templates") {
        generated.items = {};
        generated.templates.items = {};
        var item_index = 0;
        $.each(value, function(key2, item_attributes) {
          generated.items[item_index] = item_attributes;
          generated.templates.items[item_index] = response[0].templates.items[key2];
          item_index++;
          // new receipt item
          receiptPort.postMessage({"request": item_attributes, "attribute": "item"});
        });
      }
    });
    console.log(generated);
		alert("Data: " + json_data + "\nStatus: " + status);
	})
	.fail( function(xhr, textStatus, errorThrown) {
		alert(xhr.responseText);
	});
}

// when receipt item is deleted, makes note of this for any generated receipt items
function processDeletedItem(item_id) {
  // flags generated item as deleted
  if (generated.items != null && generated.items.hasOwnProperty(item_id) && generated.templates.items.hasOwnProperty(item_id)) {
    generated.templates.items[item_id].deleted = true;
    console.log("Deleted Generated Receipt Item " + item_id);
    console.log(generated);
  }
  
  // remove any new templates for deleted receipt item
  if (attributes.items != null && attributes.items.hasOwnProperty(item_id)) {
    delete attributes.items[item_id];
    console.log("Deleted Template for Receipt Item " + item_id);
    console.log(attributes);
  }
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
    
    // message node js server html & domain data
		if (msg.response === "initializeData") {
      sendDomain(pageHTML, msg.url, msg.domain);
    } else if (msg.response === "saveReceipt") {
      var element = msg.data;
      element = html_sanitize(element, urlX, idX);

      // message attribute field text to receipt popup
      window[msg.selection] = msg.selection;
      receiptPort.postMessage({"request": msg.selection});
      
      // message node js server attribute data
      appendAttributeData(msg.response, msg.selection, element, pageHTML, msg.url, msg.domain);
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

// track latest active tab and store it if it isn't a chrome-extension OR addreceipt popup
chrome.tabs.onActivated.addListener(function(activeInfo) {
	chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
		// if active tab isn't addreceipt popup - ASYNCHRONOUS, so newReceipt may not be set
		if (!tab[0].url.match(/chrome-extension:\/\//) || !tab[0].url.match(/addreceipt.html/)) {
			currentTabId = activeInfo.tabId;
			console.log(currentTabId + " " + tab[0].url);
			
			// popup already exists, setup connection to new tab
			if (newReceipt != null) {
				if (port != null) {
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
  // If we are logging in
  facebookAPI.GetAccessTokenFromLoginTab(tabId, changeInfo.url);

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
		/*if (tabId === purchaseTabId && notificationStatus === notificationStatusArray[6])
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
	}*/
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
	/*else if (tabId === purchaseTabId)
	{
		notificationStatus = notificationStatusArray[0];
		clearTimeout(notificationTimeout);
		
		console.log(notificationStatus);
	}*/
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
  temp_domain = "";
}

// WEB REQUEST SECTION REQUIRES BACKGROUND PAGE - not in use so converted to eventPage
// all HTTP requests fall under:
// onCompleted - CAN REDIRECT
// onErrorOccurred - if not completed - don't worry about
// onBeforeRedirect

// web request types
// main_frame: main window
// sub_frame: iframe
// xmlhttprequest: AJAX, data transfer for URL without full page refresh (not just xml)
// ignore: stylesheet, script, image, object, other

/*function setNotificationStatus(index) {
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

// currently only accepts one purchase request, to prevent overwriting
chrome.webRequest.onBeforeRequest.addListener(function (details) {
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
	
newReceipt:
	from: addreceipt.js
	trigger: addreceipt window created
	action: setup receipt details

saveReceipt:
  from: addreceipt.js
  trigger: addreceipt popup saved
  action: close connection to addreceipt, send template data to aserver

closeReceipt:
	from: addreceipt.js
	trigger: addreceipt onunload event triggered (window closed)
	action: clean up receipt details

deleteReceiptItem:
  from: addreceipt.js
  trigger: receipt item deleted
  action: set flag to data for generated receipt item
  
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

// TODO: In the future we need to encapsulate this into it's own class. 
//       We should be able to "register" each of these cases in the switch
//       statement and provide a callback.
//       P.S probably better to utilize actual event pages as well.
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log("onMessage:", request);
	
	switch (request.greeting)
	{
		// user tried to add receipt from popup
		case "addReceipt":
			createReceiptPopup();
			break;
			
		// setup auto-notification for purchase
		/*case "purchaseComplete":
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
			break;*/
		
    // Facebook login flow
    case "FB_LOGIN_OAUTH":
      facebookAPI.StartLoginFlow();
      break;

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
      sendAttributeTemplate(request.data);
      closeReceipt();
      break;
    
		case "closeReceipt":
			closeReceipt();
			break;
		
    case "deleteReceiptItem":
      processDeletedItem(request.data);
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

