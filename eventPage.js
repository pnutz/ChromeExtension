// stores all open receipt notification connections
var receiptPorts = { /* tabId: receiptPort */ };
// track last non chrome- url tab
var currentTabId;
var oldWindowState;
var screenshot = {};
var receipt;
var cleanUpTimeout;
var receiptHotkeyTimeout = true;
var vaultHotkeyTimeout = true;

var aServerHost = "https://warm-eyrie-9414.herokuapp.com/";//"http://localhost:8888";

var apiComm = new ControllerUrls(localStorage["webAppHost"]);

var facebookAPI = new FaceBookAPI();

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
		//alert("Data: " + data + "\nStatus: " + status);
	})
	.fail( function(xhr, textStatus, errorThrown) {
		//alert(xhr.responseText);
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
      if (key !== "items" && key !== "taxes" && key !== "templates" && key !== "elementPaths") {
        generated[key] = value;
        generated.templates[key] = response[0].templates[key];
        generated.elementPaths[key] = response[0].elementPaths[key];
      } else if (key === "items" || key === "taxes") {
        generated[key] = {};
        generated.templates[key] = {};
        generated.elementPaths[key] = {};
        console.log(value);
        var index = 0;
        $.each(value, function(key2, attributes) {
          console.log(key2);
          console.log(attributes);
          generated[key][index] = attributes;
          generated.templates[key][index] = response[0].templates[key][key2];
          generated.elementPaths[key][index] = response[0].elementPaths[key][key2];
          index++;
        });
      }
    });
    // send content script generated data
    receiptPorts[tabId].postMessage({"request": "generatedData", "generated": generated});
    console.log(generated);
		//alert("Data: " + jsonData + "\nStatus: " + status);
	})
	.fail( function(xhr, textStatus, errorThrown) {
		//alert(xhr.responseText);
	});
}

// searches string to return a string between substring1 and substring2 - finds first instance of substring2 after substring1
function stringBetween(string, substring1, substring2) {
	var firstIndex = string.indexOf(substring1);
	return string.substring(firstIndex + substring1.length, string.indexOf(substring2, firstIndex));
}

function receiptSetup() {

  // setup receipt notification message passing connection with current tab
  if (receiptPorts[currentTabId] != null) {
    receiptPorts[currentTabId].disconnect();
  }
	receiptPorts[currentTabId] = chrome.tabs.connect(currentTabId, { name: "receiptPort" });
  console.log(receiptPorts);
	console.log("Connected to port " + receiptPorts[currentTabId].name + " for tab: " + currentTabId);

  // prompt content.js for data if new receipt popup
  receiptPorts[currentTabId].postMessage({ request: "initializeReceipt" });

	receiptPorts[currentTabId].onMessage.addListener(function(msg) {
    if (msg.request) {
      console.log("Received message: " + msg.request + " for port: " + receiptPorts[currentTabId].name);

      switch (msg.request) {
        // message node js server html & domain data
        case "initializeReceipt":
          sendDomain(currentTabId, msg.html, msg.url, msg.domain);
          break;

        // capture visible part of page
        case "capturePage":
          window.clearTimeout(cleanUpTimeout);
          capturePage(msg);
          break;

        // store receipt information and start snapshot capture (resize window)
        case "saveReceipt":
          receipt = msg;
          resizeToPrinterPage();
          break;

        // send receipt information and clean up
        case "sendReceipt":
          window.clearTimeout(cleanUpTimeout);
          trimCanvas(msg.left, msg.top, msg.width, msg.height);
          sendReceipt();
          break;

        // prompt to close receipt connection
        case "closeReceipt":
          if (oldWindowState != null) {
            resizeToOriginalPage();
          } else {
            closeReceipt();
          }
          break;

        case "getFolders":
          this.getFolders();
          break;

        case "getCurrencies":
          this.getCurrencies();
          break;

        case "getProfiles":
          this.getProfiles();
          break;

        case "getCategories":
          this.getCategories();
          break;
      }
    }
	});
}

function getFolders() {
  console.log('URL: ' + apiComm.AppendCred(apiComm.GetUrl("folders")));
  var receiptRequest = $.ajax({
    url: apiComm.AppendCred(apiComm.GetUrl("folders") + '.json'),
    type: 'GET',
    dataType: 'json'
  }).done(function(data){
    // alert(data);
    receiptPorts[currentTabId].postMessage({ request: "getFolders", folderData: data });
  }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
    console.error(
      "The following error occurred: " + textStatus,
      errorThrown);
    //alert(jqXHR.responseText);
  });
}

function getCurrencies() {
  console.log('URL: ' + apiComm.AppendCred(apiComm.GetUrl("currencies")));
  var receiptRequest = $.ajax({
    url: apiComm.AppendCred(apiComm.GetUrl("currencies") + '.json'),
    type: 'GET',
    dataType: 'json'
  }).done(function(data){
    // alert(data);
    receiptPorts[currentTabId].postMessage({"request": "getCurrencies", currencyData: data});
  }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
    console.error(
      "The following error occurred: " + textStatus,
      errorThrown);
    //alert(jqXHR.responseText);
  });
}

function getProfiles() {
  console.log('URL: ' + apiComm.AppendCred(apiComm.GetUrl("profiles")));
  var receiptRequest = $.ajax({
    url: apiComm.AppendCred(apiComm.GetUrl("profiles") + '.json'),
    type: 'GET',
    dataType: 'json'
  }).done(function(data){
    // alert(data);
    receiptPorts[currentTabId].postMessage({ request: "getProfiles", profileData: data });
  }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
    console.error(
      "The following error occurred: " + textStatus,
      errorThrown);
    //alert(jqXHR.responseText);
  });
}

function getCategories() {
  console.log('URL: ' + apiComm.AppendCred(apiComm.GetUrl("receipt_categories")));
  var receiptRequest = $.ajax({
    url: apiComm.AppendCred(apiComm.GetUrl("receipt_categories") + '.json'),
    type: 'GET',
    dataType: 'json'
  }).done(function(data){
    // alert(data);
    receiptPorts[currentTabId].postMessage({ request: "getCategories", categoryData: data });
  }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
    console.error(
      "The following error occurred: " + textStatus,
      errorThrown);
    //alert(jqXHR.responseText);
  });
}

function trimCanvas(left, top, width, height) {
  if (Object.keys(screenshot).length !== 0) {
    console.log("screenshot exists");

    // receive optional element coordinates/data, if screenshot exists trim accordingly
    if (left != null && top != null && width != null && height != null) {
      var canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      screenshot.ctx = canvas.getContext("2d");
      screenshot.ctx.drawImage(screenshot.canvas, left, top,
                               width, height,
                               0, 0,
                               width, height);
      screenshot.canvas = canvas;
    }

    // try with dataURI at first, change to blob after confirmed working
    var dataURI = screenshot.canvas.toDataURL();
    //chrome.tabs.create({ url: dataURI });
    receipt.savedData.snapshot = dataURI;
  } else {
    console.log("screenshot does not exist");
  }
}

function sendReceipt() {
  postReceiptToWebApp(receipt.savedData);
  sendAttributeTemplate(receipt.html, receipt.url, receipt.domain, receipt.generated, receipt.attributes, receipt.savedData);

  if (oldWindowState != null) {
    resizeToOriginalPage();
  } else {
    closeReceipt();
  }
}

function postReceiptToWebApp(savedData) {
  var formData = { receipt: savedData };

  // rename tax_cost to cost
  var taxKeys = Object.keys(formData.receipt.taxes);
  for (var i = 0; i < taxKeys.length; i++) {
    formData.receipt.taxes[taxKeys[i]].cost = formData.receipt.taxes[taxKeys[i]].tax_cost;
    delete formData.receipt.taxes[taxKeys[i]].tax_cost;
  }
  formData.receipt["receipt_taxes_attributes"] = formData.receipt.taxes;
  delete formData.receipt.taxes;

  // rename item_cost to cost
  var itemKeys = Object.keys(formData.receipt.items);
  for (var i = 0; i < itemKeys.length; i++) {
    formData.receipt.items[itemKeys[i]].cost = formData.receipt.items[itemKeys[i]].item_cost;
    delete formData.receipt.items[itemKeys[i]].item_cost;
  }
  formData.receipt["receipt_items_attributes"] = formData.receipt.items;
  delete formData.receipt.items;

  // + in front of Date() makes it a number (timestamp divided by 1000)
  formData.receipt["numeric_date"] = +new Date(formData.receipt["date"])/1000;
  delete formData.receipt["date"];

  formData.receipt["vendor_name"] = formData.receipt["vendor"];
  delete formData.receipt["vendor"];

  formData.receipt["transaction_number"] = formData.receipt["transaction"];
  delete formData.receipt["transaction"];

  formData.receipt["folder_id"] = formData.receipt["folder"];
  delete formData.receipt["folder"];

  formData.receipt["currency_id"] = formData.receipt["currency"];
  delete formData.receipt["currency"];

  if (formData.receipt["snapshot"] != null) {
    formData.receipt["documents_attributes"] = { 0: { "is_snapshot": true, data: formData.receipt["snapshot"] } };
    delete formData.receipt["snapshot"];
  }

  formData.receipt["profile_id"] = formData.receipt["profile"];
  delete formData.receipt["profile"];

  formData.receipt["category_id"] = formData.receipt["category"];
  delete formData.receipt["category"];

  formData.receipt["tag_names"] = [ "test1", "test2", "test3" ];

  formData.receipt["user_id"] = localStorage["userID"];

  console.log(formData);

  var receiptRequest = $.ajax({
    url: localStorage["receiptPost"],
    type: 'POST',
    data : formData,
    dataType: 'json'
  }).done(function(data){
    //alert("submitted");
  }).fail(function (jqXHR, textStatus, errorThrown){
    // log the error to the console
    console.error(
      "The following error occurred: " + textStatus,
      errorThrown);
    //alert(jqXHR.responseText);
  });
}

function resizeToPrinterPage() {
  chrome.windows.getCurrent(function(currentWindow) {
    if (currentWindow.state === "minimized" || currentWindow.state === "maximized" || currentWindow.state === "fullscreen") {
      oldWindowState = {
        state: currentWindow.state
      };
    } else {
      oldWindowState = {
        width: currentWindow.width,
        height: currentWindow.height,
        left: currentWindow.left,
        top: currentWindow.top
      };
    }

    console.log(oldWindowState);
    console.log(currentWindow.state);

    var width = 1100;
    var height = 1700;

    var updateInfo = {
      left: currentWindow.left,
      top: currentWindow.top,
      width: width,
      height: height
    };

    chrome.windows.update(currentWindow.id, updateInfo);

    cleanUpTimeout = window.setTimeout(sendReceipt, 1250);
    receiptPorts[currentTabId].postMessage({ request: "takeSnapshot" });
  });
}


function capturePage(data) {
  var canvas;

  // Get window.devicePixelRatio from the page, not the popup
  var scale = data.devicePixelRatio && data.devicePixelRatio !== 1 ?
      1 / data.devicePixelRatio : 1;

  if (!screenshot.canvas) {
    canvas = document.createElement("canvas");
    canvas.width = data.totalWidth;
    canvas.height = data.totalHeight;
    screenshot.canvas = canvas;
    screenshot.ctx = canvas.getContext("2d");

    // Scale to account for device pixel ratios greater than one. (On a
    // MacBook Pro with Retina display, window.devicePixelRatio = 2.)
    if (scale !== 1) {
      // TODO - create option to not scale? It's not clear if it's
      // better to scale down the image or to just draw it twice
      // as large.
      screenshot.ctx.scale(scale, scale);
    }
  }

  // if the canvas is scaled, then x- and y-positions have to make
  // up for it in the opposite direction
  if (scale !== 1) {
    data.x = data.x / scale;
    data.y = data.y / scale;
  }

  chrome.tabs.captureVisibleTab(
    null, {format: "jpeg"/*, quality: 100*/}, function(dataURI) {
      if (dataURI) {
        var image = new Image();
        image.onload = function() {
          screenshot.ctx.drawImage(image, data.x, data.y);

          // message content script to continue capturing
          cleanUpTimeout = window.setTimeout(sendReceipt, 1250);
          receiptPorts[currentTabId].postMessage({ request: "capturePage", totalWidth: data.totalWidth, totalHeight: data.totalHeight });
        };
        image.src = dataURI;
      }
    });
}

function resizeToOriginalPage() {
  chrome.windows.getCurrent(function(window) {
    chrome.windows.update(window.id, oldWindowState);
    oldWindowState = null;

    receiptPorts[currentTabId].postMessage({ request: "cleanUp" });
    closeReceipt();
  });
}

function checkUrl(tabId) {
  chrome.tabs.sendMessage(tabId, { request: "checkUrl" }, function(response) {
    if (response.url != null) {
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
  if (currentTabId == null) {
    currentTabId = tabId;
  }

  // If we are logging in
  facebookAPI.GetAccessTokenFromLoginTab(tabId, changeInfo.url);

	// tab created or refreshed (changeInfo.url only set if different from previous state - in loading status)
	if (changeInfo.status === "complete" && changeInfo.url == null)
	{
    // if tabId contains receipt notification, disconnect port and remove key/value
    if (receiptPorts[tabId] != null) {
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
  if (receiptPorts[tabId] != null) {
    console.log("Disconnecting from receipt port");
    receiptPorts[tabId].disconnect();
    delete receiptPorts[tabId];
  }
});

function closeReceipt() {
  console.log("Receipt notification closed - Disconnected from receipt_port");

  if (receiptPorts[currentTabId] != null) {
    receiptPorts[currentTabId].disconnect();
    delete receiptPorts[currentTabId];
  }
  receipt = null;
  screenshot = {};
}

// message handling - by request.request
/*
addReceipt:
	from: PopUp.js/content.js
	trigger: Add Receipt selected from popup/hotkey trigger from content script
	action: sets up connection with content script and creates a receipt notification on page

openVault:
  from: content.js
  trigger: hotkey trigger from content script
  action: opens vault

getHotkeys:
  from: content.js
  trigger: onload content.js
  action: sends the localStorage hotkey keycodes to content script to initialize hotkeys
*/

// TODO: In the future we need to encapsulate this into it's own class.
//       We should be able to "register" each of these cases in the switch
//       statement and provide a callback.
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log("onMessage:", request);

	switch (request.request) {
		// user tried to add receipt from popup
		case "addReceipt":
      // sets up message passing between eventPage and content script
      if (receiptHotkeyTimeout === true) {
        receiptSetup();
        receiptHotkeyTimeout = window.setTimeout(function() { receiptHotkeyTimeout = true; }, 2000);
      }
			break;

    case "openVault":
      if (vaultHotkeyTimeout === true) {
        chrome.tabs.create({url: "vault/vault.html"});
        vaultHotkeyTimeout = window.setTimeout(function() { vaultHotkeyTimeout = true; }, 2000);
      }
      break;

    // Facebook login flow
    case "FB_LOGIN_OAUTH":
      facebookAPI.StartLoginFlow();
      break;

    // content script requests hotkeys onload
    case "getHotkeys":
      sendResponse({ receipt: localStorage["hotkeyReceipt"], vault: localStorage["hotkeyVault"] });
      break;

		default:
	}
});

// DEPRECIATED HOTKEY METHOD
// extension hotkeys defined in manifest.json
// if new hotkeys are added, completely remove extension and re-add it to your chrome browser to enable
/*chrome.commands.onCommand.addListener(function(command) {
  if (localStorage["authToken"] != null) {
    switch (command)
    {
      case "addReceipt":
        receiptSetup();
        break;
      case "accessVault":
        chrome.tabs.create({url: "vault/vault.html"});
        break;
      default:
    }
  }
});*/
