// searching methods for content script

    // search_terms = { field: { 0: { data: index, start: 3, end: 6, start_node_index: 3, end_node_index: 4 } } };
    // start_node_index / end_node_index is the index of start/end node in text_nodes
    // data-tworeceipt-field-search=index
var search_terms = {},
    // attributes = { field: true, items: { 0: { item_field: true } } };
    attributes = { "items": {} },
    // array of each non-whitespace text node in the document
    text_nodes = [];

// issue: hidden elements - $.is(":visible")
// list of parent elements, when checking which to allow selection for, check if visible before displaying on list

// find all instances of search_term in the document and set data attribute
// returns a list of parent elements that contain the search_term
function searchText(search_term, field, total) {
  var search_elements = {},
      params = {
                  "node_index": 0,
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
  $.each(children, function(index, value) {

    params = iterateText(value, findMatch, params);
    search_elements = params.search_elements;

    if (params.result === false) {
      return false;
    }
  });

  search_terms[field] = search_elements;
  search_terms[field].count = params.count;
  return search_elements;
}

/* params: node_index - index in text_nodes iterated through
*          search_term - search term to match
*          search_elements - parent elements of found search terms
*          field - text field we are matching for
*          total - total # of matches found
*          count - current # of matches found
*          text - total plain-text of all passed text nodes
*          current_index - holds last valid index
*          result - set to false to break out of iterateText
*/
function findMatch(node, params) {

  var node_value = node.nodeValue.trim(),
      node_index = params.node_index,
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

  // if search_term is found, current text node is the end node for one count
  var index = text.toLowerCase().indexOf(search_term.toLowerCase(), current_index + 1);
  // if there is multiple instances of search_term in text (loops through while loop), use old_start_index to calculate start_index
  var old_start_index, start_node_index;

  // stores the number of characters the start of search_term is from the end of text
  var characters_from_end = text.length - index;

  // loop through text node in case there is more than one search_term instance in text
  while (index !== -1) {
    current_index = index;

    // remember how many text nodes before current node we are pulling from text_nodes
    var text_nodes_back_index = node_index - 1;

    // text_selection will contain a combined string of all text nodes where current search_term spans over
    var text_selection = node_value;
    var start_node;

    // set text_selection to contain prevSibling text nodes until the current search_term matches
    while (text_selection.length < characters_from_end) {
      //console.log("text_selection.length: " + text_selection.length + " < " + characters_from_end);
      //console.log("old text_selection: " + text_selection);
      text_selection = text_nodes[text_nodes_back_index].nodeValue.trim() + " " + text_selection;
      //console.log("space added: " + text_selection);
      text_nodes_back_index--;
    }

    // use old start_node_index value before re-calculating it if its the same as new start_node_index
    // start_index needs to ignore previous instances of text
    var start_index;
    if (start_node_index !== undefined && start_node_index === text_nodes_back_index + 1) {
      // find index search_term starts on in text node (or prevSibling)
      start_index = text_selection.toLowerCase().indexOf(search_term.toLowerCase(), old_start_index + 1);
    } else {
      start_index = text_selection.toLowerCase().indexOf(search_term.toLowerCase());
    }
    old_start_index = start_index;

    // start_node contains beginning of search_term and node contains end of search_term
    var start_node_index = text_nodes_back_index + 1;
    // possibly null parentNode because highlighted text before, adding MARK tag and then removed it
    start_node = text_nodes[start_node_index];
    //console.log("final text_selection: " + text_selection);

    if (start_index !== -1) {
      // set parent as first element parent of text_node
      var end_parent = node.parentNode;

      var start_parent = start_node.parentNode;

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
      /*console.log("target parent");
      console.log(target_parent);*/

      // set start_node to node before the parent we are calculating with
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
      /*console.log("start index: " + start_index);
      console.log("end index: " + end_index);*/

      // if a class for field search already exists, use that instead
      console.log("data field");
      var data_field = "data-tworeceipt-" + field + "-search";
      console.log($(target_parent).attr(data_field));
      if ($(target_parent).attr(data_field) !== undefined) {
        search_elements[count] = {
          start: start_index,
          end: end_index,
          data: parseInt($(target_parent).attr(data_field)),
          start_node_index: start_node_index,
          end_node_index: node_index
        };
      } else {
        search_elements[count] = {
          start: start_index,
          end: end_index,
          data: count,
          start_node_index: start_node_index,
          end_node_index: node_index
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
    //console.log("characters from end: " + characters_from_end);

    if (count === total) {
      console.log("Completed calculations for all matched search_terms");
      node_index++;
      return {
              "node_index": node_index,
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
  node_index++;
  return {
            "node_index": node_index,
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

// loop through all search_terms for field, adding possible search matches to search_terms object
function findRelevantMatches(field, type) {
  if (search_terms.hasOwnProperty(field) && Object.keys(search_terms[field]).length > 0) {
    var count = search_terms[field].count;
    console.log(findMatchByWord(field, count, type));
    console.log(findMatchByNode(field, count, type));
    console.log(findMatchByElement(field, count, type));
  }
}

// isNumeric from handsontable
function isNumeric(n) {
  var t = typeof n;
  return t == 'number' ? !isNaN(n) && isFinite(n) :
    t == 'string' ? !n.length ? false :
    n.length == 1 ? /\d/.test(n) :
    /^\s*[+-]?\s*(?:(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?)|(?:0x[a-f\d]+))\s*$/i.test(n) :
    t == 'object' ? !!n && typeof n.valueOf() == "number" && !(n instanceof Date) : false;
};

// parent element? loop until text changes?
// appends matches (excluding index > count) complete by element and returns newly added search terms
function findMatchByElement(field, count, type) {
  var keys = Object.keys(search_terms[field]);
  console.log(keys);
  var original_count = search_terms[field].count;

  $.each(keys, function(key, index) {
    // do not include count index and indices less than count (# of original search_terms)
    if (!isNaN(parseInt(index)) && parseInt(index) < count) {
      console.log("findMatchByElement: " + index);

      var field_value = getSearchTermProperty(field, "data", index),
          start_node_index = getSearchTermProperty(field, "start_node_index", index),
          end_node_index = getSearchTermProperty(field, "end_node_index", index),
          start_index = getSearchTermProperty(field, "start", index),
          end_index = getSearchTermProperty(field, "end", index),
          // code duplication so 'getSearchTermProperty' for data is not run twice
          element = $("[data-tworeceipt-" + field + "-search='" + field_value + "']");

      var element_text = getDocumentText(element);

      // current search_term is already the element match
      if (start_index === 0 && end_index === element_text.length) {
        console.log("search_term is already match element");
        return true;
      }

      // calculating for new search_term node_index
      var new_start_node_index = start_node_index;
      console.log(text_nodes[new_start_node_index]);
      // keep iterating backwards until start of text_nodes, or text_node is not within element, or text node parent is not equal to element
      while (new_start_node_index !== 0 &&
              $.contains(element[0], text_nodes[new_start_node_index].parentNode) &&
              text_nodes[new_start_node_index].parentNode !== element[0]) {
        new_start_node_index--;
        console.log(new_start_node_index);
        console.log(text_nodes[new_start_node_index]);
      }

      var new_end_node_index = end_node_index;
      console.log(text_nodes[new_end_node_index]);
      // keep iterating forwards until end of text_nodes, or text_node is not within element, or text node parent is not equal to element
      while (new_end_node_index !== text_nodes.length - 1 &&
              $.contains(element[0], text_nodes[new_end_node_index].parentNode) &&
              text_nodes[new_end_node_index].parentNode !== element[0]) {
        new_end_node_index++;
        console.log(new_end_node_index);
        console.log(text_nodes[new_end_node_index]);
      }

      var start_index = 0;
      var end_index = element_text.length;

      if (type === "number") {
        if (element_text.indexOf("$") === 0) {
          element_text = element_text.substring(1);
          start_index++;
        }

        if (element_text.indexOf("$") === element_text.length - 1 || element_text.indexOf(".") === element_text.length - 1) {
          element_text = element_text.substring(0, element_text.length - 1);
          end_index--;
        }


        if (!isNumeric(element_text)) {
          console.log("search_term is not numeric");
          return true;
        }
      }

      var new_search_term = {
                              data: field_value,
                              start: start_index,
                              end: end_index,
                              start_node_index: new_start_node_index,
                              end_node_index: new_end_node_index
                            };

      // only consider valid search terms
      if (isValidSearchTerm(new_search_term, type)) {
        // check all existing search_terms for duplicates
        var duplicate = hasDuplicate(field, new_search_term);

        console.log(new_search_term);
        if (duplicate) {
          console.log("duplicate");
        } else {
          console.log("NOT duplicate");
          search_terms[field][search_terms[field].count] = new_search_term;
          search_terms[field].count++;
        }
      }
    }
  });

  // return new search_terms added to object
  var added_search_terms = {};
  for (var index = original_count; index < search_terms[field].count; index++) {
    added_search_terms[index] = search_terms[field][index];
  }
  return added_search_terms;
}

// appends matches (excluding index > count) complete by text node and returns newly added search terms
function findMatchByNode(field, count, type) {
  var keys = Object.keys(search_terms[field]);
  console.log(keys);
  var original_count = search_terms[field].count;

  $.each(keys, function(key, index) {
    // do not include count index and indices less than count (# of original search_terms)
    if (!isNaN(parseInt(index)) && parseInt(index) < count) {
      console.log("findMatchByNode: " + index);

      var field_value = getSearchTermProperty(field, "data", index),
          start_node_index = getSearchTermProperty(field, "start_node_index", index),
          end_node_index = getSearchTermProperty(field, "end_node_index", index),
          // code duplication so 'getSearchTermProperty' for data is not run twice
          element = $("[data-tworeceipt-" + field + "-search='" + field_value + "']");

      // iterating to first text node of element, counting characters
      var node_index = start_node_index - 1;
      var char_count = 0;
      while (node_index > -1 &&
              ($.contains(element[0], text_nodes[node_index].parentNode) ||
              text_nodes[node_index].parentNode === element[0])) {
        char_count += text_nodes[node_index].nodeValue.trim().length + 1;
        node_index--;
      }
      var start_index = char_count;

      // iterate through text_nodes from start_node to end of end_node, counting characters
      node_index = start_node_index;
      while (node_index < end_node_index && node_index < text_nodes.length) {
        char_count += text_nodes[node_index].nodeValue.trim().length + 1;
        node_index++;
      }
      var end_index = char_count + text_nodes[end_node_index].nodeValue.trim().length;

      if (type === "number") {
        var element_text = getDocumentText(element);

        if (element_text.indexOf("$") === 0) {
          element_text = element_text.substring(1);
          start_index++;
        }

        if (element_text.indexOf("$") === element_text.length - 1 || element_text.indexOf(".") === element_text.length - 1) {
          element_text = element_text.substring(0, element_text.length - 1);
          end_index--;
        }


        if (!isNumeric(element_text)) {
          console.log("search_term is not numeric");
          return true;
        }
      }

      var new_search_term = {
                              data: field_value,
                              start: start_index,
                              end: end_index,
                              start_node_index: start_node_index,
                              end_node_index: end_node_index
                            };

      // only consider valid search terms
      if (isValidSearchTerm(new_search_term, type)) {
        // check all existing search_terms for duplicates
        var duplicate = hasDuplicate(field, new_search_term);

        console.log(new_search_term);
        if (duplicate) {
          console.log("duplicate");
        } else {
          console.log("NOT duplicate");
          search_terms[field][search_terms[field].count] = new_search_term;
          search_terms[field].count++;
        }
      }
    }
  });

  // return new search_terms added to object
  var added_search_terms = {};
  for (var index = original_count; index < search_terms[field].count; index++) {
    added_search_terms[index] = search_terms[field][index];
  }
  return added_search_terms;
}

// appends matches (excluding index > count) complete by word (separated by space characters/text nodes) and returns newly added search terms
function findMatchByWord(field, count, type) {
  var keys = Object.keys(search_terms[field]);
  console.log(keys);
  var original_count = search_terms[field].count;

  $.each(keys, function(key, index) {
    // do not include count index and indices less than count (# of original search_terms)
    if (!isNaN(parseInt(index)) && parseInt(index) < count) {
      console.log("findMatchByWord: " + index);

      var field_value = getSearchTermProperty(field, "data", index),
          start_node_index = getSearchTermProperty(field, "start_node_index", index),
          end_node_index = getSearchTermProperty(field, "end_node_index", index),
          start_index = getSearchTermProperty(field, "start", index),
          end_index = getSearchTermProperty(field, "end", index),
          // code duplication so 'getSearchTermProperty' for data is not run twice
          element = $("[data-tworeceipt-" + field + "-search='" + field_value + "']");

      // check if there are any non-space characters to left / right of indices
      var element_text = getDocumentText(element);
      var start_text = element_text.substring(0, start_index);
      //console.log(start_text);
      // while there are no spaces from the end of start_text, subtract characters from start_index
      var char_index = start_text.length - 1;
      while (start_text.charAt(char_index).match(/\s/) === null && char_index !== -1) {
        char_index--;
        start_index--;
      }

      var end_text = element_text.substring(end_index);
      //console.log(end_text);
      char_index = 0;
      while (end_text.charAt(char_index).match(/\s/) === null && char_index !== end_text.length) {
        char_index++;
        end_index++;
      }

      if (type === "number") {
        var final_text = element_text.substring(start_index, end_index);

        if (final_text.indexOf("$") === 0) {
          final_text = final_text.substring(1);
          start_index++;
        }

        if (final_text.indexOf("$") === final_text.length - 1 || final_text.indexOf(".") === final_text.length - 1) {
          final_text = final_text.substring(0, final_text.length - 1);
          end_index--;
        }


        if (!isNumeric(final_text)) {
          console.log("search_term is not numeric");
          return true;
        }
      }


      var new_search_term = {
                              data: field_value,
                              start: start_index,
                              end: end_index,
                              start_node_index: start_node_index,
                              end_node_index: end_node_index
                            };

      // only consider valid search terms
      if (isValidSearchTerm(new_search_term, type)) {
        // check all existing search_terms for duplicates
        var duplicate = hasDuplicate(field, new_search_term);

        console.log(new_search_term);
        if (duplicate) {
          console.log("duplicate");
        } else {
          console.log("NOT duplicate");
          search_terms[field][search_terms[field].count] = new_search_term;
          search_terms[field].count++;
        }
      }
    }
  });

  // return new search_terms added to object
  var added_search_terms = {};
  for (var index = original_count; index < search_terms[field].count; index++) {
    added_search_terms[index] = search_terms[field][index];
  }
  return added_search_terms;
}

// returns true if new_search_term is valid
function isValidSearchTerm(search_term, type) {
  if (type !== "number") {
    // selection length is not too long 200+ / short 3-
    if (search_term.end - search_term.start >= 200 || search_term.end - search_term.start <= 3) {
      return false;
    } else if (search_term.start_node_index > search_term.end_node_index) {
      return false;
    } else {
      return true;
    }
  } else {
    // selection length is not too long 200+
    if (search_term.end - search_term.start >= 200 || search_term.end - search_term.start <= 0) {
      return false;
    } else if (search_term.start_node_index > search_term.end_node_index) {
      return false;
    } else {
      return true;
    }
  }
}

// returns true if new_search_term is a duplicate of a search_term in search_terms[field]
function hasDuplicate(field, new_search_term) {
  var duplicate = false;
  $.each(search_terms[field], function(key2, value) {
    if (key2 !== "count" &&
        value.data === new_search_term.data &&
        value.start === new_search_term.start &&
        value.end === new_search_term.end &&
        value.node_index === new_search_term.node_index) {
      duplicate = true;
      return false;
    }
  });
  return duplicate;
}

// returns an array of matches for the parameter field - [ { label: "", value: "" }, { label: "", value: "" } ]
// format is intended as a jquery ui autocomplete source
function getMatches(field, item_index) {
  if (item_index !== undefined) {
    field += item_index;
  }
  if (search_terms.hasOwnProperty(field) && Object.keys(search_terms[field]).length > 0) {
    var matches = [];
    var keys = Object.keys(search_terms[field]);
    for (var index = 0; index < keys.length; index++) {
      if (keys[index] !== "count") {
        var text = findMatchText(field, keys[index]);
        if (item_index !== undefined) {
          matches.push(text);
        } else {
          var text = findMatchText(field, keys[index]);
          console.log(text);
          matches.push({ "label": text, "value": keys[index] });
        }
      }
    }
    return matches;
  } else {
    return [];
  }
}
// need to return an array for items source - index # matters - what are values for getMatches?

function getMatchElement(field, index) {
  return $("[data-tworeceipt-" + field + "-search='" + getSearchTermProperty(field, "data", index) + "']");
}

function getSearchTermProperty(field, property, index) {
  var result = -1;
  if (search_terms.hasOwnProperty(field) && search_terms[field].hasOwnProperty(index) && search_terms[field][index].hasOwnProperty(property)) {
    result = search_terms[field][index][property];
  }
  return result;
}

// find exact matched text stored on search_terms
function findMatchText(field, index) {
  var element = getMatchElement(field, index),
      start_index = getSearchTermProperty(field, "start", index),
      end_index = getSearchTermProperty(field, "end", index),
      text = "";

  if ($(element).length > 0) {
    text = getDocumentText(element);
    if (text.length !== 0 && start_index !== -1 && end_index !== -1) {
      text = text.substring(start_index, end_index);
    }
  } else {
    console.log("element " + field + " does not exist. match not found");
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

  params.text = text;
  return params;
}

// replace the instance of match text in each child element to surround it with a <mark> tag
function highlightMatchText(field, index) {
  if (index !== undefined) {
    var element = getMatchElement(field, index),
        start_index = getSearchTermProperty(field, "start", index),
        end_index = getSearchTermProperty(field, "end", index),
        start_node_index = getSearchTermProperty(field, "start_node_index", index),
        params = { "start_index": start_index, "end_index": end_index, "current_index": 0, "node_index": start_node_index, "result": true };

    // look for start and end index within element
    if ($(element).length > 0) {
      var children = $(element)[0].childNodes;
      $.each(children, function(index, value) {
        params = iterateText(value, highlightText, params);

        if (params.result === false) {
          return false;
        }
      });
    } else {
      console.log("element " + field + " does not exist. text not highlighted");
    }
  } else {
    console.log("no text to highlight");
  }
}

// replace the instance of attribute text in each child element to surround it with a <mark> tag
function highlightAttributeText(field, index) {
  if (field) {
    var data_field = "data-tworeceipt-" + field;
    if (index !== undefined) {
      data_field += index;
    }

    var element = $("[" + data_field + "-start]");
    if (element.length > 0 && element[0] !== undefined) {
      var start_index = element.attr(data_field + "-start");
      var end_index = element.attr(data_field + "-end");
      var start_node_index = element.attr(data_field + "-node");

      var params = { "start_index": start_index, "end_index": end_index, "current_index": 0, "node_index": start_node_index, "result": true };

      // look for start and end index within element
      var children = $(element)[0].childNodes;
      $.each(children, function(index, value) {
        params = iterateText(value, highlightText, params);

        if (params.result === false) {
          return false;
        }
      });
    } else {
      console.log("element " + field + " does not exist. data field text not highlighted");
    }
  }
}

/* params:  start_index - the character index where the highlighting should start
*           end_index - the character index where the highlighting should end before
*           current_index - placeholder for how many indices have been passed so far
*           node_index - placeholder for index in text_nodes (only updates on match)
*           result - set to false to break out of iterateText
*/
function highlightText(node, params) {
  var current_index = params.current_index,
      text = node.nodeValue.trim(),
      result = true,
      space_buffer = 1,
      node_index = params.node_index;

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
  /*console.log(text.length + " " + text);
  console.log("current index: " + current_index);
  console.log("start index: " + params.start_index);
  console.log("end index: " + params.end_index);
  console.log("next index: " + next_index);*/
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
    temp_node.setAttribute("data-node-index", node_index);
    temp_node.innerHTML = left_trim + left_text +
                          "<mark>" + mark_text + "</mark>" +
                          right_text + right_trim;
    node.parentNode.insertBefore(temp_node, node);
    node.parentNode.removeChild(node);

    node_index++;
  }

  return {
          "start_index": params.start_index,
          "end_index": params.end_index,
          "current_index": current_index,
          "node_index": node_index,
          "result": result
         };
}

// returns highlighted text to its original form
function cleanHighlight() {
  var highlight_span = $("[name='tworeceipt_highlight']");
  if (highlight_span.length > 0) {
    console.log("CLEAN HIGHLIGHT");
    highlight_span.each(function(index) {
      var node = highlight_span[index];
      var element = highlight_span.eq(index);
      var node_index = element.attr("data-node-index");
      var params = { "text": "", "trim": false, "whitespace": true };
      params = iterateText(node, addText, params);

      var text_node = document.createTextNode(params.text);
      node.parentNode.insertBefore(text_node, node);
      node.parentNode.removeChild(node);

      // set text_nodes reference to new text node
      text_nodes[node_index] = text_node;
    });
  }
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

// initializes text_nodes and retrieves document text
function initializeContentSearch() {
  var selector = "body",
      params = { "text": "", "trim": true, "text_nodes": [] };

  // iterate through all children of body element
  if ($(selector).length > 0) {
    var children = $(selector)[0].childNodes;
    $.each(children, function(index, value) {
      params = iterateText(value, initTextNodes, params);
    });
    text_nodes = params.text_nodes;
  } else {
    console.log("element does not exist. no text retrieved");
  }
  return params.text;
}

// stores text node in param text_nodes and calls addText
function initTextNodes(node, params) {
  params.text_nodes.push(node);
  params = addText(node, params);
  return params;
}

// retrieves the text contents of a optional param element or document body
function getDocumentText(element) {
  var selector = element || "body",
      params = { "text": "", "trim": true };

  // iterate through all children of body element
  if ($(selector).length > 0) {
    var children = $(selector)[0].childNodes;
    $.each(children, function(index, value) {
      params = iterateText(value, addText, params);
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
  // exception case to include whitespace text nodes
  else if (node.nodeType === 3 && method_params.whitespace !== undefined) {
    method_params = method(node, method_params);
  }
  // iterateText through children of non-style/script elements
  else if (node.nodeType === 1 && node.childNodes.length > 0 && !/(style|script)/i.test(node.tagName)) {
    $.each(node.childNodes, function(index, value) {
      method_params = iterateText(value, method, method_params);
    });
  }
  return method_params;
}

// set attributes field, index implies receipt item
function setFieldText(element, start, end, field, index, start_node_index) {
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
  element.attr(data_field + "-node", start_node_index);
}

// removes data-tworeceipt-field-start and -end attributes for selected field (index for receipt items)
// if field is null, removes all -start and -end attributes for all fields
function cleanFieldText(field, index) {
  if (field) {
    var data_field = "data-tworeceipt-" + field;
    if (index !== undefined) {
      data_field += index;

      if (attributes.items.hasOwnProperty(index) && attributes.items[index].hasOwnProperty(field)) {
        delete attributes.items[index][field];
        if (Object.keys(attributes.items[index]).length === 0) {
          delete attributes.items[index];
        }
      }
    } else if (attributes.hasOwnProperty(field)) {
      delete attributes[field];
    }

    var element = $("[" + data_field + "-start]");
    if (element.length > 0 && element[0] !== undefined) {
      element.attr(data_field + "-start", null);
      element.attr(data_field + "-end", null);
      element.attr(data_field + "-node", null);
    } else {
      console.log("element " + field + " does not exist. data field text not removed");
    }
  } else {
    $.each(attributes, function(field) {
      if (field === "items") {
        $.each(attributes.items, function(item_index, item_value) {
          $.each(item_value, function(item_attribute) {
            var data_field = "data-tworeceipt-" + item_attribute + item_index + "-start";
            var element = $("[" + data_field + "]");
            if (element.length > 0 && element[0] !== undefined) {
              element.attr(data_field + "-start", null);
              element.attr(data_field + "-end", null);
              element.attr(data_field + "-node", null);
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
          element.attr(data_field + "-node", null);
        } else {
          console.log("element " + field + " does not exist. data field text not removed");
        }
      }
    });
    attributes = { "items": {} };
  }
}

// returns a element that is a parent to all template fields
function getParentElement(savedData, isItemField) {
  var parentElement;

  if (!isItemField) {
    $.each(savedData, function(key, value) {
      if (key !== "items") {
        var selector = "[data-tworeceipt-" + key + "-start]";
        var formItem = $(selector)[0];
      } else {
        var formItem = getParentElement(value, true);
      }

      if (formItem != null) {
        if (parentElement != null) {
          parentElement = findParent(parentElement, formItem);
        }
        else {
          parentElement = formItem;
        }
      }
    });
  } else {
    console.log(savedData);
    $.each(savedData, function(itemIndex, itemValue) {
      $.each(itemValue, function(itemAttr, value) {
        var selector = "[data-tworeceipt-" + itemAttr + itemIndex + "-start]";
        var formItem = $(selector)[0];

        if (formItem != null) {
          if (parentElement != null) {
            parentElement = findParent(parentElement, formItem);
          }
          else {
            parentElement = formItem;
          }
        }
      });
    });
  }

  return parentElement;
}

// returns a parent element that contains both element1 and element2 (can be equal to the element)
function findParent(element1, element2) {
  // if element2 contains element1
  if ($.contains(element2, element1)) {
    element1 = element2;
  }
  // if element1 does not contain element2
  else if (!$.contains(element1, element2)) {
    // while element2 does not contain element1 and they are not equal
    while (!$.contains(element2, element1) && element1 !== element2) {
      element2 = element2.parentNode;
    }

    element1 = element2;
  }

  return element1;
}

// calculates the element_path from param node
function findElementPath(node) {
  var elementPath = [];
  var element = $(node);
  var parentElement = element.parent();

  while (parentElement.length > 0 && element[0].tagName !== "BODY") {
    var order = parentElement.children().index(element);
    elementPath.unshift(order);
    element = parentElement;
    parentElement = parentElement.parent();
  }

  elementPath.unshift(0);
  return elementPath;
}

// returns DOM element node at the end of param elementPath
function getElementFromElementPath(elementPath) {
  var element = $("body").eq(0);
  if (elementPath != null) {
    $.each(elementPath, function(key, value) {
      if (key !== 0) {
        element = element.children().eq(value);
      }
    });
  }

  return element[0];
}

// compares two element_paths and return an element_path representing the parent element
function findParentElementPath(element_path1, element_path2) {
  console.log("compare parent element path");
  console.log(element_path1);
  console.log(element_path2);
  var element_path = [];

  if ((element_path1 == null || element_path1.length === 0) && (element_path2 == null || element_path2.length === 0)) {
    return element_path;
  }
  else if (element_path1 == null || element_path1.length === 0) {
    return element_path2;
  }
  else if (element_path2 == null || element_path2.length === 0) {
    return element_path1;
  }

  for (var i = 0; i < element_path1.length; i++) {
    if (i < element_path2.length) {
      if (element_path1[i] === element_path2[i]) {
        element_path.push(element_path1[i]);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  console.log("returned parent element path");
  console.log(element_path);

  return element_path;
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
    //console.log(string);
    //console.log(subString);
    if(subString.length<=0) return string.length+1;

    var n=0, pos=0;
    var step=(allowOverlapping)?(1):(subString.length);

    while(true){
        pos=string.indexOf(subString,pos);
        if(pos>=0){ n++; pos+=step; } else break;
    }
    return(n);
}
