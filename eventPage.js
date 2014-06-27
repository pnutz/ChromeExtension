// stores all open receipt notification connections
var receipt_ports = { /* tabId: receiptPort */ },
// track last non chrome- url tab
currentTabId,

aServerHost = "http://localhost:8888",

facebookAPI = new FaceBookAPI();

// this needs modification based on final receipt popup values
function sendAttributeTemplate(html, url, domain, generated, attributes, saved_data) {
  // formatting saved_data to match aServer defaults
  /*saved_data.vendor = saved_data.vendor_name;
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
  });*/

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
    var json_data = "[" + data + "]";
    var response = $.parseJSON(json_data);
    var generated = {};
    generated.templates = {};
    // message attribute field text to receipt popup
    $.each(response[0], function(key, value) {
      if (key !== "items" && key !== "templates") {
        generated[key] = value;
        generated.templates[key] = response[0].templates[key];
      } else if (key !== "templates") {
        generated.items = {};
        generated.templates.items = {};
        var item_index = 0;
        $.each(value, function(key2, item_attributes) {
          generated.items[item_index] = item_attributes;
          generated.templates.items[item_index] = response[0].templates.items[key2];
          item_index++;
        });
      }
    });
    // send content script generated data
    receipt_ports[tabId].postMessage({"request": "generatedData", "data": generated});
    console.log(generated);
		alert("Data: " + json_data + "\nStatus: " + status);
	})
	.fail( function(xhr, textStatus, errorThrown) {
		alert(xhr.responseText);
	});
}

// when receipt item is deleted, makes note of this for any generated receipt items
// do this in content script
/*function processDeletedItem(item_id) {
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
}*/

// searches string to return a string between substring1 and substring2 - finds first instance of substring2 after substring1
function stringBetween(string, substring1, substring2) {
	var first_index = string.indexOf(substring1);
	return string.substring(first_index + substring1.length, string.indexOf(substring2, first_index));
}

function receiptSetup() {
	// setup receipt notification message passing connection with current tab
  if (receipt_ports[currentTabId] !== undefined) {
    receipt_ports[currentTabId].disconnect();
  }
	receipt_ports[currentTabId] = chrome.tabs.connect(currentTabId, {name: "receiptPort"});
  console.log(receipt_ports);
	console.log("Connected to port " + receipt_ports[currentTabId].name + " for tab: " + currentTabId);

  // prompt content.js for data if new receipt popup
  receipt_ports[currentTabId].postMessage({"request": "initializeReceipt"});

	receipt_ports[currentTabId].onMessage.addListener(function(msg) {
    if (msg.request) {
      console.log("Received message: " + msg.request + " for port: " + receipt_ports[currentTabId].name);
    } else {
      console.log("Received message: " + msg.response + " for port: " + receipt_ports[currentTabId].name);
    }
    // message node js server html & domain data
		if (msg.response === "initializeData") {
      //sendDomain(currentTabId, msg.html, msg.url, msg.domain);
    } else if (msg.request === "saveReceipt") {
      console.log(msg);
      postReceiptToWebApp(msg.saved_data);
      sendAttributeTemplate(msg.html, msg.url, msg.domain, msg.generated, msg.attributes, msg.saved_data);
      closeReceipt();
    } else if (msg.request === "closeReceipt") {
      closeReceipt();
    }
	});
}

function postReceiptToWebApp(saved_data) {
  var form_data = { receipt: saved_data };

  form_data.receipt["receipt_items_attributes"] = form_data.receipt.items;
  delete form_data.receipt.items;

  // + in front of Date() makes it a number (timestamp divided by 1000)
  form_data.receipt["numeric_date"] = +new Date(form_data.receipt["date"])/1000;
  delete form_data.receipt["date"];

  form_data.receipt["vendor_name"] = form_data.receipt["vendor"];
  delete form_data.receipt["vendor"];

  form_data.receipt["transaction_number"] = form_data.receipt["transaction"];
  delete form_data.receipt["transaction"];

  form_data.receipt["title"] = "";
  form_data.receipt["currency_id"] = 1;
  //form_data.receipt["purchase_type_id"] = 1;
  // optional folder_id

  console.log(form_data);

  var receiptRequest = $.ajax({
    url: localStorage["receiptPost"],
    type: 'POST',
    data : form_data,
    dataType: 'json'
  }).done(function(data){
    alert("submitted");
  }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
    console.error(
      "The following error occurred: " + textStatus,
      errorThrown);
  });
}

function checkUrl(tab_id) {
  chrome.tabs.sendMessage(tab_id, { greeting: "checkUrl" }, function(response) {
    if (response.url !== undefined) {
      console.log("TODO: send url to aServer - " + response.url);
    } else {
      console.log("TODO: send url to aServer");
    }
  });
}

// track latest active tab and store it if it isn't a chrome-extension OR addreceipt popup
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
    if (receipt_ports[tabId] !== undefined) {
      receipt_ports[tabId].disconnect();
      delete receipt_ports[tabId];
    }

    // whenever page updates, check url with aServer for receipt page
    checkUrl(tabId);
  }
});

// track tab removed
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
	// if tabId contains a receipt notification, disconnect port and delete port key/value
  if (receipt_ports[tabId] !== undefined) {
    console.log("Disconnecting from receipt port");
    receipt_ports[tabId].disconnect();
    delete receipt_ports[tabId];
  }
});

function closeReceipt() {
  console.log("Receipt notification closed - Disconnected from receipt_port");

  if (receipt_ports[currentTabId] !== undefined) {
    receipt_ports[currentTabId].disconnect();
    delete receipt_ports[currentTabId];
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

