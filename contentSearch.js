// searching methods for content script

    // search_terms = { field: { 0: { data: "data-tworeceipt-field-search", start: 3, end: 6 } } };
var search_terms = {},
    // attributes = { field: true, items: { 0: { item_field: true } } };
    attributes = { "items": {} };

// issue: hidden elements - $.is(":visible")
// list of parent elements, when checking which to allow selection for, check if visible before displaying on list

// find all instances of search_term in the document and set data attribute
// returns a list of parent elements that contain the search_term
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
  $.each(children, function(index) {
    params = iterateText(children[index], findMatch, params);
    search_elements = params.search_elements;
    
    if (params.result === false) {
      return false;
    }
  });

  search_terms[field] = search_elements;
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
      console.log("end parent");
      console.log(end_parent);
      
      var start_parent = start_node.parentNode;
      console.log("start parent");
      console.log(start_parent);
      
      var target_parent;
      // start and end parents are the same
      if (start_parent === end_parent) {
        console.log("start parent is end parent");
        target_parent = start_parent;
      }
      // start parent is target parent element
      else if ($.contains(start_parent, end_parent)) {
        console.log("start parent is larger");
        target_parent = start_parent;
      }
      // end parent is target parent element
      else if ($.contains(end_parent, start_parent)) {
        console.log("end parent is larger");
        target_parent = end_parent;
      }
      // neither parents contain one another
      else {
        console.log("neither parent contains the other");
        // iterate upwards until start_parent contains end_parent
        while (!$.contains(start_parent, end_parent) && start_parent !== end_parent) {
          start_parent = start_parent.parentNode;
        }
        target_parent = start_parent;
      }
      console.log("target parent");
      console.log(target_parent);
      
      // set start_node to node before the parent we are calculating with
      console.log(text_nodes_back_index);
      if (text_nodes_back_index !== -1) {
        start_node = text_nodes[text_nodes_back_index];
        text_nodes_back_index--;
        
        var start_element = start_node.parentNode;
        
        // continue adding text length to start_index until parent elements are not contained in target_parent
        while (($.contains(target_parent, start_element) || target_parent === start_element) && text_nodes_back_index !== -1) {
          start_index += start_node.nodeValue.trim().length + 1;
          start_node = text_nodes[text_nodes_back_index];
          text_nodes_back_index--;
          start_element = start_node.parentNode;
        }
      }
      
      // find index search_term ends on in text node
      var end_index = start_index + search_term.length;
      console.log("start index: " + start_index);
      console.log("end index: " + end_index);
      
      // if a class for field search already exists, use that instead
      console.log("data field");
      var data_field = "data-tworeceipt-" + field + "-search";
      console.log($(target_parent).attr(data_field));
      if ($(target_parent).attr(data_field) !== undefined) {
        search_elements[count] = {
          start: start_index,
          end: end_index,
          data: $(target_parent).attr(data_field)
        };
      } else {
        search_elements[count] = {
          start: start_index,
          end: end_index,
          data: count
        };
        $(target_parent).attr(data_field, count);
      }
      
      count++;      
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

// always include the exact match to text that user has entered
// probable text options

// loop through all search_terms for field, adding possible search matches to search_terms object
function findRelevantMatches(field) {
  // for each search_term, look for next newline, end of word (if not identical to search_term [ex. search is only partial word])
  // end of element/text node / until beginning of next element(even nested)
  // backwards to beginning of word, beginning of element/text node
  // forwards & backwards choices, multiple combinations?!
  if (search_terms[field] !== undefined && Object.keys(search_terms[field]) > 0) {
    $.each(search_terms[field], function(match) {
      // run each match through a # of tests
      // autocomplete from string of entire file?? - source
      // can set source to refer to a server url that calculates
      // can have callback that calculates and returns 
      // $.ui.autocomplete.escapeRegex - take single string argument, pass to new RegExp()
      
      // versions: autofill full word / autofill end of line/element
    });
  }
}

// exact match
// completed word (space character)
// completed phrase (new-line/node)
// can build data structure to quickly search?
// built based off array of words - since finding duplicate words within document is too expensive & doesn't allow storing node/newline flag?
// each word contains reference to if it is the beginning/end of an element or newline
// - ex. next word is beginning of element, stop there
// - previous word is end of an element or newline, stop there

// performance issue, finding index of word - can store this 

// once match is found - find match in full text & calculate indices using original method, text node by text node

// need to know where new-line and node breaks are on page - nodes are more difficult since 

// search_data is an object within search_terms, containing data attr, start, and end to calculate on
// check if result is the same as search_data entered
// how to get multi-combos - this finds end of element, what about beginning?
function findElementMatch(search_data) {

}

// returns an array of matches for the parameter field - [ { text: "", index: "" }, { text: "", index: "" } ]
function getMatches(field) {
  if (seach_terms[field] !== undefined && Object.keys(search_terms[field]).length > 0) {
    var matches = [];
    var keys = Object.keys(search_terms[field]);
    for (var index = 0; index < keys.length; index++) {
      var text = findMatchText(field, index);
      matches.push({ "text": text, "index": index });
    }
    return matches;
  } else {
    return [];
  }
}

// find parent element stored on search_terms
function findMatchElement(field, index) {
  var data_field = "data-tworeceipt-" + field + "-search";
  var field_value = "";
  if (search_terms.hasOwnProperty(field)) {
    field_value = search_terms[field][index].data;
  } else if (search_terms.items.hasOwnProperty(field)) {
    field_value = search_terms.items[field][index].data;
  }
  return $("[" + data_field + "='" + field_value + "']");
}

function getStartIndex(field, index) {
  var start_index = -1;
  if (search_terms.hasOwnProperty(field)) {
    start_index = search_terms[field][index].start;
  } else if (search_terms.items.hasOwnProperty(field)) {
    start_index = search_terms.items[field][index].start;
  }
  return start_index;
}

function getEndIndex(field, index) {
  var end_index = -1;
  if (search_terms.hasOwnProperty(field)) {
    end_index = search_terms[field][index].end;
  } else if (search_terms.items.hasOwnProperty(field)) {
    end_index = search_terms.items[field][index].end;
  }
  return end_index;
}

// find exact matched text stored on search_terms
function findMatchText(field, index) {
  var element = findMatchElement(field, index),
      start_index = getStartIndex(field, index),
      end_index = getEndIndex(field, index),
      text = "";

  text = getDocumentText(element);
  if (text.length !== 0 && start_index !== -1 && end_index !== -1) {
    text = text.substring(start_index, end_index);
  }
  return text;
}

/* params:  text - total plain-text of all passed text nodes
*           trim - true if the nodeValue will be trimmed before added to text
*/
function addText(node, params) {
  var text = params.text;
  var trim = params.trim;
  if (trim) {
    if (text === "") {
      text = node.nodeValue.trim();
    } else {
      text += " " + node.nodeValue.trim();
    }
  } else {
    text += node.nodeValue;
  }
  return { "text": text, "trim": trim };
}

// replace the instance of match text in each child element to surround it with a <mark> tag
function highlightMatchText(field, index) {
  var element = findMatchElement(field, index),
      start_index = getStartIndex(field, index),
      end_index = getEndIndex(field, index),
      params = { "start_index": start_index, "end_index": end_index, "current_index": 0, "result": true };
      
  // look for start and end index within element
  if ($(element).length > 0) {
    var children = $(element)[0].childNodes;
    $.each(children, function(index) {
      params = iterateText(children[index], highlightText, params);
      
      if (params.result === false) {
        return false;
      }
    });
  } else {
    console.log("element " + field + " does not exist. text not highlighted");
  }
}

/* params:  start_index - the character index where the highlighting should start
*           end_index - the character index where the highlighting should end before
*           current_index - placeholder for how many indices have been passed so far
*/
function highlightText(node, params) {
  var current_index = params.current_index;
  var text = node.nodeValue.trim();
  var result = true;
  var space_buffer = 1;
  
  // track whitespace trimmed, so replaced text node will be identical to existing
  var left_trim_num = node.nodeValue.indexOf(text);
  var left_trim = node.nodeValue.substring(0, left_trim_num);
  var right_trim_num = node.nodeValue.length - text.length - left_trim_num;
  var right_trim = node.nodeValue.substring(node.nodeValue.length - right_trim_num);
  
  // for first node, do not include space at start of text
  if (current_index === 0) {
    space_buffer = 0;
  }
    
  var start_char = -1, end_char = -1;
  var next_index = current_index + text.length + space_buffer;
  console.log(text);
  console.log("current index: " + current_index);
  console.log("start index: " + params.start_index);
  console.log("end index: " + params.end_index);
  console.log("next index: " + next_index);
  // highlight from start of text node
  if (current_index >= params.start_index && current_index < params.end_index) {
    start_char = 0;
  }
  // highlight from middle of text node
  else if (current_index < params.start_index && next_index >= params.start_index) {
    start_char = params.start_index - current_index - space_buffer;
  }

  // highlight to end of text node
  if (next_index >= params.start_index && next_index < params.end_index) {
    end_char = null;
  }
  // highlight to middle of text node
  else if (current_index < params.end_index && next_index >= params.end_index) {
    end_char = text.length - (next_index - params.end_index);
    // stop iterating when current index is past highlight target
    result = false;
  }
  console.log("start: " + start_char);
  console.log("end: " + end_char);
  current_index = next_index;
  
  if (start_char !== -1) {
    var left_text = text.substring(0, start_char);
    var right_text = "";
    var mark_text = "";
    if (end_char !== null) {
      right_text = text.substring(end_char);
      mark_text = text.substring(start_char, end_char);
    } else {
      mark_text = text.substring(start_char);
    }
    
    var temp_node = document.createElement("span");
    temp_node.setAttribute("name", "tworeceipt_highlight");
    temp_node.innerHTML = left_trim + left_text +
                          "<mark>" + mark_text + "</mark>" +
                          right_text + right_trim;
    node.parentNode.insertBefore(temp_node, node);
    node.parentNode.removeChild(node);
  }
  
  return { "start_index": params.start_index, "end_index": params.end_index, "current_index": current_index, "result": result };
}

// returns highlighted text to its original form
function cleanHighlight() {
  var highlight_span = $("[name='tworeceipt_highlight']");
  highlight_span.each(function(index) {
    var node = highlight_span[index];
    var params = { "text": "", "trim": false };
    params = iterateText(node, addText, params);
    var text_node = document.createTextNode(params.text);
    
    node.parentNode.insertBefore(text_node, node);
    node.parentNode.removeChild(node);
  });
}

// removes data-tworeceipt-field-search attribute from all elements
// if field is null, removes data attributes for all search_terms fields
function cleanElementData(field) {
  if (field) {
    var data_field = "data-tworeceipt-" + field + "-search";
    var elements = $("[" + data_field + "]");
    for (var index = 0; index < elements.length; index++) {
      elements.eq(index).removeAttr(data_field);
    }
    delete search_terms[field];
    
  } else {
    $.each(search_terms, function(field) {
      var data_field = "data-tworeceipt-" + field + "-search";
      var elements = $("[" + data_field + "]");
      for (var index = 0; index < elements.length; index++) {
        elements.eq(index).removeAttr(data_field);
      }
    });
    search_terms = {};
  }
}

// retrieves the text contents of a optional param element or document body
function getDocumentText(element) {
  var selector = element || "body",
      params = { "text": "", "trim": true };
  
  // iterate through all children of body element
  if ($(selector).length > 0) {
    var children = $(selector)[0].childNodes;
    $.each(children, function(index) {
      params = iterateText(children[index], addText, params);
    });
  } else {
    console.log("element does not exist. no text retrieved");
  }
  return params.text;
}

function iterateText(node, method, method_params) {
  // run method for non-whitespace text nodes
  if (node.nodeType === 3 && /\S/.test(node.nodeValue)) {
    method_params = method(node, method_params);
  }
  // iterateText through children of non-style/script elements
  else if (node.nodeType === 1 && node.childNodes && !/(style|script)/i.test(node.tagName)) {
    $.each(node.childNodes, function(i) {
      method_params = iterateText(node.childNodes[i], method, method_params);
    });
  }
  return method_params;
}

// set attributes field, index implies receipt item
function setFieldText(element, start, end, field, index) {
  var data_field = "data-tworeceipt-" + field;
  if (index !== undefined) {
    data_field += index;
    if (attributes.items[index] === undefined) {
      attributes.items[index] = {};
    }
    attributes.items[index][field] = true;
  } else {
    attributes[field] = true;
  }
  
  element.attr(data_field + "-start", start);
  element.attr(data_field + "-end", end);
}

// removes data-tworeceipt-field-start and -end attributes for selected field (index for receipt items)
// if field is null, removes all -start and -end attributes for all fields
function cleanFieldText(field, index) {
  if (field) {
    var data_field = "data-tworeceipt-" + field;
    if (index !== undefined) {
      data_field += index;
      delete attributes.items[index][field];
      if (Object.keys(attributes.items[index]).length === 0) {
        delete attributes.items[index];
      }
    } else {
      delete attributes[field];
    }
    
    var element = $("[" + data_field + "-start]");
    if (element.length > 0 && element[0] !== undefined) {
      element.attr(data_field + "-start", null);
      element.attr(data_field + "-end", null);
    } else {
      console.log("element " + field + " does not exist. data field text not removed");
    }
  } else {
    $.each(attributes, function(field) {
      if (field === "items") {
        $.each(attributes.items, function(item_index) {
          $.each(attributes.items[item_index], function(item_attribute) {
            var data_field = "data-tworeceipt-" + item_attribute + item_index + "-start";
            var element = $("[" + data_field + "]");
            if (element.length > 0 && element[0] !== undefined) {
              element.attr(data_field + "-start", null);
              element.attr(data_field + "-end", null);
            } else {
              console.log("element " + item_attribute + item_index + " does not exist. data field text not removed");
            }
          });
        });
      } else {
        var data_field = "data-tworeceipt-" + field + "-start";
        var element = $("[" + data_field + "]");
        if (element.length > 0 && element[0] !== undefined) {
          element.attr(data_field + "-start", null);
          element.attr(data_field + "-end", null);
        } else {
          console.log("element " + field + " does not exist. data field text not removed");
        }
      }
    });
    attributes = { "items": {} };
  }
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