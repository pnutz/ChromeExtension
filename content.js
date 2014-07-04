var incomingPort,
    lastClicked,
    mouseDownElement,
    generated,
    receipt_notification,
    document_text;

$(document).ready(function () {
	if (self === top) {
		console.log("document ready");
	}

  document_text = initializeContentSearch();
  console.log(document_text);

  // find how many instances of search_term exist in document
  /*var search_word = "order number:";
  console.log("OCCURRENCES 1");
  var count = occurrences(document_text, search_word, true);

  if (count > 0) {
    console.log(count + " instances of " + search_word + " found in document");

    console.log("CLEAN HIGHLIGHT");
    cleanHighlight();
    console.log("SEARCH TEXT");
    searchText(search_word, "vendor", count);
    console.log("FIND RELEVANT MATCHES");
    findRelevantMatches("vendor");

    var field = "vendor";
    var index = "0";
    var element = getMatchElement(field, index),
        start_index = getSearchTermProperty(field, "start", index),
        end_index = getSearchTermProperty(field, "end", index),
        start_node_index = getSearchTermProperty(field, "start_node_index", index);
        var params = { "text": "", "trim": false };

    // look for start and end index within element
    if ($(element).length > 0) {
      var children = $(element)[0].childNodes;
      $.each(children, function(index, value) {
        params = iterateText(value, addText, params);
      });
    } else {
      console.log("element " + field + " does not exist. text not highlighted");
    }
    console.log(params);

    console.log("HIGHLIGHT");
    highlightMatchText("vendor", 0);
  } else {
    console.log("document search halted: " + count + " instances of " + search_word + " found in document");
  }
  cleanHighlight();*/
  /*search_word = "num";
  console.log("OCCURRENCES 2");
  count = occurrences(document_text, search_word, true);

  if (count > 0) {
    console.log(count + " instances of " + search_word + " found in document");

    console.log("CLEAN HIGHLIGHT");
    cleanHighlight();
    console.log("SEARCH TEXT");
    searchText(search_word, "vendor", count);
    console.log("FIND RELEVANT MATCHES");
    findRelevantMatches("vendor");

    console.log("HIGHLIGHT");
    highlightMatchText("vendor", 0);
  } else {
    console.log("document search halted: " + count + " instances of " + search_word + " found in document");
  }*/


	// only run function when user prompts to start, so links keep working
	/*$(document).click(function(event) {
		lastClicked = $(event.target);
		if (htmlGet !== "pull-off")	{
			var element = $(event.target);
      var element_text = element.text().trim();
			console.log("Element Clicked: " + element_text);

      var linkSelected;
      if (element[0].tagName === "BUTTON" || element[0].tagName === "A") {
        linkSelected = true;
      } else {
        linkSelected = false;
      }

      // check a few parent levels up for a link or button
      var parentElement = element;
      if (parentElement !== null) {
        for (var index = 0; index < 3; index++) {
          if (parentElement.parent().length !== 0 && linkSelected === false) {
            parentElement = parentElement.parent();
            if (parentElement[0].tagName === "BUTTON" || parentElement[0].tagName === "A") {
              linkSelected = true;
            }
          } else {
            break;
          }
        }
      }

			// only send message if nothing selected
			if (linkSelected === true || window.getSelection().toString() === "" || element[0].tagName === "BODY")
			{
				element[0].className += " " + CLASS_NAME;

        var message_domain;
        if (document.domain === null || document.domain === "") {
          message_domain = "DOMAIN";
        } else {
          message_domain = document.domain;
        }

        var first_text_id = document.createTextNode(TEXT_ID);
        var second_text_id = document.createTextNode(TEXT_ID);
        $("." + CLASS_NAME).prepend(first_text_id);
        $("." + CLASS_NAME).append(second_text_id);

				var msg_data = {
					response: htmlGet.substring(5),
					selection: element_text.replace(/\n/g, ""),
					data: element[0].outerHTML,
					html: document.body.outerHTML,
					url: location.href,
					domain: message_domain
				};

        // iframe, send it to main page content script
        if (self !== top) {
          window.parent.postMessage(JSON.stringify(msg_data), '*');
        } else {
          incomingPort.postMessage(msg_data);
        }

        first_text_id.parentNode.removeChild(first_text_id);
        second_text_id.parentNode.removeChild(second_text_id);

				element[0].className = element[0].className.replace(" " + CLASS_NAME, "");
			}
			return false;
		}
	});

	// detect mousedown element
	$(document).mousedown(function(event) {
		mouseDownElement = $(event.target);
  });

	// get selected text on mouseup (and element)
	$(document).mouseup(function(event) {
		var textSelection = window.getSelection().toString();

    // check a few parent levels up for a link or button
    // TO DO: find better way to deal with this case
    var parentElement = mouseDownElement;
    if (parentElement !== null) {
      for (var index = 0; index < 3; index++) {
        if (parentElement.parent().length !== 0) {
          parentElement = parentElement.parent();
          if (parentElement[0].tagName === "BUTTON" || parentElement[0].tagName === "A") {
            return false;
          }
        } else {
          break;
        }
      }
    }

		// only send message if text is selected or user did not click link
		if (textSelection !== "" && mouseDownElement !== null && mouseDownElement[0].tagName !== "A" &&
          mouseDownElement[0].tagName !== "BUTTON" && mouseDownElement[0].tagName !== "BODY") {
			if (htmlGet !== "pull-off") {
				console.log("Mouse-Up: " + textSelection);

				var range = window.getSelection().getRangeAt(0);
				var startContainer = range.startContainer;
				var endContainer = range.endContainer;
				var startOffset = range.startOffset;
				var endOffset = range.endOffset;
				console.log(range);
				// startContainer insertion will alter endOffset so we do endContainer first
				if (endContainer.nodeType === Node.TEXT_NODE) {
					endContainer.insertData(endOffset, TEXT_ID);
				} else {
					endContainer.appendChild(document.createTextNode(TEXT_ID));
				}
				if (startContainer.nodeType === Node.TEXT_NODE) {
					startContainer.insertData(startOffset, TEXT_ID);
				} else {
					startContainer.insertBefore(document.createTextNode(TEXT_ID), startContainer.firstChild);
				}

				var commonAncestorContainer = range.commonAncestorContainer;
				// Node.TEXT_NODE is 3 for <#text> XML nodes
				while (commonAncestorContainer.nodeType === Node.TEXT_NODE) {
					commonAncestorContainer = commonAncestorContainer.parentElement;
				}

				commonAncestorContainer.className += " " + CLASS_NAME;

        var message_domain;
        if (document.domain === null || document.domain === "") {
          message_domain = "DOMAIN";
        } else {
          message_domain = document.domain;
        }

				var msg_data = {
					response: htmlGet.substring(5),
					selection: textSelection.replace(/\n/g, ""),
					data: commonAncestorContainer.outerHTML,
					html: document.body.outerHTML,
					url: location.href,
					domain: message_domain
				};

				console.log(msg_data);
        // iframe, send it to main page content script
        if (self !== top) {
          window.parent.postMessage(JSON.stringify(msg_data), '*');
        } else {
          incomingPort.postMessage(msg_data);
        }

				commonAncestorContainer.className = commonAncestorContainer.className.replace(" " + CLASS_NAME, "");

        var removeNode;
				// startContainer deletion first so we can use existing endOffset
				if (startContainer.nodeType === Node.TEXT_NODE) {
					startContainer.deleteData(startOffset, TEXT_ID.length);
				} else {
					removeNode = startContainer.childNodes[0];
					startContainer.removeChild(removeNode);
				}
				if (endContainer.nodeType === Node.TEXT_NODE) {
					endContainer.deleteData(endOffset, TEXT_ID.length);
				} else {
					removeNode = endContainer.childNodes[endContainer.childNodes.length - 1];
					endContainer.removeChild(removeNode);
				}
			}
		}
	});*/

	// "paypal" "pay with paypal" "bestbuy" don't work
	/*var postButtons = $("form[method='post']").find(":input[type='submit']");
	var length = postButtons.length;
	for (var index = 0; index < length; index++)
	{
		var submitElement = postButtons.eq(index);
		var value = submitElement.val().toLowerCase();
		var text = submitElement.text().toLowerCase();
		value = " " + value + " ";
		text = " " + text + " ";

		if (value.indexOf(" order ") != -1 || text.indexOf(" order ") != -1 ||
				value.indexOf(" buy ") != -1 || text.indexOf(" buy ") != -1 ||
				value.indexOf(" checkout ") != -1 || text.indexOf(" checkout ") != -1 ||
				value.indexOf(" pay ") != -1 || text.indexOf(" pay ") != -1
				// "sign in" for testing with GMAIL
				|| value.indexOf(" sign in ") != -1
				// "Create Receipt" for testing with webapp
				|| value.indexOf(" create receipt ") != -1)
		{
			console.log("text: " + text);
			console.log("id: " + submitElement.attr("id"));
			console.log("class: " + submitElement.attr("class"));
			console.log("name: " + submitElement.attr("name"));
			console.log("value: " + value);
			// submission with <ENTER> triggers HERE2
			submitElement.click(function(event) {
				//alert("HERE2");
				chrome.runtime.sendMessage({ greeting: "purchaseComplete" });
			});
		}
	}

	var postButtons = $("form[method='post']").find(":input[type='image']");
	var length = postButtons.length;
	for (var index = 0; index < length; index++)
	{
		var submitElement = postButtons.eq(index);
		var value = submitElement.val().toLowerCase();
		var text = submitElement.text().toLowerCase();
		value = " " + value + " ";
		text = " " + text + " ";

		var alt = "";
		if (submitElement.attr("alt") != undefined)
		{
			alt = submitElement.attr("alt").toLowerCase();
			alt = " " + alt + " ";
		}

		if (value.indexOf(" order ") != -1 || text.indexOf(" order ") != -1 ||
				value.indexOf(" buy ") != -1 || text.indexOf(" buy ") != -1 ||
				value.indexOf(" checkout ") != -1 || text.indexOf(" checkout ") != -1 ||
				value.indexOf(" pay ") != -1 || text.indexOf(" pay ") != -1
				// amazon image one-click
				|| alt.indexOf(" buy ") != -1)
		{
			console.log("text: " + text);
			console.log("id: " + submitElement.attr("id"));
			console.log("class: " + submitElement.attr("class"));
			console.log("name: " + submitElement.attr("name"));
			console.log("value: " + value);
			console.log("alt: " + alt);
			// submission with <ENTER> triggers HERE2
			submitElement.click(function(event) {
				//alert("HERE2");
				chrome.runtime.sendMessage({ greeting: "purchaseComplete" });
			});
		}
	}

	// find out element that caused submit (possibly purchase) & parent form element
	$('form').submit(function() {
		if ($(this).has(lastClicked))
		{
			console.log($(this));

			//return lastClicked & $(this)
		}
	});
	}*/
});

function createNotification() {
	// remove element if it already exists
	if ($('#notificationdiv').length > 0)
	{
		var notdiv = document.getElementById("notificationdiv");
		notdiv.parentNode.removeChild(notdiv);
	}

	// css for iframe
	var style = document.createElement("style");
	style.type = "text/css";
	style.innerHTML = ".twoReceiptIFrame { width: 100%; }";
	document.getElementsByTagName("head")[0].appendChild(style);

  document.getElementsByTagName("body")[0].style.paddingTop = "300px";

	// append iframe notification within div to body
	var div = document.createElement("div");
	div.id = "notificationdiv";
	div.setAttribute("style", "top: 0px; left: 0px; height: 300px; width: 100%; position: fixed; background-color: black; z-index: 1000000099; visibility: visible; position");
	var iframe = document.createElement("iframe");
	iframe.id = "twoReceiptIFrame";
	iframe.className = "twoReceiptIFrame";
	iframe.scrolling = "no";
	iframe.style.width = "100%";
  iframe.setAttribute("style", 'height: 300px; border: 0px; overflow: visible;');
	iframe.src = chrome.extension.getURL("/notification/notificationbar.html");
	div.appendChild(iframe);

  // before appending, hide the div
  $(div).hide();
	document.documentElement.appendChild(div);
  $(div).toggle("slide");
}

// long-lived connection from background
chrome.runtime.onConnect.addListener(function(port) {
	// connect if not an iframe
	if (self === top) {
    console.log("Connected to port: " + port.name);
    if (port.name === "receiptPort") {
      incomingPort = port;
    }

    var message_domain;
    if (document.domain === null || document.domain === "") {
      message_domain = "DOMAIN";
    } else {
      message_domain = document.domain;
    }

    port.onMessage.addListener(function(msg) {
      console.log("Received msg: " + msg.request + " for port: " + port.name);
      // receive receipt notification-related messages
      if (port.name === "receiptPort") {
        // send basic page data so aServer can generate data
        if (msg.request === "initializeReceipt") {
          var msg_data = {
            response: msg.request,
            html: document.body.outerHTML,
            url: location.href,
            domain: message_domain
          };

          createNotification();

          // delay response so generated data comes later (handsontable not fully generated yet)
          setTimeout(function() {
            incomingPort.postMessage(msg_data);
          }, 400);
        }
        // receive generated data
        else if (msg.request === "generatedData") {
          generated = msg.generated;

          // send generated data to receipt notification
          document.getElementById('twoReceiptIFrame').contentWindow.postMessage(msg, "*");
        }
      }
    });

    port.onDisconnect.addListener(function() {
      console.log("Disconnected " + port.name + " port");
      if (port.name === "receiptPort") {
        incomingPort = null;
      }
    });
  }
});

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
    console.log("running listener function for " + request.greeting);
		// do not load for iframe
		if (self === top) {
      // retrieve url & domain
      if (request.greeting === "checkUrl") {
        /*var message_domain;
        if (document.domain === null || document.domain === "") {
          message_domain = "DOMAIN";
        } else {
          message_domain = document.domain;
        }

        var msg_data = {
          response: request.greeting,
          url: location.href,
          domain: message_domain
        };
        sendResponse(msg_data);*/
      }
      // get page html
      else if (request.greeting === "getHTML")	{
				sendResponse({
					data: document.body.outerHTML,
					farewell: "sendHTML"
				});
			}
			// this is how lastpass does it, by adding a div and iframe element to the current page
			else if (request.greeting === "showNotification") {
				createNotification();
			}
		}
		else {
			console.log("IFRAME (nothing run) - received onMessage connection instead of port connect");
		}
});

window.addEventListener("message", function(event) {
  if (event.origin.indexOf("chrome-extension://") !== -1)
  {
    console.log(event.data);

    switch (event.data.request) {

      // user submitted receipt, send all data to eventPage
      case "saveReceipt":
        if (event.data.saved_data !== undefined) {
          var notdiv = document.getElementById("notificationdiv");
          sendReceipt(event.data.saved_data, event.data.rows);
          document.getElementsByTagName("body")[0].style.paddingTop = "0px";
          notdiv.parentNode.removeChild(notdiv);
        }
        break;

      // user requests search
      case "searchText":
        if (event.data.fieldName !== undefined && event.data.text !== undefined) {
          searchRequest(event.source, "text", event.data.fieldName, event.data.text, event.data.itemIndex);
        }
        break;

      // user requests numeric search
      case "searchNumber":
        if (event.data.fieldName !== undefined && event.data.text !== undefined) {
          searchRequest(event.source, "number", event.data.fieldName, event.data.text, event.data.itemIndex);
        }
        break;

      // user focused on search, highlight selected area
      case "highlightSearchText":
        if (event.data.fieldName !== undefined) {
          cleanHighlight();
          var field = event.data.fieldName;
          if (event.data.itemIndex !== undefined) {
            field += event.data.itemIndex;
          }
          highlightMatchText(field, event.data.value);
        }
        break;

      // user selected search, highlight, and set field text
      case "selectText":
        if (event.data.fieldName !== undefined && event.data.value !== undefined) {
          cleanHighlight();
          cleanFieldText(event.data.fieldName, event.data.itemIndex);

          var field = event.data.fieldName;
          if (event.data.itemIndex !== undefined) {
            field += event.data.itemIndex;
          }

          var element = getMatchElement(field, event.data.value);
          var start = getSearchTermProperty(field, "start", event.data.value);
          var end = getSearchTermProperty(field, "end", event.data.value);
          var node = getSearchTermProperty(field, "start_node_index", event.data.value);
          setFieldText(element, start, end, event.data.fieldName, event.data.itemIndex, node);

          highlightAttributeText(event.data.fieldName, event.data.itemIndex);
        }
        break;

      // user focuses on notification text field, highlight attribute data if it exists
      case "highlightText":
        if (event.data.fieldName !== undefined) {
          cleanHighlight();
          highlightAttributeText(event.data.fieldName, event.data.itemIndex);
        }
        break;

      // user lost focus on notification text field, remove all highlighting
      case "cleanHighlight":
        cleanHighlight();
        break;

      default:
        console.log("unable to handle message request");

    }
  }
});

// respond with search data. unselect and unhighlight text for fieldName
function searchRequest(source, type, fieldName, text, itemIndex) {
  var field = fieldName;
  if (itemIndex !== undefined) {
    field += itemIndex;
  }

  cleanHighlight();
  cleanElementData(field);
  cleanFieldText(fieldName, itemIndex);

  var total = occurrences(document_text, text, true);

  if (total > 0 /*&& total < 5*/) {
    console.log(total + " instances of " + text + " found in document");

    searchText(text, field, total);
    findRelevantMatches(field, type);

    var results = getMatches(fieldName, itemIndex, type);
    var message = { "response": "searchResults", "results": results, "fieldName": fieldName, "itemIndex": itemIndex };
    console.log(message);
    source.postMessage(message, event.origin);
  } else {
    console.log("document search halted: " + total + " instances of " + text + " found in document");
  }
}

function sendReceipt(saved_data, rows) {
  console.log(rows);
  if (incomingPort !== undefined && incomingPort !== null) {
    // clean html data
    cleanHighlight();
    cleanElementData();

    var message_domain;
    // default local html pages to DOMAIN (since no domain)
    if (document.domain === null || document.domain === "") {
      message_domain = "DOMAIN";
    } else {
      message_domain = document.domain;
    }

    // track deleted items for generated templates
    if (generated !== undefined && generated.hasOwnProperty("templates") && generated.templates.hasOwnProperty("items"))
    {
      $.each(generated.templates.items, function(key, value)
      {
        var int_key = parseInt(key);
        console.log(rows);
        if (!isNaN(int_key) && rows[int_key] === null)
        {
          generated.templates.items[key].deleted = true;
        }
      });
    }

    // compose message
    var message = {
      request: "saveReceipt",
      html: document.body.outerHTML,
      url: location.href,
      domain: message_domain,
      attributes: attributes,
      generated: generated,
      saved_data: saved_data
    };
    console.log(message);
    incomingPort.postMessage(message);
  }

  // clean receipt data
  cleanFieldText();
}
