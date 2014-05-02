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

// store json message with the latest data for each attribute
function appendAttributeData(receipt_attr, selection, data, html, url, domain) {
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
  
  // compare attributes data with saved_data
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
        // receipt items start at 1tg
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

function validateAttributeTemplates(saved_data) {
  console.log("validateAttributeTemplates");
  console.log(saved_data);
  console.log(attributes);
  // loop through template attributes
  $.each(attributes, function(key, value) {
    if (saved_data.hasOwnProperty(key)) {
      if (key == "items") {
        // loop through receipt items
        $.each(value, function(item_key, item_value) {
          if (saved_data.items.hasOwnProperty(item_key)) {
            // loop through item attributes
            $.each(item_value, function(attr_key, attr_value) {
              if (saved_data.items[item_key].hasOwnProperty(attr_key) && attr_value.selection != saved_data.items[item_key][attr_key]) {
                var template = attributeComparison(attr_value, saved_data.items[item_key][attr_key]);
                if (template == null) {
                  // only one receipt item with one attribute
                  if (Object.keys(attributes.items).length == 1 && Object.keys(attributes.items[item_key]).length == 1) {
                    delete attributes.items;
                  }
                  // only one attribute
                  else if (Object.keys(attributes.items[item_key]).length == 1) {
                    delete attributes.items[item_key];
                  } else {
                    delete attributes.items[item_key][attr_key];
                  }
                } else {
                  attributes.items[item_key][attr_key] = template;
                }
              }
            });
          }
        });
      } else if (value.selection != saved_data[key]) {
        var template = attributeComparison(value, saved_data[key]);
        if (template == null) {
          delete attributes[key];
        } else {
          attributes[key] = template;
        }
      }
    }
  });
  console.log("method complete");
  console.log(attributes);
}

// compute what type of change was done to template_string and return (altered) template
// returns null if template should be deleted
function attributeComparison(template, saved_string) {
  console.log("attributeComparison");
  var template_string = template.selection;
  
  // added text
  // remove new-lines from template_string
  console.log("saved string: " + saved_string);
  console.log("template string: " + template_string);
  if (saved_string.indexOf(template_string) != -1) {
    console.log("added text");
    template = calculateAddedText(template, saved_string);
  }
  // trimmed text
  else if (template_string.indexOf(saved_string) != -1) {
    console.log("trimmed text");
    template = calculateTrimmedText(template, saved_string);
  }
  // add+trim text/removed text/drastic change
  else {
    // template = null;
  }
  return template;
}

// clean white-space text nodes between elements from html
jQuery.fn.htmlClean = function() {
  this.contents().filter(function() {
    if (this.nodeType != 3) {
      $(this).htmlClean();
      return false;
    }
    else {
      this.textContent = $.trim(this.textContent);
      return !/\S/.test(this.nodeValue);
    }
  }).remove();
  return this;
}

function calculateAddedText(template, saved_string) {
  var template_html = $.parseHTML("<body>" + template.html + "</body>");
  // BODY NOT ADDING
  console.log(template_html);
  var $cleaned = $(template_html);
  console.log($cleaned);
  var $doc = $cleaned;
  $cleaned.htmlClean();
  console.log($cleaned);
  
  // NEED TO KNOW .EQ(0) ALTERNATIVE TO GET PARENT, if body works, good to go
  console.log($doc.eq(0).html());
  // ensure outerHTML (or .html()) includes all elements (and not body?) like the old template
  
  var break_tags = $cleaned.find("br");
  console.log(break_tags);
  // remove break tag(s) and replace with text single space
  for (var tag_index = 0; tag_index < break_tags.length; tag_index++) {
    var break_tag = break_tags.eq(tag_index);
    console.log(break_tag);
    if (break_tag[0].nextSibling == null || (break_tag[0].nextSibling != null && break_tag[0].nextSibling.tagName != "BR")) {
      // NEED TO GET THIS WORKING
      //break_tag.appendAfter("&nbsp;");
    }
    // remove break_tag
    break_tag.remove();
  }
  console.log($cleaned);
  break_tags = $cleaned.find("br");
  console.log(break_tags);
  
  var element = $cleaned.find(".TwoReceipt");
  var iter_element = element.first();
  var element_text = iter_element.text().replace(new RegExp(TEXT_ID, "g"), "");
  console.log(element_text);
  // select root element
  // .eq(0) doesnt work
  var used_text = $cleaned.eq(0).text();
  console.log(used_text);
  
  var first_text_id = used_text.indexOf(TEXT_ID), second_text_id = used_text.indexOf(TEXT_ID, first_text_id + 1);
  used_text = used_text.replace(new RegExp(TEXT_ID, "g"), "");
  
  // find out if left/right/left&right text added to template.selection (in saved_string)
  var left_index = 0, right_index = 0;
  var inner_index = saved_string.indexOf(template.selection);
  console.log("inner_index: " + inner_index);
  // there is left added text
  if (inner_index > 0) {
    left_index = inner_index;
  }
  // there is right added text
  if (inner_index + template.selection.length < saved_string.length) {
    right_index = saved_string.length - (inner_index + template.selection.length);
  }
  
  // find index of TEXT_ID and calculate with the added length text
  if (first_text_id != -1 && second_text_id != -1) {
    used_text = used_text.substring(first_text_id - left_index, second_text_id + right_index - TEXT_ID.length);
    console.log("used_text: " + used_text);
  } else {
    return null;
  }
  
  // if added & original text are found in document by same element
  if (used_text.indexOf(saved_string) != -1) {
    // set TwoReceipt class for doc html
    var string_index = element_text.indexOf(saved_string);
    while (string_index != -1) {
      iter_element = iter_element.parent();
      // reset element_text to parent element text without TEXT_ID
      element_text = iter_element.textContent.replace(new RegExp(TEXT_ID, "g"), "");
      string_index = element_text.indexOf(saved_string);
    }
    
    if (iter_element != element[0]) {
      element[0].className = element[0].className.replace(" " + CLASS_NAME, "");
      iter_element.className += " " + CLASS_NAME;
    }
    //document.createTextNode(TEXT_ID);
    
    // iterate character by character of element text
    // xml?
    
    
    // find index of saved_string in used_text, remember TEXT_ID was removed so add-on TEXT_ID length and remove 2 from end
    // string_index is start of string in element_text
    // 
    // string_index + saved_string.length + TEXT_ID.length
    // var 
    
    //$document.body.innerHTML = document.body.innerHTML.replace(new RegExp(TEXT_ID, "g"), "");
    
    /*console.log("iter_element1:");
    console.log(iter_element);
    console.log(iter_element.children);
    console.log(iter_element.children());*/
    
    
    // at ___ index within element
    // count down characters
    // set text or add text node for child
    
    // remove old TEXT_ID and add new TEXT_ID to doc text
    // string_index + saved_string.length
    
    // issue child nodes can nest pretty deep before 
    // find child element that holds start, insert there
    // find child element that holds end, insert there
    // possibly not a child element, but current element
    
    // insert text node
    // need to know offset of element
    // cannot work in innerHTML, since element tags exist here
    
    // need text in reference to TEXT_ID
    // index + text length
        
    // modify template values
    template.selection = saved_string;
    template.element = iter_element.outerHTML;
    template.html = doc.body.outerHTML;
    
    return template;
  } else {
    console.log("returning null");
    return null;
  }
}

function calculateTrimmedText(template, saved_string) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(template.html, "text/html");
  console.log(doc);
  
  
  
  return template;
}

// 1) if add text
// check if text added is next to selected text on html
// after special text symbol
// - get template text
// - get added on left/right text from template text
// - check if left/right of symbol match left/right text - if it does, add text success
// - if no special text symbol, it is an element clicked, calculate from TwoReceipt class
//    - need to find text in html & see if left/right match
//    - need to generate dom to get text, or have entire text stored... but just removed that

//    if add text is minor and doesn't match site, keep template as is?

// template fixing:
// selection - text selected
// element - outerHTML of element
// modify html, set text to be surrounded by special symbols if not exactly element text, remove special symbol that is moved
// set class to TwoReceipt if element changes to parent, remove class from current element (use this to get element outerHTML)

// checkTemplateTrim
// compare text, length shorter but still selected from 
// not deleted
// check if target element is a child - if it is, change element

// checkTemplateAdd
// compare text, length longer and template text still in (this is only good for adding without trimming)

// template add/trim
// text should still exist in doc, with some text in the selection

// character by character comparison of 2 strings, to find if submitted_string is within template_string
// returns true if 1st string is still considered a substring of 2nd string (requires consecutive characters matching)
function characterMatch(submitted_string, template_string) {
  var j = 0,
  consecutive_match = false,
  num_consec_matches = 0;
  
  // iterate through submitted_string
  for(var i = 0; i < submitted_string.length; i++) {
    var character_match = false;
    // keep iterating through template_string until match is found or end of string
    while(j < template_string.length && !character_match) {
      character_match = (template_string.charAt(j) == submitted_string.charAt(i));
      j++;
      
      if (consec_match) {
        if (character_match) {
          num_consec_matches++;
        } else {
          consec_match = false;
        }
      }
    }
    consec_match = true;
  }
  
  // match, but too few consecutive matches
  if (character_match && num_consec_matches / submitted_string.length > CONSEC_PERCENT) {
    return false;
  }
  // match
  else if (character_match) {
    return true;
  }
  // no match
  else {
    return false;
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
		if (msg.response == "initializeData") {
      sendDomain(pageHTML, msg.url, msg.domain);
    } else {
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
  temp_domain = "";
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

