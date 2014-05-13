var amazon = false;
var htmlGet = "pull-off";
var incomingPort;
var lastClicked;
var mouseDownElement;
var TEXT_ID = "-!_!-";
var CLASS_NAME = "TwoReceipt";
 
$(document).ready(function() {
	if (self === top)
	{
		console.log("document ready");
	}
	
  // set highlight css style
  var style = document.createElement("style");
  style.innerHTML = ".highlighted { background-color: yellow; }";
  document.getElementsByTagName("head")[0].appendChild(style);
  
  //findMatches("Amazon");
  searchAndHighlight("amazon", 'body', 'highlighted', true)
  console.log($(".highlighted"));
  
	// only run function when user prompts to start, so links keep working
	$(document).click(function(event) {
		lastClicked = $(event.target);
		if (htmlGet != "pull-off")
		{
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
          if (parentElement.parent().length != 0 && linkSelected == false) {
            parentElement = parentElement.parent();
            if (parentElement[0].tagName == "BUTTON" || parentElement[0].tagName == "A") {
              linkSelected = true;
            }
          } else {
            break;
          }
        }
      }
      
			// only send message if nothing selected
			if (linkSelected == true || window.getSelection().toString() === "" || element[0].tagName === "BODY")
			{
				element[0].className += " " + CLASS_NAME;
				
        var message_domain;
        if (document.domain == null || document.domain == "") {
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
    var parentElement = mouseDownElement;
    if (parentElement !== null) {
      for (var index = 0; index < 3; index++) {
        if (parentElement.parent().length != 0) {
          parentElement = parentElement.parent();
          if (parentElement[0].tagName == "BUTTON" || parentElement[0].tagName == "A") {
            return false;
          }
        } else {
          break;
        }
      }
    }
    
		// only send message if text is selected or user did not click link
		if (textSelection != "" && mouseDownElement !== null && mouseDownElement[0].tagName !== "A"
          && mouseDownElement[0].tagName !== "BUTTON" && mouseDownElement[0].tagName !== "BODY") {
			if (htmlGet != "pull-off") {
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
        if (document.domain == null || document.domain == "") {
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
				
				// startContainer deletion first so we can use existing endOffset
				if (startContainer.nodeType === Node.TEXT_NODE) {
					startContainer.deleteData(startOffset, TEXT_ID.length);
				} else {
					var removeNode = startContainer.childNodes[0];
					startContainer.removeChild(removeNode);
				}
				if (endContainer.nodeType === Node.TEXT_NODE) {
					endContainer.deleteData(endOffset, TEXT_ID.length);
				} else {
					var removeNode = endContainer.childNodes[endContainer.childNodes.length - 1];
					endContainer.removeChild(removeNode);
				}
			}
		}
	});
  
  	
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
	
	// append iframe notification within div to body
	var div = document.createElement("div");
	div.id = "notificationdiv";
	div.setAttribute("style", "top: 0px; left: 0px; height: 1px; width: 100%; position: fixed; background-color: black; z-index: 1000000099; visibility: visible; position");
	var iframe = document.createElement("iframe");
	iframe.id = "twoReceiptIFrame";
	iframe.className = "twoReceiptIFrame";
	iframe.scrolling = "no";
	iframe.style.width = "100%";
	iframe.setAttribute("style", 'height: 27px; border: 0px;');
	iframe.src = chrome.extension.getURL("/notification/notificationbar.html");
	div.appendChild(iframe);
	document.documentElement.appendChild(div);
	
	document.documentElement.style.paddingTop = "27px";
}

// long-lived connection from background
chrome.runtime.onConnect.addListener(function(port) {
	// connect if not an iframe
	if (self == top)
	{
		console.log("Connected to port: " + port.name);
		console.assert(port.name == "newReceipt");
		incomingPort = port;
    
    var message_domain;
    if (document.domain == null || document.domain == "") {
      message_domain = "DOMAIN";
    } else {
      message_domain = document.domain;
    }
    
		port.onMessage.addListener(function(msg) {
      console.log("Received msg: " + msg.request + " for port: " + port.name);
      if (msg.request == "initializeData") {
        var msg_data = {
					response: msg.request,
					html: document.body.outerHTML,
					url: location.href,
					domain: message_domain
				};
				incomingPort.postMessage(msg_data);
      } else {
        htmlGet = msg.request;
      }
		});
		
		port.onDisconnect.addListener(function() {
			console.log("Disconnected port");
			incomingPort = null;
			htmlGet = "pull-off";
		});
	}
});

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		// do not load for iframe
		if (self == top)
		{
			console.log("received onMessage connection instead of port connect");
			if (request.greeting == "getHTML")
			{
				sendResponse({
					data: document.body.outerHTML,
					farewell: "sendHTML"
				});
			}
			// this is how lastpass does it, by adding a div and iframe element to the current page
			else if (request.greeting == "showNotification")
			{
				createNotification();
			}
		}
		else
		{
			console.log("IFRAME (nothing run) - received onMessage connection instead of port connect");
		}
});
	
window.addEventListener("message", function(event) {
  if (event.origin.indexOf("chrome-extension://") != -1)
  {
    console.log(event.data);
    var notdiv = document.getElementById("notificationdiv");
    notdiv.parentNode.removeChild(notdiv);
    
    document.documentElement.style.paddingTop = "0px";
          
    if (event.data == "yes")
    {

    }
    else if (event.data == "no")
    {
      
    }
    else if (event.data == "x")
    {
      
    }
    else
    {
      // message from iframe, element clicked
      if (htmlGet != "pull-off" && self !== top)
      {
        console.log(event.data);
        window.parent.postMessage(event.data, '*');
      }
      // format of htmlGet = pull-date, pull-transaction, etc. send response if not off
      else if (htmlGet.indexOf("pull-") != -1 && htmlGet.indexOf("off") == -1)
      {
        var msg_data = JSON.parse(event.data);
        incomingPort.postMessage(msg_data);
      }
    }
  }
});

// source: http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript/3561711#3561711
// escape special characters in regex
RegExp.escape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

// source: http://teeohhem.com/2011/02/20/search-for-and-highlight-text-on-a-page-with-jquery/

// html element will be child-most - iterate direction

// rules: 
// elements hold locations of possible selections
// template on-submit?
// keep elements for selected text - use for template on-submit
  // defining custom html tag - html5 only? http://www.html5rocks.com/en/tutorials/webcomponents/customelements/
// - start & number, end & number
// - if no longer selected - start & field, end & field
// mark highlights text (can be over multiple elements)
// when un-select text field, remove marks
// does mark work on non-html5 pages
// on highlight - remove all other mark elements and create new one & on submit

// on-submit
// generate templates & remove element place-holders
// pass main page data over (html, domain, url)
// will html have TEXT_ID and class? - class can be TwoReceipt-attribute (modify aServer accordingly)
// TEXT_ID cannot have
// custom element markers - ORDER & LEVEL messed up, also needs to be the only marker at the time?
// when searching element markers, instead of searching for TEXT_ID, we know exactly where the text starts and ends
// remove the elements in aServer before saving template, so template is accurate

// functions:
// 1) searchText - returns a reference list of all elements that contain text of element
// 2) findRelevantMatches - appends temp elements at all probable text options and returns a reference list of all temp elements storing text options
                        // - always include the exact match to text that user has entered
// 3) highlightSelection - highlights selected text
// 4) unhighlightSelection - removes all highlight tags
// 5) setFieldText - sets elements to surround selected text for field (replacing relevant match temp element)
                // - possible for user to set text that isnt found on html, no template
// 6) clearTextOptions - empties searched list and removes all temp elements
// 7) setTemplates - send data for individual templates back to eventPage
// 8) cleanHtml - run on submit, unhighlightSelection(), clearTextOptions(), setTemplates()
// 9) sendPageData - sends html, domain, url to eventPage

function searchAndHighlight(searchTerm, selector, highlightClass, removePreviousHighlights) {
  if (searchTerm) {
    //var wholeWordOnly = new RegExp("\\g"+searchTerm+"\\g","ig"); //matches whole word only
    //var anyCharacter = new RegExp("\\g["+searchTerm+"]\\g","ig"); //matches any word with any of search chars characters
    var selector = selector || "body",                             //use body as selector if none provided
      searchTermRegEx = new RegExp("("+RegExp.escape(searchTerm)+")","gi"),
      matches = 0,
      helper = {};
    helper.doHighlight = function(node, searchTerm){
      if(node.nodeType === 3) {
        if(node.nodeValue.match(searchTermRegEx)){
          matches++;
          var tempNode = document.createElement('span');
          tempNode.innerHTML = node.nodeValue.replace(searchTermRegEx, "<span class='"+highlightClass+"'>$1</span>");
          node.parentNode.insertBefore(tempNode, node);
          node.parentNode.removeChild(node);
        }
      }
      else if(node.nodeType === 1 && node.childNodes && !/(style|script)/i.test(node.tagName)) {
        $.each(node.childNodes, function(i,v){
          helper.doHighlight(node.childNodes[i], searchTerm);
        });
      }
    };
    // this is fine if 2 classes are added - 1 for highlight, 1 to define text field/searchTerm
    if(removePreviousHighlights) {
      $('.'+highlightClass).removeClass(highlightClass);     //Remove old search highlights
    }

    $.each($(selector).children(), function(index,val){
      helper.doHighlight(this, searchTerm);
    });
    return matches;
  }
  return false;
}

// example of use
/*$(document).ready(function() {
    $('#search-button').on("click",function() {
        if(!searchAndHighlight($('#search-term').val(), "#bodyContainer", '.highlighted')) {
            alert("No results found");
        }
    });
});*/

// source: http://ask.metafilter.com/35120/Regex-Text-from-HTML-no-attributes
/*function cleanWhitespace( element ) {
  // If no element is provided, do the whole HTML document
  element = element || document;
  // Use the first child as a starting point
  var cur = element.firstChild;

  // Go until there are no more child nodes
  while ( cur != null ) {

    // If the node is a text node, and it contains nothing but whitespace
    if ( cur.nodeType == 3 && ! /\S/.test(cur.nodeValue) ) {
      // Remove the text node
      element.removeChild( cur );

    // Otherwise, if it’s an element
    } else if ( cur.nodeType == 1 ) {
      // Recurse down through the document
      cleanWhitespace( cur );
    }

    cur = cur.nextSibling; // Move through the child nodes
  }
}

The second generic function is text. This function retreives the text contents of an element. Calling text(Element) will return a string containing the combined text contents of the element and all child elements that it contains.
function text(e) {
  var t = "";

  // If an element was passed, get it’s children, 
  // otherwise assume it’s an array
  e = e.childNodes || e;

  // Look through all child nodes
  for ( var j = 0; j < e.length; j++ ) {
    // If it’s not an element, append its text value
    // Otherwise, recurse through all the element’s children 
    t += e[j].nodeType != 1 ? e[j].nodeValue : text(e[j].childNodes);
  }

  // Return the matched text
  return t;
}*/


// return a list of deepest elements containing exact matches to input_string
/*function findMatches(input_string) {
  var matches_found = [];
  var items = $(":contains('" + input_string + "')");
  console.log(items);
  
  // result is true if other elements in the array are nested within element
  for (var index = 0; index < items.length; index++) {
    var result = false;
    for (var next_index = index + 1; next_index < items.length; next_index++) {
      var result = $.contains(items.eq(index)[0], items.eq(next_index)[0]);
      if (result) {
        break;
      }
    }
    
    // keep element that does not contain other elements
    if (!result) {
      items.eq(index).css("text-decoration", "underline");
      console.log(items.eq(index).text());
      matches_found.push(items.eq(index));
    }
  }
  console.log(matches_found);
  
  return matches_found;
}

// source: http://stackoverflow.com/questions/19259029/using-jquery-is-there-a-way-to-find-the-farthest-deepest-or-most-nested-child
$.fn.findDeepest = function() {
    var results = [];
    this.each(function() {
        var deepLevel = 0;
        var deepNode = this;
        treeWalkFast(this, function(node, level) {
            if (level > deepLevel) {
                deepLevel = level;
                deepNode = node;
            }
        });
        results.push(deepNode);
    });
    return this.pushStack(results);
};

var treeWalkFast = (function() {
    // create closure for constants
    var skipTags = {"SCRIPT": true, "IFRAME": true, "OBJECT": true, "EMBED": true};
    return function(parent, fn, allNodes) {
        var node = parent.firstChild, nextNode;
        var level = 1;
        while (node && node != parent) {
            if (allNodes || node.nodeType === 1) {
                if (fn(node, level) === false) {
                    return(false);
                }
            }
            // if it's an element &&
            //    has children &&
            //    has a tagname && is not in the skipTags list
            //  then, we can enumerate children
            if (node.nodeType === 1 && node.firstChild && !(node.tagName && skipTags[node.tagName])) {                
                node = node.firstChild;
                ++level;
            } else if (node.nextSibling) {
                node = node.nextSibling;
            } else {
                // no child and no nextsibling
                // find parent that has a nextSibling
                --level;
                while ((node = node.parentNode) != parent) {
                    if (node.nextSibling) {
                        node = node.nextSibling;
                        break;
                    }
                    --level;
                }
            }
        }
    }
})();*/

/*var deeps = $(".start").findDeepest();

deeps.each(function(i,v){
    $("#results").append(
        $("<li>").html($(v).prop("tagName") + " " + $(v).html())
    );
});*/