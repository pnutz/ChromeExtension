// stores all open receipt notification connections
var receiptPorts = { /* tabId: receiptPort */ },
// track last non chrome- url tab
currentTabId,
oldWindowState,

aServerHost = "http://localhost:8888",

facebookAPI = new FaceBookAPI();

// this needs modification based on final receipt popup values
function sendAttributeTemplate(html, url, domain, generated, attributes, savedData) {
	var host = aServerHost + "/template";
	var message = {
		token: localStorage["authToken"],
		userID: localStorage["userID"],
		email: localStorage["userEmail"],
    html: html,
    url: url,
    domain: domain,
    attributes: {},
    generated: {},
    savedData: {}
	};

  message.attributes = JSON.stringify(attributes);
  message.generated = JSON.stringify(generated);
  message.savedData = JSON.stringify(savedData);

	var request = $.post(host, message, function (data, status) {
		alert("Data: " + data + "\nStatus: " + status);
	})
	.fail( function(xhr, textStatus, errorThrown) {
		alert(xhr.responseText);
	});
}

// on start of receipt, send domain to aServer and receive generated values
function sendDomain(tabId, html, url, domain) {

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
    var jsonData = "[" + data + "]";
    var response = $.parseJSON(jsonData);
    var generated = {};
    generated.templates = {};
    generated.elementPaths = {};
    // message attribute field text to receipt popup
    $.each(response[0], function(key, value) {
      if (key !== "items" && key !== "templates" && key !== "elementPaths") {
        generated[key] = value;
        generated.templates[key] = response[0].templates[key];
        generated.elementPaths[key] = response[0].elementPaths[key];
      } else if (key === "items") {
        generated.items = {};
        generated.templates.items = {};
        generated.elementPaths.items = {};
        var itemIndex = 0;
        $.each(value, function(key2, itemAttributes) {
          generated.items[itemIndex] = itemAttributes;
          generated.templates.items[itemIndex] = response[0].templates.items[key2];
          generated.elementPaths.items[itemIndex] = response[0].elementPaths.items[key2];
          itemIndex++;
        });
      }
    });
    // send content script generated data
    receiptPorts[tabId].postMessage({"request": "generatedData", "generated": generated});
    console.log(generated);
		alert("Data: " + jsonData + "\nStatus: " + status);
	})
	.fail( function(xhr, textStatus, errorThrown) {
		alert(xhr.responseText);
	});
}

// searches string to return a string between substring1 and substring2 - finds first instance of substring2 after substring1
function stringBetween(string, substring1, substring2) {
	var firstIndex = string.indexOf(substring1);
	return string.substring(firstIndex + substring1.length, string.indexOf(substring2, firstIndex));
}

function receiptSetup() {
	// setup receipt notification message passing connection with current tab
  if (receiptPorts[currentTabId] !== undefined) {
    receiptPorts[currentTabId].disconnect();
  }
	receiptPorts[currentTabId] = chrome.tabs.connect(currentTabId, {name: "receiptPort"});
  console.log(receiptPorts);
	console.log("Connected to port " + receiptPorts[currentTabId].name + " for tab: " + currentTabId);

  // prompt content.js for data if new receipt popup
  receiptPorts[currentTabId].postMessage({"request": "initializeReceipt"});

	receiptPorts[currentTabId].onMessage.addListener(function(msg) {
    if (msg.request) {
      console.log("Received message: " + msg.request + " for port: " + receiptPorts[currentTabId].name);
    } else {
      console.log("Received message: " + msg.response + " for port: " + receiptPorts[currentTabId].name);
    }

    // message node js server html & domain data
		if (msg.response === "initializeReceipt") {
      sendDomain(currentTabId, msg.html, msg.url, msg.domain);
    }
    // resize window in preparation for snapshot
    else if (msg.request === "resizeWindow") {
      resizeToPrinterPage();
      receiptPorts[currentTabId].postMessage({ request: "takeSnapshot" });
    }
    // send receipt information and clean up
    else if (msg.response === "saveReceipt") {
      console.log(msg);

      postReceiptToWebApp(msg.savedData);
      sendAttributeTemplate(msg.html, msg.url, msg.domain, msg.generated, msg.attributes, msg.savedData);

      if (oldWindowState != null) {
        resizeToOriginalPage();
      }

      closeReceipt();
    }
    // prompt to cloe receipt connection
    else if (msg.request === "closeReceipt") {
      if (oldWindowState != null) {
        resizeToOriginalPage();
      }

      closeReceipt();
    }
	});
}

function postReceiptToWebApp(savedData) {
  var formData = { receipt: savedData };

  formData.receipt["receipt_items_attributes"] = formData.receipt.items;
  delete formData.receipt.items;

  // + in front of Date() makes it a number (timestamp divided by 1000)
  formData.receipt["numeric_date"] = +new Date(formData.receipt["date"])/1000;
  delete formData.receipt["date"];

  formData.receipt["vendor_name"] = formData.receipt["vendor"];
  delete formData.receipt["vendor"];

  formData.receipt["transaction_number"] = formData.receipt["transaction"];
  delete formData.receipt["transaction"];

  formData.receipt["title"] = "";
  formData.receipt["currency_id"] = 1;
  //formData.receipt["purchase_type_id"] = 1;
  // optional folder_id

  formData.receipt["documents_attributes"] = { 0: { "is_snapshot": true, data: formData.receipt["snapshot"] } };
  delete formData.receipt["snapshot"];

  delete formData.receipt["subtotal"];
  delete formData.receipt["taxes"];
  delete formData.receipt["profile"];
  delete formData.receipt["category"];
  formData.receipt["tag_names"] = [ "test1", "test2", "test3" ];

  console.log(formData);

  var receiptRequest = $.ajax({
    url: localStorage["receiptPost"],
    type: 'POST',
    data : formData,
    dataType: 'json'
  }).done(function(data){
    alert("submitted");
  }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
    console.error(
      "The following error occurred: " + textStatus,
      errorThrown);
    alert(jqXHR.responseText);
  });
}

function resizeToPrinterPage() {
  chrome.windows.getCurrent(function(window) {
    if (window.state === "minimized" || window.state === "maximized" || window.state === "fullscreen") {
      oldWindowState = {
        state: window.state
      };
    } else {
      oldWindowState = {
        width: window.width,
        height: window.height,
        left: window.left,
        top: window.top
      };
    }

    console.log(oldWindowState);
    console.log(window.state);

    var width = 1100;
    var height = 1700;

    var updateInfo = {
      left: window.left,
      top: window.top,
      width: width,
      height: height
    };

    chrome.windows.update(window.id, updateInfo);
  });
}

function resizeToOriginalPage() {
  chrome.windows.getCurrent(function(window) {
    chrome.windows.update(window.id, oldWindowState);
    oldWindowState = null;
  });
}

function checkUrl(tabId) {
  chrome.tabs.sendMessage(tabId, { greeting: "checkUrl" }, function(response) {
    if (response.url !== undefined) {
      console.log("TODO: send url to aServer - " + response.url);
    } else {
      console.log("TODO: send url to aServer");
    }
  });
}

// track latest active window and store it
chrome.windows.onFocusChanged.addListener(function(windowId) {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    chrome.tabs.query({active: true, windowId: windowId}, function(tabs) {
      currentTabId = tabs[0].id;
    });
  }
});

// track latest active tab and store it if it isn't a chrome-extension
chrome.tabs.onActivated.addListener(function(activeInfo) {
	chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
    // if active tab isn't a chrome-extension page
    if (!tab[0].url.match(/chrome-extension:\/\//)) {
      currentTabId = activeInfo.tabId;
			console.log(currentTabId + " " + tab[0].url);
    }
	});
});

// track tab changes
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  if (currentTabId === null) {
    currentTabId = tabId;
  }

  // If we are logging in
  facebookAPI.GetAccessTokenFromLoginTab(tabId, changeInfo.url);

	// tab created or refreshed (changeInfo.url only set if different from previous state - in loading status)
	if (changeInfo.status === "complete" && changeInfo.url === undefined)
	{
    // if tabId contains receipt notification, disconnect port and remove key/value
    if (receiptPorts[tabId] !== undefined) {
      receiptPorts[tabId].disconnect();
      delete receiptPorts[tabId];
    }

    // whenever page updates, check url with aServer for receipt page
    //checkUrl(tabId);
  }
});

// track tab removed
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
	// if tabId contains a receipt notification, disconnect port and delete port key/value
  if (receiptPorts[tabId] !== undefined) {
    console.log("Disconnecting from receipt port");
    receiptPorts[tabId].disconnect();
    delete receiptPorts[tabId];
  }
});

function closeReceipt() {
  console.log("Receipt notification closed - Disconnected from receipt_port");

  if (receiptPorts[currentTabId] !== undefined) {
    receiptPorts[currentTabId].disconnect();
    delete receiptPorts[currentTabId];
  }
}

// message handling - by request.greeting
/*
addReceipt:
	from: popup.js
	trigger: Add Receipt selected from popup
	action: creates new addreceipt popup if one does not exist

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
      // sets up message passing between eventPage and content script
      receiptSetup();
			break;

    // Facebook login flow
    case "FB_LOGIN_OAUTH":
      facebookAPI.StartLoginFlow();
      break;
		default:
	}
});

