var incomingPort,
    lastClicked,
    mouseDownElement,
    itemRowGen,
    generated = {},
    documentText,
    elementPath,
    savedData,
    receipt;

$(document).ready(function () {
	if (self === top) {
		console.log("document ready");
  }
});

function createNotification() {

  if (documentText == null) {
    documentText = initializeContentSearch();
  }

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

    var messageDomain;
    if (document.domain === null || document.domain === "") {
      messageDomain = "DOMAIN";
    } else {
      messageDomain = document.domain;
    }

    port.onMessage.addListener(function(msg) {
      console.log("Received msg: " + msg.request + " for port: " + port.name);
      // receive receipt notification-related messages
      if (port.name === "receiptPort") {
        switch (msg.request) {
          // send basic page data so aServer can generate data
          case "initializeReceipt":
            var msgData = {
              request: msg.request,
              html: document.body.outerHTML,
              url: location.href,
              domain: messageDomain
            };

            createNotification();

            // delay response so generated data comes later (handsontable not fully generated yet)
            setTimeout(function() {
              incomingPort.postMessage(msgData);
            }, 400);
            break;

          // receive generated data
          case "generatedData":
            generated = msg.generated;

            // send generated data to receipt notification
            document.getElementById('twoReceiptIFrame').contentWindow.postMessage(msg, "*");
            break;

          case "takeSnapshot":
            // try hard-copying jquery to get parent isolated from DOM, so DOM is not messed up with canvas
            var parent = elementPath.element;
            console.log(parent);

            /*
            set image size to 1/3 original size OR set CSS sizes to 300% before rendering
            http://stackoverflow.com/questions/18316065/set-quality-of-png-with-html2canvas
            */

            if (parent != null) {
              parent = ElementPath.getParentContainer(parent);
              console.log(parent);

              // this messes up the page dom, so only run at the end of the receipt submission
              html2canvas(parent[0], {
                onrendered: function(canvas) {
                  //var data = canvas.toDataURL("image/gif").replace("image/jpeg", "image/octet-stream");
                  //window.location.href = data;
                  //document.body.appendChild(canvas);

                  receipt.savedData.snapshot = canvas.toDataURL("image/png");
                  sendReceipt();
                }
              });
            }
            // no parent element, so send entire document
            else {
              // this messes up the page dom, so only run at the end of the receipt submission
              html2canvas($("body")[0], {
                onrendered: function(canvas) {
                  receipt.savedData.snapshot = canvas.toDataURL("image/png");
                  sendReceipt();
                }
              });
            }
            break;

          case "getFolders":
            console.log(msg.folderData);

            var message = { request: "getFolders", folderData: msg.folderData };
            document.getElementById('twoReceiptIFrame').contentWindow.postMessage(message, '*');
            break;

          case "getCurrencies":
            console.log(msg.currencyData);

            var message = { request: "getCurrencies", currencyData: msg.currencyData };
            document.getElementById('twoReceiptIFrame').contentWindow.postMessage(message, '*');
            break;
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
    console.log("running listener function for " + request.request);
		// do not load for iframe
		if (self === top) {
      switch (request.request) {
        // retrieve url & domain
        case "checkUrl":
          var messageDomain;
          if (document.domain === null || document.domain === "") {
            messageDomain = "DOMAIN";
          } else {
            messageDomain = document.domain;
          }

          var msgData = {
            request: request.request,
            url: location.href,
            domain: messageDomain
          };
          sendResponse(msgData);
          break;

        // get page html
        case "getHTML":
          sendResponse({
            data: document.body.outerHTML,
            farewell: "sendHTML"
          });
          break;

        // this is how lastpass does it, by adding a div and iframe element to the current page
        case "showNotification":
          createNotification();
          break;
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

      case "getFolders":
        incomingPort.postMessage({ request: "getFolders" });
        break;

      case "getCurrencies":
        incomingPort.postMessage({ request: "getCurrencies" });
        break;

      // user submitted receipt, send all data to eventPage
      case "saveReceipt":
        if (event.data.savedData != null) {
          var notdiv = document.getElementById("notificationdiv");
          prepareReceipt(event.data.savedData, event.data.rows, event.data.parent);
          document.getElementsByTagName("body")[0].style.paddingTop = "0px";
          notdiv.parentNode.removeChild(notdiv);
        }
        break;

      // close notification bar
      case "closeReceipt":
        var notdiv = $("#notificationdiv")[0];
        document.getElementsByTagName("body")[0].style.paddingTop = "0px";
		    notdiv.parentNode.removeChild(notdiv);

        cleanHighlight();
        cleanElementData();
        cleanFieldText();
        break;

      // user requests search
      case "searchText":
        if (event.data.fieldName != null && event.data.text != null) {
          searchRequest(event.source, "text", event.data.fieldName, event.data.text, event.data.itemIndex);
        }
        break;

      // user requests numeric search
      case "searchNumber":
        // if row element exists, apply sorted search
        if (event.data.fieldName != null && event.data.text != null &&
               event.data.itemIndex != null && itemRowGen != null && event.data.itemIndex === itemRowGen.rowIndex) {

          var field = event.data.fieldName + event.data.itemIndex;
          var element = itemRowGen.getRowElement();
          if (element != null) {
            sortedSearchRequest(event.source, "number", event.data.fieldName, event.data.text, event.data.itemIndex, element);
          } else {
            searchRequest(event.source, "number", event.data.fieldName, event.data.text, event.data.itemIndex);
          }
        } else if (event.data.fieldName != null && event.data.text != null) {
          searchRequest(event.source, "number", event.data.fieldName, event.data.text, event.data.itemIndex);
        }

        // problem with this is the user can still be typing.. for now the user needs to create template for each field in row
        /*if (event.data.itemIndex != null && itemRowGen != null && event.data.itemIndex === itemRowGen.rowIndex) {
          ======generateRows();
        }*/
        break;

      case "searchMoney":
        // if row element exists, apply sorted search
        if (event.data.fieldName != null && event.data.text != null &&
               event.data.itemIndex != null && itemRowGen != null && event.data.itemIndex === itemRowGen.rowIndex) {

          var field = event.data.fieldName + event.data.itemIndex;
          var element = itemRowGen.getRowElement();
          if (element != null) {
            sortedSearchRequest(event.source, "money", event.data.fieldName, event.data.text, event.data.itemIndex, element);
          } else {
            searchRequest(event.source, "money", event.data.fieldName, event.data.text, event.data.itemIndex);
          }
        } else if (event.data.fieldName != null && event.data.text != null) {
          searchRequest(event.source, "money", event.data.fieldName, event.data.text, event.data.itemIndex);
        }

        // problem with this is the user can still be typing.. for now the user needs to create template for each field in row
        /*if (event.data.itemIndex != null && itemRowGen != null && event.data.itemIndex === itemRowGen.rowIndex) {
          =======generateRows();
        }*/
        break;

      // user focused on search, highlight selected area
      case "highlightSearchText":
        if (event.data.fieldName != null) {
          cleanHighlight();
          var field = event.data.fieldName;
          if (event.data.itemIndex != null) {
            field += event.data.itemIndex;
          }
          highlightMatchText(field, event.data.value);
        }
        break;

      // user selected search, highlight, and set field text
      case "selectText":
        if (event.data.fieldName != null && event.data.value != null) {
          cleanHighlight();
          cleanFieldText(event.data.fieldName, event.data.itemIndex);

          var field = event.data.fieldName;
          if (event.data.itemIndex != null) {
            // initialize itemRowGen if it doesn't exist or if selected field is 'newer' than existing
            if (itemRowGen == null || event.data.itemIndex > itemRowGen.rowIndex) {
              itemRowGen = new ItemRowGen(event.data.itemIndex);
            }
            field += event.data.itemIndex;
          }

          var element = getMatchElement(field, event.data.value);
          var start = getSearchTermProperty(field, "start", event.data.value);
          var end = getSearchTermProperty(field, "end", event.data.value);
          var startNodeIndex = getSearchTermProperty(field, "startNodeIndex", event.data.value);
          setFieldText(element, start, end, event.data.fieldName, event.data.itemIndex, startNodeIndex);

          if (event.data.itemIndex != null && event.data.itemIndex === itemRowGen.rowIndex) {
            var endNodeIndex = getSearchTermProperty(field, "endNodeIndex", event.data.value);
            itemRowGen.setRowData(event.data.fieldName, event.data.itemIndex, element, start, end, startNodeIndex, endNodeIndex);

            // before generating rows, make sure current handsontable row is filled out
            event.source.postMessage({ request: "getRowData", itemIndex: event.data.itemIndex }, event.origin);
          }

          highlightAttributeText(event.data.fieldName, event.data.itemIndex);
        }
        break;

      // user focuses on notification text field, highlight attribute data if it exists
      case "highlightText":
        cleanHighlight();
        if (event.data.fieldName != null) {
          highlightAttributeText(event.data.fieldName, event.data.itemIndex);
        }
        break;

      // user lost focus on notification text field, remove all highlighting
      case "cleanHighlight":
        cleanHighlight();
        break;

      // DEPRECIATED WITH AUTOMATIC GENERATION IMPLEMENTED
      // generate new receipt item using itemRowGen
      /*case "getItemRows":
        console.log(itemRowGen);
        if (itemRowGen != null) {
          var message = itemRowGen.generateNextRow();
          if (message !== false && message !== true) {
            message.request = "newItemRows";
            event.source.postMessage(message, event.origin);
          }
        }
        break;*/

      // returned item row to ensure it is filled out before generating item rows
      case "returnRowData":
        if (event.data.data != null && event.data.data.index === itemRowGen.rowIndex) {
          generateRows(event);
        }
        break;

      default:
        console.log("unable to handle message request");
    }
  }
});

// check if all row attributes are filled out and return generated rows to handsontable
function generateRows(event) {
  var row = event.data.data;
  var keys = Object.keys(row);
  var rowValid = true;
  if (keys.length > 1) {
    for (var i = 0; i < keys.length; i++) {
      if (row[keys[i]] == null || row[keys[i]].length === 0) {
        rowValid = false;
        console.log(keys[i] + " blank");
        break;
      }
    }
  } else {
    rowValid = false;
  }

  if (rowValid) {
    var message = itemRowGen.generateAllNextRows();
    message.request = "newItemRows";
    event.source.postMessage(message, event.origin);
  }
}

// respond with sorted search data. unselect and unhighlight text for fieldName
function sortedSearchRequest(source, type, fieldName, text, itemIndex, rowElement) {
  var field = fieldName;
  if (itemIndex != null) {
    field += itemIndex;
  }

  console.log("----------SORTED SEARCH REQUEST " + field + "-----------");

  cleanHighlight();
  cleanElementData(field);
  cleanFieldText(fieldName, itemIndex);

  var searchResults = searchOrderedText(text, field, rowElement[0]);
  searchTerms[field] = searchResults.results;
  searchTerms[field].count = searchResults.count;

  findSortedRelevantMatches(field, type);

  var results = getMatches(field, itemIndex, type);
  if (results.length > 0) {
    var message = { request: "searchResults", results: results, fieldName: fieldName, itemIndex: itemIndex };
    console.log(message);
    source.postMessage(message, event.origin);
    console.log(searchTerms);
  }
}

// respond with search data. unselect and unhighlight text for fieldName
function searchRequest(source, type, fieldName, text, itemIndex) {
  var field = fieldName;
  if (itemIndex != null) {
    field += itemIndex;
  }

  console.log("----------SEARCH REQUEST " + field + "-----------");

  cleanHighlight();
  cleanElementData(field);
  cleanFieldText(fieldName, itemIndex);

  var total = occurrences(documentText, text, true);

  if (total > 0) {
    console.log(total + " instances of " + text + " found in document");

    searchText(text, field, total);
    findRelevantMatches(field, type);

    var results = getMatches(field, itemIndex, type);
    var message = { request: "searchResults", results: results, fieldName: fieldName, itemIndex: itemIndex };
    console.log(message);
    source.postMessage(message, event.origin);
    console.log(searchTerms);
  } else {
    console.log("document search halted: " + total + " instances of " + text + " found in document");
  }
}

function prepareReceipt(data, rows, parent) {
  if (incomingPort != null) {
    // clean html data
    cleanHighlight();
    cleanElementData();

    // track deleted items for generated templates
    if (generated != null && generated.hasOwnProperty("templates") && generated.templates.hasOwnProperty("items")) {
      $.each(generated.templates.items, function(key, value) {
        var intKey = parseInt(key);
        if (!isNaN(intKey) && rows[intKey] === null) {
          generated.templates.items[key].deleted = true;
        }
      });
    }

    // set each attribute value to be its elementPath
    console.log("ATTRIBUTES");
    attributes = ElementPath.processAttributePaths(attributes);
    console.log(attributes);

    // calculate parent ElementPath for all templates in savedData
    var savedPath = new ElementPath();
    // path is calculated in element setter
    savedPath.element = ElementPath.getParentElement(data);

    // find parent element from generated elementPaths
    var generatedElementPath;
    $.each(generated, function(key, value) {
      console.log(key);
      console.log(generated[key]);
      console.log(data[key]);
      if (key !== "items" && key !== "templates" && key !== "elementPaths"
          && generated[key] === data[key]) {

        generatedElementPath = ElementPath.findParentElementPath(generatedElementPath, generated.elementPaths[key]);
        console.log("set parent element path");
        console.log(generatedElementPath);
      } else if (key === "items") {
        $.each(generated.items, function(itemKey, itemValue) {
          if (generated.templates.items[itemKey].deleted == null) {
            generatedElementPath = ElementPath.findParentElementPath(generatedElementPath, generated.elementPaths.items[itemKey]);
            console.log("set parent element path");
            console.log(generatedElementPath);
          }
        });
      }
    });

    console.log("savedData path comparison");
    savedPath.path = ElementPath.findParentElementPath(savedPath.path, generatedElementPath);
    console.log(savedPath);
    elementPath = savedPath;

    delete generated.elementPaths;

    var messageDomain;
    // default local html pages to DOMAIN (since no domain)
    if (document.domain === null || document.domain === "") {
      messageDomain = "DOMAIN";
    } else {
      messageDomain = document.domain;
    }

    // compose message
    receipt = {
      request: "saveReceipt",
      html: document.body.outerHTML,
      url: location.href,
      domain: messageDomain,
      attributes: attributes,
      generated: generated,
      savedData: data
    };

    incomingPort.postMessage({ request: "resizeWindow" });
  }

  // clean receipt data
  cleanFieldText();
}

function sendReceipt() {
  if (incomingPort != null) {
    console.log(receipt);
    incomingPort.postMessage(receipt);
  }
}

// only run function when user prompts to start, so links keep working
/*$(document).click(function(event) {
		lastClicked = $(event.target);`
		if (htmlGet !== "pull-off")	{
			var element = $(event.target);
      var elementText = element.text().trim();
			console.log("Element Clicked: " + elementText);

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

        var messageDomain;
        if (document.domain === null || document.domain === "") {
          messageDomain = "DOMAIN";
        } else {
          messageDomain = document.domain;
        }

        var first_text_id = document.createTextNode(TEXT_ID);
        var second_text_id = document.createTextNode(TEXT_ID);
        $("." + CLASS_NAME).prepend(first_text_id);
        $("." + CLASS_NAME).append(second_text_id);

				var msgData = {
					request: htmlGet.substring(5),
					selection: elementText.replace(/\n/g, ""),
					data: element[0].outerHTML,
					html: document.body.outerHTML,
					url: location.href,
					domain: messageDomain
				};

        // iframe, send it to main page content script
        if (self !== top) {
          window.parent.postMessage(JSON.stringify(msgData), '*');
        } else {
          incomingPort.postMessage(msgData);
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

        var messageDomain;
        if (document.domain === null || document.domain === "") {
          messageDomain = "DOMAIN";
        } else {
          messageDomain = document.domain;
        }

				var msgData = {
					request: htmlGet.substring(5),
					selection: textSelection.replace(/\n/g, ""),
					data: commonAncestorContainer.outerHTML,
					html: document.body.outerHTML,
					url: location.href,
					domain: messageDomain
				};

				console.log(msgData);
        // iframe, send it to main page content script
        if (self !== top) {
          window.parent.postMessage(JSON.stringify(msgData), '*');
        } else {
          incomingPort.postMessage(msgData);
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
				chrome.runtime.sendMessage({ request: "purchaseComplete" });
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
				chrome.runtime.sendMessage({ request: "purchaseComplete" });
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
