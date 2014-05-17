var htmlGet = "pull-off",
incomingPort,
lastClicked,
mouseDownElement,
TEXT_ID = "-!_!-",
CLASS_NAME = "TwoReceipt",
searchTerms = {};
 
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
  
  // find how many instances of searchTerm exist in document
  var count = occurrences(document_text, "amazon", true);
  if (count > 0) {
    searchTerms["vendor"] = searchText("amazon", "vendor", count);
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
// how will i find the selected text? i know the element html that contains the start/end elements
// main html will have this removed

// functions:
// 1) searchText - returns a reference list of all elements that contain text of element (nodes?)
                // - needs to take into account text that traverses multiple nodes
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

// find all instances of searchTerm in the document and create field element before and after text locations
// returns a list of generated start tags that contain the searchTerm
function searchText(searchTerm, field, count) {
  var text_nodes = [],
      text = "",
      lower_text = "",
      lower_search = searchTerm.toLowerCase(),
      helper = {},
      // holds last valid index
      current_index = -1,
      search_elements = {};

      // TEST CODE
      count = 1;
    
    helper.addText = function(node) {
      if (node.nodeType === 3) {
        var node_value = node.nodeValue.trim();
        text += " " + node_value;
        lower_text += " " + node_value.toLowerCase();
        text_nodes.push(node);

        // if searchTerm is found, current text node is the end node for one count
        var index = lower_text.indexOf(lower_search, current_index + 1);
        
        // stores the number of characters the start of searchTerm is from the end of text
        var characters_from_end = text.length - index;
        console.log("characters from end: " + characters_from_end);
        
        // loop through text node in case there is more than one searchTerm instance in text
        while (index != -1) {
          current_index = index;
          count--;
          // remember how many text nodes before current node we are pulling from text_nodes
          var text_nodes_back_index = text_nodes.length - 2;
          var node_text = node_value;
          var start_node;
          
          // set node_text to contain prevSibling text nodes until the current searchTerm matches 
          while (node_text.length < characters_from_end) {
            console.log("node_text.length: " + node_text.length + " < " + characters_from_end);
            console.log("old node text: " + node_text);
            node_text = text_nodes[text_nodes_back_index].nodeValue.trim() + " " + node_text;
            text_nodes_back_index--;
          }
          start_node = text_nodes[text_nodes_back_index + 1];
          console.log("final node_text: " + node_text);

          // find index searchTerm starts on in text node (or prevSibling)
          var start_index = node_text.toLowerCase().indexOf(lower_search);
          console.log("start index: " + start_index);
          if (start_index != -1) {
            // set parent as first element parent of text_node
            var parent = node.parentNode;
            while (parent.nodeType !== 1) {
              parent = node.parentNode;
            }
            
            // currently know # characters from end to start of searchText. want to find if parent holds start_node
            // also want to modify characters_from_end to be accurate
            // 
            
            // loop through parent's child_nodes backwards
            var element_end_text = "";
            for (var child_index = parent.childNodes.length - 1; child_index >= 0; child_index--) {
              if (parent.childNodes[child_index].nodeType === 3) {
                // if start node is found (can be current node)
                if (parent.childNodes[child_index] === start_node) {
                
                }
                // if current node is found, stop adding element_end_text
                else if (parent.childNodes[child_index] === node) {
                  
                } else {
                  element_end_text += parent.childNodes[child_index].nodeValue.trim();
                }
              }
            }
            
            
            // start_node is current node
            if (text_nodes_back_index < text_nodes.length - 2) {
              //parent = insertElementInText(start_index - 1, text_nodes[text_nodes_back_index], field, "start");
            } else {
              //parent = insertElementInText(start_index - 1, node, field, "start");
            }
            
            // find index searchTerm ends on in text node
            var end_index = node_value.length - characters_from_end + searchTerm.length;
            console.log("end index: " + end_index);
            console.log(node_value);
            // add end tag after searchTerm in text node
            //insertElementInText(end_index, node, field, "end", parent);
            
            // know if element is shared parent element - text node parent to element
            // get parent of one element until it contains other text node text.
            // use characters from end? - but finding parent element from text node could add new characters to the end
            // cannot use element.text(). will not match to my node_text
            // find parent - iterate through text node children to see if it contains
                // - element spans over this
                // - [node][node]![node]![node]
                // ! node is selected node, searchText is in 1st node
                
                // logic - add from start to end of doc these text nodes and maintain the text
                // indexOf each new addition, without checking previously found character index
                // when match is found, find characters_from_end and starting text node
                
                // node.parentNode = element - loop through element.childNodes backwards, storing text_nodes text - until it is equal to current node
                                              // loops through bare minimum, but stores a new text variable
                                              // ends when start node is found
                                              
                                              // loop through element.childNodes forwards, until it is current node - add on additional & add to characters_from_end the length
                                              // means loops through nodes we've already passed through
                    // find index of node within element (for text nodes)
                    // use index to add on from the right - increase characters_from_end accordingly -- this step... 
                        // 
                    // iterate left until searchTerm is found, same as normal. get start_index and end_index
                    // set class
            // start_index - 1
            // className - 
            
            // clean function - iterate through all k-v stores for attribute and remove class/data attr
          } else {
            console.log(node_text);
            console.log(searchTerm);
          }
          
          index = lower_text.indexOf(lower_search, current_index + 1);
          characters_from_end = text.length - index;
        }
      }
      else if (node.nodeType === 1 && node.childNodes && !/(style|script)/i.test(node.tagName)) {
        $.each(node.childNodes, function(i,v){
          helper.addText(node.childNodes[i]);
        });
      }
    };

    // iterate through all children of body element
    var children = $("body")[0].childNodes;
    $.each(children, function(index,val) {
      if (count == 0) {
        console.log("Completed calculations for all matched searchTerms");
        return false;
      }
      helper.addText(children[index]);
    });
    
    return search_elements;
}

function insertElementInText(index, text_node, element_tag, class_name, parent) {
  console.log("insert element");
  var node_text = text_node.nodeValue.trim();
  console.log(node_text);
  console.log(text_node);
  text_node.nodeValue = text_node.nodeValue.substring(0, index) + TEXT_ID + text_node.nodeValue.substring(index);
  
  // this text_node is no longer the same node as the one in parent node, so changes to it aren't applied to actual dom
  // this also means text_nodes array is incorrect...
  
  // [thisthis|this]this - node1, node2
  // after 1st <vend>thisthis|this<vend>this
  // new - ele1, node1, node2, ele2, node3
  // this[this|thisthis]
  // <vend>this<vend2>this|this<vend>this<vend2>
  // new - ele1, node1, ele2, node2, node3, ele3, node4, ele4
  
  // return either parent or node
  
  // instead of inserting elements between text nodes, just set parent element attribute with information regarding
  // ex. index of start/end text
  
  // highlight - span/mark surrounding text
  // possible issue: will removing span/mark ruin the dom??
  
  // list of options - 
        // issue 1: what if text changes
            // what could cause this to happen? lots of triggers on-page - unlikely
            // even if text isnt altered, if unselected text is altered, then indices are ruined
        // issue 2: what if multiple attributes held for an element (multiple instances of text?, start of some text, end of other texts?)
  
  // option: k-v store to know what class is used for options??
  // receipt attribute: { index-in-list: { start: index, end: index, class } }
    // class can be shared if same element.. different start/end!
  // pass k-v store back from searchText - difference between search terms found and related options found
  // need to update k-v store whenever user types a character
  // can iterate through text nodes to find index
  // ex. need to differentiate different option elements (numbers...) - easily removable - or all same class
  
  // need to pass k-v onto aServer, unideal so don't do final results like this. just add class
  // meanwhile, class for receipt attribute - (assuming space between text nodes and trim)
  // data-start:/data-end: custom attribute HTML5 - jquery $(".vendor").data("start")
  
  if (!parent) {
    parent = text_node.parentNode;
  }
  console.log(parent);
  index = parent.innerHTML.indexOf(TEXT_ID);
  console.log("parent index: " + index);
  parent.innerHTML = parent.innerHTML.substring(0, index) +
                      "<" + element_tag + " class='" + class_name + "'></" + element_tag + ">" +
                      parent.innerHTML.substring(index + TEXT_ID.length);
  console.log(parent);
  console.log($(element_tag));
  
  return parent;
}

// this is currently a test method that proves appending <field> to text node works
function searchTextNodes(searchTerm, selector, field) {
  if (searchTerm) {
    var selector = selector || "body",
      searchTermRegEx = new RegExp("("+RegExp.escape(searchTerm)+")","gi"),
      matches = [],
      helper = {},
      count = 0;

    // iterates through all nodes in dom, checking text nodes for search matches and surrounding them by elements
    // issue is special symbols appended to text
    helper.matchText = function(node, searchTerm) {
      if (node.nodeType === 3) {
        if (node.nodeValue.match(searchTermRegEx)) {
          // insert field start and end around matched text
          var node_html = node.nodeValue.replace(searchTermRegEx, "<" + field + " class='start-" + count + "'></" + field + ">$1<" + field + " class='end-" + count + "'></" + field + ">");
          console.log(node_html);
          
          // the innerHTML of parent converts special characters into html entities. node_html_entities matches what is generated
          var node_html_entities = node_html.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
          console.log(node_html_entities);
          
          // prepend data with TEXT_ID to find it in parent innerHTML easily
          node.nodeValue = TEXT_ID + node_html;
          console.log(node.nodeValue);
          
          // set correct count for <field> tag if there are multiple instances of searchTerm in text node
          /*var num_occurrences = occurrences(node.nodeValue, searchTerm);
          while (num_occurrences > 0) {
            // change each individual occurrence
            // if innerHTML for parent contains
            num_occurrences--;
          }*/
          count++;
          
          // set parent innerHTML
          var parent = node.parentNode;
          console.log(parent);
          
          var start_of_node = parent.innerHTML.indexOf(TEXT_ID);
          var start_of_end = parent.innerHTML.indexOf(node_html_entities) + node_html_entities.length;
          console.log(parent.innerHTML);
          parent.innerHTML = parent.innerHTML.substring(0, start_of_node)
                            + node_html
                            + parent.innerHTML.substring(start_of_end);
          console.log(parent);
          matches.push(node);
        }
      }
      else if (node.nodeType === 1 && node.childNodes && !/(style|script)/i.test(node.tagName)) {
        $.each(node.childNodes, function(i,v) {
          helper.matchText(node.childNodes[i], searchTerm);
        });
      }
    };
    
    // iterate through all children of body element
    var children = $(selector)[0].childNodes;
    $.each(children, function(index,val) {
      helper.matchText(children[index], searchTerm);
    });
    return matches;
  } else {
    return false;
  }
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