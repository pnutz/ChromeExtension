var htmlGet = "pull-off",
incomingPort,
lastClicked,
mouseDownElement,
TEXT_ID = "-!_!-",
CLASS_NAME = "TwoReceipt",
search_terms = {};

$(document).ready(function() {
	if (self === top)
	{
		console.log("document ready");
	}
	
  // set highlight css style
  var style = document.createElement("style");
  style.innerHTML = ".highlighted { background-color: yellow; }";
  document.getElementsByTagName("head")[0].appendChild(style);
  
  var children = $("body")[0].childNodes;
  console.log(children);
  
  //searchAndHighlight("Amazon", "body", "highlighted");
  
  clean(document.body);
  var document_text = getDocumentText();
  console.log(document_text);
  
  // find how many instances of search_term exist in document
  var search_word = "digital";
  var count = occurrences(document_text, search_word, true);
  if (count > 0) {
    search_terms["vendor"] = searchText(search_word, "vendor", count);
    console.log(search_terms["vendor"]);
    console.log(findMatchText("vendor", 0));
    
    console.log($("[data-tworeceiptsearch]"));
  }
  
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
	if (self === top)
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
			if (request.greeting === "getHTML")
			{
				sendResponse({
					data: document.body.outerHTML,
					farewell: "sendHTML"
				});
			}
			// this is how lastpass does it, by adding a div and iframe element to the current page
			else if (request.greeting === "showNotification")
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
  if (event.origin.indexOf("chrome-extension://") !== -1)
  {
    console.log(event.data);
    var notdiv = document.getElementById("notificationdiv");
    notdiv.parentNode.removeChild(notdiv);
    
    document.documentElement.style.paddingTop = "0px";
          
    if (event.data === "yes")
    {

    }
    else if (event.data === "no")
    {
      
    }
    else if (event.data === "x")
    {
      
    }
    else
    {
      // message from iframe, element clicked
      if (htmlGet !== "pull-off" && self !== top)
      {
        console.log(event.data);
        window.parent.postMessage(event.data, '*');
      }
      // format of htmlGet = pull-date, pull-transaction, etc. send response if not off
      else if (htmlGet.indexOf("pull-") !== -1 && htmlGet.indexOf("off") === -1)
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
// how will i find the selected text? i know the element html that contains the start/end elements
// main html will have this removed

// functions:
// 1) searchText - returns a reference list of all elements that contain text of element (nodes?)
                // - needs to take into account text that traverses multiple nodes
// 2) findExistingMatch - enter field/index of search and find key-value pair & return element
// 2) findRelevantMatches - appends temp elements at all probable text options and returns a reference list of all temp elements storing text options
                        // - always include the exact match to text that user has entered
// 3) highlightSelection - highlights selected text
// 4) unhighlightSelection - removes all highlight tags
// 5) setFieldText - sets elements to surround selected text for field (replacing relevant match temp element)
                // - possible for user to set text that isnt found on html, no template
// 6) clearTextOptions - empties searched list and removes all temp elements
                // should i maintain temp elements for each text field? to retain last search
// 7) setTemplates - send data for individual templates back to eventPage
// 8) sendPageData - run on submit, unhighlightSelection(), clearTextOptions(), sendTemplates(), sends html, domain, url to eventPage

// what i want to do: find all text & append unique tags before/after all text
// generate relevant match options around text (and append unique tags for each)
// set element parent (marked) for highlighting if user selects

// find all instances of search_term in the document and create field element before and after text locations
// returns a list of generated start tags that contain the search_term
function searchText(search_term, field, total) {
  var search_elements = {},
      params = {
                  "text_nodes": [],
                  "search_term": search_term,
                  "search_elements": search_elements,
                  "field": field,
                  "total": total,
                  "count": 0,
                  "text": "",
                  // holds last valid index
                  "current_index": -1,
                  "result": true
                };
  
  // iterate through all children of body element
  var children = $("body")[0].childNodes;
  $.each(children, function(index,val) {
    params = iterateText(children[index], findMatch, params);
    search_elements = params.search_elements;
    
    if (params.result === false) {
      return false;
    }
  });

  return search_elements;
}

/* params: text_nodes - array of all text nodes iterated through
*          search_term - search term to match
*          search_elements - parent elements of found search terms
*          field - text field we are matching for
*          total - total # of matches found
*          count - current # of matches found
*          text - total plain-text of all passed text nodes
*          current_index - holds last valid index
*/
function findMatch(node, params) {
  var node_value = node.nodeValue.trim(),
      text_nodes = params.text_nodes,
      search_term = params.search_term,
      search_elements = params.search_elements,
      field = params.field,
      total = params.total,
      count = params.count,
      text = params.text,
      current_index = params.current_index;
  
  if (text === "") {
    text = node_value;
  } else {
    text += " " + node_value;
  }
  text_nodes.push(node);

  // if search_term is found, current text node is the end node for one count
  var index = text.toLowerCase().indexOf(search_term.toLowerCase(), current_index + 1);
  
  // stores the number of characters the start of search_term is from the end of text
  var characters_from_end = text.length - index;
  console.log("characters from end: " + characters_from_end);
  
  // loop through text node in case there is more than one search_term instance in text
  while (index !== -1) {
    current_index = index;
    
    // remember how many text nodes before current node we are pulling from text_nodes
    var text_nodes_back_index = text_nodes.length - 2;
    // text_selection will contain a combined string of all text nodes where current search_term spans over
    var text_selection = node_value;
    var start_node;
    
    // set text_selection to contain prevSibling text nodes until the current search_term matches 
    while (text_selection.length < characters_from_end) {
      console.log("text_selection.length: " + text_selection.length + " < " + characters_from_end);
      console.log("old text_selection: " + text_selection);
      text_selection = text_nodes[text_nodes_back_index].nodeValue.trim() + " " + text_selection;
      text_nodes_back_index--;
    }
    // start_node contains beginning of search_term and node contains end of search_term
    start_node = text_nodes[text_nodes_back_index + 1];
    console.log("final text_selection: " + text_selection);

    // find index search_term starts on in text node (or prevSibling)
    var start_index = text_selection.toLowerCase().indexOf(search_term.toLowerCase());
    if (start_index !== -1) {
      // set parent as first element parent of text_node
      var end_parent = node.parentNode;
      while (end_parent.nodeType !== 1) {
        end_parent = end_parent.parentNode;
      }
      end_parent = $(end_parent);
      console.log("end parent");
      console.log($(end_parent));
      
      var start_parent = start_node.parentNode;
      while (start_parent.nodeType !== 1) {
        start_parent = start_parent.parentNode;
      }
      start_parent = $(start_parent);
      console.log("start parent");
      console.log(start_parent);
      
      // TEST CASES WHERE NOT EQUAL!
      
      var target_parent;
      // start and end parents are the same
      if (start_parent[0] === end_parent[0]) {
        target_parent = start_parent;
      }
      // start parent is target parent element
      else if ($.contains(start_parent, end_parent)) {
        target_parent = start_parent;
      }
      // end parent is target parent element
      else if ($.contains(end_parent, start_parent)) {
        target_parent = end_parent;
      }
      // neither parents contain one another
      else {
        // iterate upwards until start_parent contains end_parent
        while (!$.contains(start_parent, end_parent)) {
          start_parent = start_parent.parent();
        }
        target_parent = start_parent;
      }
      console.log("target parent");
      console.log(target_parent);
      
      start_node = text_nodes[text_nodes_back_index];
      var start_element = $(start_node.parentNode);
      // continue adding text length to start_index until parent elements are not contained in target_parent
      while ($.contains(target_parent, start_element) || target_parent[0] === start_element[0]) {
        start_index += start_node.nodeValue.trim().length + 1;
        text_nodes_back_index--;
        start_node = text_nodes[text_nodes_back_index];
        start_element = $(start_node.parentNode);
      }
      
      // find index search_term ends on in text node
      var end_index = start_index + search_term.length;
      console.log("start index: " + start_index);
      console.log("end index: " + end_index);
      
      // if a class for field search already exists, use that instead
      console.log("data field");
      console.log(target_parent.attr("data-tworeceiptsearch"));
      if (target_parent.attr("data-tworeceiptsearch") !== undefined) {
        search_elements[count] = {
          start: start_index,
          end: end_index,
          data: target_parent.attr("data-tworeceiptsearch")
        };
      } else {
        var data_field = field + "-" + count;
        search_elements[count] = {
          start: start_index,
          end: end_index,
          data: data_field
        };
        target_parent.attr("data-tworeceiptsearch", data_field);
      }
      
      count++;
      
      // what if sanitization removes an element that has class?...
      
      // clean function - iterate through all k-v stores for attribute and remove class/data attr
      // .data("tworeceiptsearch") or .attr("data-tworeceiptsearch")
      
      // issue: hidden elements - $.is(":visible")
      // list of parent elements, when checking which to allow selection for, check if visible before displaying on list
      
    } else {
      console.log(text_selection);
      console.log(search_term);
    }
    
    index = text.toLowerCase().indexOf(search_term.toLowerCase(), current_index + 1);
    characters_from_end = text.length - index;
    
    if (count === total) {
      console.log("Completed calculations for all matched search_terms");
      return {
              "text_nodes": text_nodes,
              "search_term": search_term,
              "search_elements": search_elements,
              "field": field,
              "total": total,
              "count": count,
              "text": text,
              "current_index": current_index,
              "result": false
            };
    }
  }
  return {
            "text_nodes": text_nodes,
            "search_term": search_term,
            "search_elements": search_elements,
            "field": field,
            "total": total,
            "count": count,
            "text": text,
            "current_index": current_index,
            "result": true
          };
}

// find parent element stored on search_terms
function findMatchElement(field, index) {
  return $("[data-tworeceiptsearch='" + search_terms[field][index].data + "']");
}

// find exact matched text stored on search_terms
function findMatchText(field, index) {
  var element = findMatchElement(field, index),
      start_index = search_terms[field][index].start,
      end_index = search_terms[field][index].end,
      params = { "text": "" };
  
  // iterate through all children of element
  var children = element[0].childNodes;
  $.each(children, function(index,val) {
    // get element text to match indices
    params = iterateText(children[index], addText, params);
  });
  
  var text = params.text.substring(start_index, end_index);
  return text;
}

// params: text - total plain-text of all passed text nodes
function addText(node, params) {
  var text = params.text;
  if (text === "") {
    text = node.nodeValue.trim();
  } else {
    text += " " + node.nodeValue.trim();
  }
  return { "text": text }
}

function iterateText(node, method, method_params) {
  if (node.nodeType === 3) {
    method_params = method(node, method_params);
  }
  else if (node.nodeType === 1 && node.childNodes && !/(style|script)/i.test(node.tagName)) {
    $.each(node.childNodes, function(i,v) {
      method_params = iterateText(node.childNodes[i], method, method_params);
    });
  }
  return method_params;
}

function searchAndHighlight(searchTerm, selector, highlightClass, removePreviousHighlights) {
  if (searchTerm) {
    //var wholeWordOnly = new RegExp("\\g"+searchTerm+"\\g","ig"); //matches whole word only
    //var anyCharacter = new RegExp("\\g["+searchTerm+"]\\g","ig"); //matches any word with any of search chars characters
    var selector = selector || "body",                             //use body as selector if none provided
      searchTermRegEx = new RegExp("("+RegExp.escape(searchTerm)+")","gi"),
      matches = [],
      helper = {};

    // iterates through all nodes in dom, checking text nodes for search matches
    helper.doHighlight = function(node, searchTerm){
      if(node.nodeType === 3) {
        if(node.nodeValue.match(searchTermRegEx)){
          var tempNode = document.createElement('span');
          tempNode.innerHTML = node.nodeValue.replace(searchTermRegEx, "<test class='hihi'></test><span class='"+highlightClass+"'>$1</span>");
          node.parentNode.insertBefore(tempNode, node);
          node.parentNode.removeChild(node);
          matches.push(tempNode);
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

    // iterate through all children of body element
    var children = $(selector)[0].childNodes;
    $.each(children, function(index,val){
      helper.doHighlight(children[index], searchTerm);
    });
    return matches;
  }
  return false;
}

// source: http://www.sitepoint.com/removing-useless-nodes-from-the-dom/
function clean(node) {
  for (var n = 0; n < node.childNodes.length; n++) {
    var child = node.childNodes[n];
    if (child.nodeType === 8 || (child.nodeType === 3 && !/\S/.test(child.nodeValue))) {
      node.removeChild(child);
      n--;
    } else if(child.nodeType === 1) {
      clean(child);
    }
  }
}

// retrieves the text contents of an element
function getDocumentText(e) {
  var selector = e || "body",
      text = "",
      helper = {};
    
    helper.addText = function(node) {
      if (node.nodeType === 3) {
        text += " " + node.nodeValue.trim();
      }
      else if (node.nodeType === 1 && node.childNodes && !/(style|script)/i.test(node.tagName)) {
        $.each(node.childNodes, function(i,v){
          helper.addText(node.childNodes[i]);
        });
      }
    };

    // iterate through all children of body element
    var children = $(selector)[0].childNodes;
    $.each(children, function(index,val) {
      helper.addText(children[index]);
    });
    return text;
}

// source: http://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string
/** Function count the occurrences of substring in a string; not case sensitive
 * @param {String} string   Required. The string;
 * @param {String} subString    Required. The string to search for;
 * @param {Boolean} allowOverlapping    Optional. Default: false;
 */
function occurrences(string, subString, allowOverlapping){

    string+="", subString+="";
    string = string.toLowerCase();
    subString = subString.toLowerCase();
    
    if(subString.length<=0) return string.length+1;

    var n=0, pos=0;
    var step=(allowOverlapping)?(1):(subString.length);

    while(true){
        pos=string.indexOf(subString,pos);
        if(pos>=0){ n++; pos+=step; } else break;
    }
    return(n);
}