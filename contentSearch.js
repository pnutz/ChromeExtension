// searching methods for content script

// searchTerms = { field: { 0: { data: index, start: 3, end: 6, startNodeIndex: 3, endNodeIndex: 4 } } };
// startNodeIndex / endNodeIndex is the index of start/end node in textNodes
// element attribute: data-tworeceipt-field-search=index
var searchTerms = {};
// attributes = { field: true, items: { 0: { itemField: true } } };
var attributes = { "items": {} };
// array of each non-whitespace text node in the document
var textNodes = [];

// find all instances of searchTerm in the document (or in element) and set data attribute
// param nodeIndex is required if param element is defined, indicating the textNode index at the start of element
// returns a list of parent elements that contain the searchTerm
function searchText(searchTerm, field, total, element, nodeIndex, count) {
  var selector = element || "body";
  nodeIndex = nodeIndex || 0;
  count = count || 0;

  var params = {
                  nodeIndex: nodeIndex,
                  searchTerm: searchTerm,
                  searchElements: {},
                  field: field,
                  total: total,
                  count: count,
                  text: "",
                  // holds last valid index
                  currentIndex: -1,
                  result: true
                };

  var children = $(selector)[0].childNodes;
  // iterate through all children of element
  for (var i = 0; i < children.length; i++) {
    params = iterateText(children[i], findMatch, params);
    if (params.result === false) {
      break;
    }
  }

  // if element is null, basic search - if element exists, don't store results to searchTerms
  if (element == null) {
    searchTerms[field] = params.searchElements;
    searchTerms[field].count = params.count;
  }

  return { results: params.searchElements, count: params.count };
}

// is there a way to do this with better performance?
// finds the index of the first text node in element starting at optional startIndex and returns. returns null (methods will set as 0) if there is no match
function findFirstTextNode(element, startIndex) {
  var index = null;
  startIndex = startIndex || 0;

  if (startIndex < textNodes.length) {
    for (var i = startIndex; i < textNodes.length; i++) {
      if ($.contains(element, textNodes[i])) {
        index = i;
        break;
      }
    }
  }

  return index;
}

// find all instances of searchTerm in the document and set data attribute
// returns a list of parent elements that contain the searchTerm ordered from param rowElement outwards (order: rowResults, leftResults, rightResults)
function searchOrderedText(searchTerm, field, rowElement, parentElement, nodeIndex, count) {
  var leftResults = {};
  var rowResults = {};

  var selector = parentElement || "body";
  parentElement = $(selector)[0];
  rowElement = $(rowElement)[0];
  count = count || 0;

  nodeIndex = nodeIndex || findFirstTextNode(parentElement);
  var params = {
                  nodeIndex: nodeIndex,
                  searchTerm: searchTerm,
                  searchElements: {},
                  field: field,
                  count: count,
                  text: "",
                  // holds last valid index
                  currentIndex: -1
                };

  // iterate through all children of element
  var children = parentElement.childNodes;
  for (var i = 0; i < children.length; i++) {

    // if child contains/equals rowElement, start calculating for right text
    if ($.contains(children[i], rowElement)) {
      // results hold left side
      leftResults = $.extend(true, {}, params.searchElements);

      var results = searchOrderedText(searchTerm, field, rowElement, children[i], params.nodeIndex, params.count);
      rowResults = results.results;
      count = results.count;

      while (i + 1 < children.length && !isValidNode(children[i + 1])) {
        i++;
      }

      // reset params for right side
      if (i + 1 < children.length) {
        nodeIndex = findFirstTextNode(children[i + 1], params.nodeIndex);

        params = {
                    nodeIndex: nodeIndex,
                    searchTerm: searchTerm,
                    searchElements: {},
                    field: field,
                    count: count,
                    text: "",
                    // holds last valid index
                    currentIndex: -1
                  };
      }
    }
    else if (children[i] === rowElement) {
      // results hold left side
      leftResults = $.extend(true, {}, params.searchElements);

      // returns results for rowElement
      var results = searchText(searchTerm, field, null, rowElement, params.nodeIndex, params.count);
      rowResults = results.results;
      count = results.count;

      while (i + 1 < children.length && !isValidNode(children[i + 1])) {
        i++;
      }

      // reset params for right side
      if (i + 1 < children.length) {
        nodeIndex = findFirstTextNode(children[i + 1], params.nodeIndex);

        params = {
                    nodeIndex: nodeIndex,
                    searchTerm: searchTerm,
                    searchElements: {},
                    field: field,
                    count: count,
                    text: "",
                    // holds last valid index
                    currentIndex: -1
                  };
      }
    }
    else {
      params = iterateText(children[i], findMatch, params);
    }
  }

  // if no valid nodes to right of container element, count may be greater than params.count
  if (params.count > count) {
    count = params.count;
  }

  var keys = Object.keys(rowResults);
  var leftKeys = Object.keys(leftResults);
  var rightKeys = Object.keys(params.searchElements);
  var keyCount;

  if (keys.length > 0) {
    for (var i = 0; i < keys.length; i++) {
      rowResults[i] = rowResults[keys[i]];
    }
    keyCount = keys.length;

    for (var i = 0; i < leftKeys.length; i++) {
      rowResults[i + keyCount] = leftResults[leftKeys[i]];
    }
    keyCount += leftKeys.length;

    for (var i = 0; i < rightKeys.length; i++) {
      rowResults[i + keyCount] = params.searchElements[rightKeys[i]];
    }

  }
  // no row results
  else if (leftKeys.length > 0) {
    for (var i = 0; i < leftKeys.length; i++) {
      rowResults[i] = leftResults[leftKeys[i]];
    }
    keyCount = leftKeys.length;

    for (var i = 0; i < rightKeys.length; i++) {
      rowResults[i + keyCount] = params.searchElements[rightKeys[i]];
    }
  }
  // no row results or left results
  else if (rightKeys.length > 0) {
    for (var i = 0; i < rightKeys.length; i++) {
      rowResults[i] = params.searchElements[rightKeys[i]];
    }
  }

  return { results: rowResults, count: count };
}

/* params: nodeIndex - index in textNodes iterated through
*          searchTerm - search term to match
*          searchElements - parent elements of found search terms
*          field - text field we are matching for
*          total - total # of matches found
*          count - current # of matches found
*          text - total plain-text of all passed text nodes
*          currentIndex - holds last valid index
*          result - set to false to break out of iterateText
*/
function findMatch(node, params) {

  var nodeValue = node.nodeValue.trim();
  var nodeIndex = params.nodeIndex;
  var searchTerm = params.searchTerm;
  var searchElements = params.searchElements;
  var field = params.field;
  var total = params.total;
  var count = params.count;
  var text = params.text;
  var currentIndex = params.currentIndex;

  if (text === "") {
    text = nodeValue;
  } else {
    text += " " + nodeValue;
  }
  console.log("nodeIndex: " + nodeIndex + " - " + nodeValue);
  console.log(textNodes[nodeIndex]);

  // if searchTerm is found, current text node is the end node for one count
  var index = text.toLowerCase().indexOf(searchTerm.toLowerCase(), currentIndex + 1);

  // if there is multiple instances of searchTerm in text (loops through while loop), use oldStartIndex to calculate startIndex
  var oldStartIndex, startNodeIndex;

  // stores the number of characters the start of searchTerm is from the end of text
  var charactersFromEnd = text.length - index;
  //console.log("charactersFromEnd: " + charactersFromEnd);

  // loop through text node in case there is more than one searchTerm instance in text
  while (index !== -1) {
    currentIndex = index;

    // remember how many text nodes before current node we are pulling from textNodes
    var textNodesBackIndex = nodeIndex - 1;
    console.log(textNodesBackIndex);

    // textSelection will contain a combined string of all text nodes where current searchTerm spans over
    var textSelection = nodeValue;
    var startNode;

    // set textSelection to contain prevSibling text nodes until the current searchTerm matches
    while (textSelection.length < charactersFromEnd) {
      console.log("textSelection.length: " + textSelection.length + " < " + charactersFromEnd);
      //console.log("old textSelection: " + textSelection);
      console.log("textnodesback index: " + textNodesBackIndex + " " + textNodes[textNodesBackIndex].nodeValue);

      textSelection = textNodes[textNodesBackIndex].nodeValue.trim() + " " + textSelection;
      //console.log("space added: " + textSelection);
      textNodesBackIndex--;
    }

    // use old startNodeIndex value before re-calculating it if its the same as new startNodeIndex
    // startIndex needs to ignore previous instances of text
    var startIndex;
    if (startNodeIndex != null && startNodeIndex === textNodesBackIndex + 1) {
      // find index searchTerm starts on in text node (or prevSibling)
      startIndex = textSelection.toLowerCase().indexOf(searchTerm.toLowerCase(), oldStartIndex + 1);
    } else {
      startIndex = textSelection.toLowerCase().indexOf(searchTerm.toLowerCase());
    }
    oldStartIndex = startIndex;

    // startNode contains beginning of searchTerm and node contains end of searchTerm
    var startNodeIndex = textNodesBackIndex + 1;
    // possibly null parentNode because highlighted text before, adding MARK tag and then removed it
    startNode = textNodes[startNodeIndex];
    //console.log("final textSelection: " + textSelection);

    if (startIndex !== -1) {
      // set parent as first element parent of textNode
      console.log("end parent");
      console.log(node);
      var endParent = node.parentNode;

      console.log("start parent");
      console.log(startNode);
      var startParent = startNode.parentNode;

      var targetParent;
      // start and end parents are the same
      if (startParent === endParent) {
        console.log("start parent is end parent");
        targetParent = startParent;
      }
      // start parent is target parent element
      else if ($.contains(startParent, endParent)) {
        console.log("start parent is larger");
        targetParent = startParent;
      }
      // end parent is target parent element
      else if ($.contains(endParent, startParent)) {
        console.log("end parent is larger");
        targetParent = endParent;
      }
      // neither parents contain one another
      else {
        console.log("neither parent contains the other");
        // iterate upwards until startParent contains endParent
        while (!$.contains(startParent, endParent) && startParent !== endParent) {
          startParent = startParent.parentNode;
          //console.log(startParent);
        }
        targetParent = startParent;
      }

      // set startNode to node before the parent we are calculating with
      if (textNodesBackIndex !== -1) {
        startNode = textNodes[textNodesBackIndex];
        textNodesBackIndex--;

        var startElement = startNode.parentNode;

        // continue adding text length to startIndex until parent elements are not contained in targetParent
        while (($.contains(targetParent, startElement) || targetParent === startElement) && textNodesBackIndex !== -1) {
          startIndex += startNode.nodeValue.trim().length + 1;
          startNode = textNodes[textNodesBackIndex];
          textNodesBackIndex--;
          startElement = startNode.parentNode;
        }
      }

      // find index searchTerm ends on in text node
      var endIndex = startIndex + searchTerm.length;
      /*console.log("start index: " + startIndex);
      console.log("end index: " + endIndex);*/

      // if a class for field search already exists, use that instead
      var dataField = "data-tworeceipt-" + field + "-search";
      if ($(targetParent).attr(dataField) != null) {
        console.log("EXISTING SEARCH ELEMENT");
        console.log($(targetParent).attr(dataField));
        searchElements[count] = {
          start: startIndex,
          end: endIndex,
          data: parseInt($(targetParent).attr(dataField)),
          startNodeIndex: startNodeIndex,
          endNodeIndex: nodeIndex
        };
      } else {
        searchElements[count] = {
          start: startIndex,
          end: endIndex,
          data: count,
          startNodeIndex: startNodeIndex,
          endNodeIndex: nodeIndex
        };
        console.log("NEW SEARCH ELEMENT");
        $(targetParent).attr(dataField, count);
        console.log($(targetParent));
      }

      console.log(searchElements[count]);

      count++;
    } else {
      console.log(textSelection);
      console.log(searchTerm);
    }

    index = text.toLowerCase().indexOf(searchTerm.toLowerCase(), currentIndex + 1);
    charactersFromEnd = text.length - index;
    //console.log("characters from end: " + charactersFromEnd);

    if (total != null && count === total) {
      console.log("Completed calculations for all matched searchTerms");
      nodeIndex++;
      return {
              nodeIndex: nodeIndex,
              searchTerm: searchTerm,
              searchElements: searchElements,
              field: field,
              total: total,
              count: count,
              text: text,
              currentIndex: currentIndex,
              result: false
            };
    }
  }
  nodeIndex++;
  return {
            nodeIndex: nodeIndex,
            searchTerm: searchTerm,
            searchElements: searchElements,
            field: field,
            total: total,
            count: count,
            text: text,
            currentIndex: currentIndex,
            result: true
          };
}

// loop through all searchTerms for field, adding possible search matches to front of searchTerms
function findRelevantMatches(field, type) {
  if (searchTerms.hasOwnProperty(field) && Object.keys(searchTerms[field]).length > 0) {
    var words = findMatchesByWord(field, type);
    // set searchTerms[field] to include words
    prependArrayToSearchTerms(words, field);

    var nodes = findMatchesByNode(field, type);
    // set searchTerms[field] to include nodes
    prependArrayToSearchTerms(nodes, field);

    var elements = findMatchesByElement(field, type);
    // set searchTerms[field] to include elements
    prependArrayToSearchTerms(elements, field);
  }
}

// prepends searchTerms[field] with param array and returns compiled object
function prependArrayToSearchTerms(array, field) {
  var index = 0;
  var collection = {};

  // add array to empty collection
  for (var i = 0; i < array.length; i++) {
    collection[index] = array[i];
    index++;
  }

  // add existing searchTerms to collection
  var keys = Object.keys(searchTerms[field]);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key !== "count") {
      collection[index] = searchTerms[field][key];
      index++;
    }
  }

  // set searchTerms as collection
  searchTerms[field] = collection;
  searchTerms[field].count = index;

  return collection;
}

// loop through all searchTerms for field, adding possible search matches to searchTerms while maintaining existing order
function findSortedRelevantMatches(field, type) {
  if (searchTerms.hasOwnProperty(field) && Object.keys(searchTerms[field]).length > 0) {

    var keys = Object.keys(searchTerms[field]);
    var words = findSortedMatchesByWord(field, type);
    // prepend each word to its indexed searchTerm match
    prependObjectToSearchTerms(keys, words, field);

    keys = Object.keys(searchTerms[field]);
    var nodes = findSortedMatchesByNode(field, type);
    // prepend each text node to its indexed searchTerm match
    prependObjectToSearchTerms(keys, nodes, field);

    keys = Object.keys(searchTerms[field]);
    var elements = findSortedMatchesByElement(field, type);
    // prepend each element to its indexed searchTerm match
    prependObjectToSearchTerms(keys, elements, field);
  }
}

// prepends each collection match with indexed match in object and returns compiled object
// keys are parametarized since unique keys can exist in both object and searchTerms
function prependObjectToSearchTerms(keys, object, field) {
  var index = 0;
  var collection = {};

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key !== "count") {
      // add object value for key to collection
      if (object.hasOwnProperty(key)) {
        collection[index] = object[key];
        index++;
      }

      // add existing value for key to collection
      if (searchTerms[field].hasOwnProperty(key)) {
        collection[index] = searchTerms[field][key];
        index++;
      }
    }
  }

  // set searchTerms as collection
  searchTerms[field] = collection;
  searchTerms[field].count = index;

  return collection;
}

// isNumeric from handsontable
function isNumeric(n) {
  var t = typeof n;
  return t == 'number' ? !isNaN(n) && isFinite(n) :
    t == 'string' ? !n.length ? false :
    n.length == 1 ? /\d/.test(n) :
    /^\s*[+-]?\s*(?:(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?)|(?:0x[a-f\d]+))\s*$/i.test(n) :
    t == 'object' ? !!n && typeof n.valueOf() == "number" && !(n instanceof Date) : false;
}

// returns an element match for searchTerms with params field and key for param type
function findElementMatch(field, key, type) {
  console.log("findMatchByElement: " + key);

  var fieldValue = getSearchTermProperty(field, "data", key);
  var startNodeIndex = getSearchTermProperty(field, "startNodeIndex", key);
  var endNodeIndex = getSearchTermProperty(field, "endNodeIndex", key);
  var startIndex = getSearchTermProperty(field, "start", key);
  var endIndex = getSearchTermProperty(field, "end", key);
      // code duplication so 'getSearchTermProperty' for data is not run twice
  var element = $("[data-tworeceipt-" + field + "-search='" + fieldValue + "']");

  var elementText = getDocumentText(element);

  // current searchTerm is already the element match
  if (startIndex === 0 && endIndex === elementText.length) {
    console.log("searchTerm is already match element");
    return;
  }

  // calculating for new searchTerm nodeIndex
  var newStartNodeIndex = startNodeIndex;
  // keep iterating backwards until start of textNodes, or textNode is not within element, or text node parent is not equal to element
  while (newStartNodeIndex !== 0 &&
         ($.contains(element[0], textNodes[newStartNodeIndex].parentNode) ||
         textNodes[newStartNodeIndex].parentNode === element[0])) {
    newStartNodeIndex--;
    console.log(newStartNodeIndex);
    console.log(textNodes[newStartNodeIndex].nodeValue);
  }
  newStartNodeIndex++;

  var newEndNodeIndex = endNodeIndex;
  // keep iterating forwards until end of textNodes, or textNode is not within element, or text node parent is not equal to element
  while (newEndNodeIndex !== textNodes.length - 1 &&
         ($.contains(element[0], textNodes[newEndNodeIndex].parentNode) ||
         textNodes[newEndNodeIndex].parentNode === element[0])) {
    newEndNodeIndex++;
    console.log(textNodes[newEndNodeIndex].nodeValue);
  }
  newEndNodeIndex--;

  startIndex = 0;
  endIndex = elementText.length;

  console.log("new search term: " + elementText);
  console.log(textNodes[newStartNodeIndex]);
  console.log(textNodes[newEndNodeIndex]);

  switch (type) {
    case "money":

      var dollarSign = elementText.indexOf("$");

      // $ in front of the dollar amount, if text starts with $ or text in front of $ is not numeric
      if (dollarSign === 0 || isNaN(parseInt(elementText.substring(0, dollarSign)))) {
        elementText = elementText.substring(dollarSign + 1);
        startIndex += 1 + dollarSign;
      }

      // money value must contain a decimal, trim symbol from end of dollar amount
      if (dollarSign === elementText.length - 1 || elementText.indexOf(".") === elementText.length - 1) {
        elementText = elementText.substring(0, elementText.length - 1);
        endIndex--;
      }
      else if (elementText.indexOf(".") === -1) {
        console.log("searchTerm is not numeric");
        return;
      }
    case "number":
      if (!isNumeric(elementText)) {
        console.log("searchTerm is not numeric");
        return;
      }
      break;
    default:
      break;
  }

  return {
    data: fieldValue,
    start: startIndex,
    end: endIndex,
    startNodeIndex: newStartNodeIndex,
    endNodeIndex: newEndNodeIndex
  };
}

// returns matches complete by element
function findMatchesByElement(field, type) {
  var keys = Object.keys(searchTerms[field]);
  var results = [];

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];

    // do not include 'count' key
    if (!isNaN(parseInt(key))) {
      var newSearchTerm = findElementMatch(field, key, type);
      if (newSearchTerm == null) {
        continue;
      }

      // only consider valid search terms
      if (isValidSearchTerm(newSearchTerm, type)) {
        // check all existing searchTerms for duplicates
        var duplicate = hasDuplicate(searchTerms[field], newSearchTerm);

        console.log(newSearchTerm);
        // delete any existing duplicate and add as a result (maintaining order)
        if (duplicate != null) {
          console.log("match duplicate");
          delete searchTerms[field][duplicate];
        }

        // check results for duplicates
        duplicate = hasDuplicate(results, newSearchTerm);

        // only add new result if it doesn't exist already
        if (duplicate != null) {
          console.log("results duplicate");
        } else {
          console.log("NOT duplicate");
          results.push(newSearchTerm);
        }
      }
    }
  }
  return results;
}

// returns matches complete by element, indexed by original key
function findSortedMatchesByElement(field, type) {
  var keys = Object.keys(searchTerms[field]);
  var results = {};

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];

    // do not include 'count' key
    if (!isNaN(parseInt(key))) {
      var newSearchTerm = findElementMatch(field, key, type);
      if (newSearchTerm == null) {
        continue;
      }

      // only consider valid search terms
      if (isValidSearchTerm(newSearchTerm, type)) {
        // check all existing searchTerms for duplicates
        var duplicate = hasDuplicate(searchTerms[field], newSearchTerm);

        console.log(newSearchTerm);
        // delete any existing duplicate and add as a result (maintaining order)
        if (duplicate != null) {
          console.log("match duplicate");
          delete searchTerms[field][duplicate];
        }

        // check results for duplicates
        duplicate = hasDuplicate(results, newSearchTerm);

        // only add new result if it doesn't exist already
        if (duplicate != null) {
          console.log("results duplicate");
        } else {
          console.log("NOT duplicate");
          results[key] = newSearchTerm;
        }
      }
    }
  }
  return results;
}

// returns a node match for searchTerms with params field and key for param type
function findNodeMatch(field, key, type) {
  console.log("findMatchByNode: " + key);

  var fieldValue = getSearchTermProperty(field, "data", key),
      startNodeIndex = getSearchTermProperty(field, "startNodeIndex", key),
      endNodeIndex = getSearchTermProperty(field, "endNodeIndex", key),
      // code duplication so 'getSearchTermProperty' for data is not run twice
      element = $("[data-tworeceipt-" + field + "-search='" + fieldValue + "']");

  // iterating to first text node of element, counting characters
  var nodeIndex = startNodeIndex - 1;
  var charCount = 0;
  while (nodeIndex > -1 &&
         ($.contains(element[0], textNodes[nodeIndex].parentNode) ||
          textNodes[nodeIndex].parentNode === element[0])) {
    charCount += textNodes[nodeIndex].nodeValue.trim().length + 1;
    nodeIndex--;
  }
  var startIndex = charCount;

  // iterate through textNodes from startNode to end of endNode, counting characters
  nodeIndex = startNodeIndex;
  while (nodeIndex < endNodeIndex && nodeIndex < textNodes.length) {
    charCount += textNodes[nodeIndex].nodeValue.trim().length + 1;
    nodeIndex++;
  }
  var endIndex = charCount + textNodes[endNodeIndex].nodeValue.trim().length;

  var elementText = getDocumentText(element);
  console.log("new search term: " + elementText.substring(startIndex, endIndex));

  switch (type) {
    case "money":
      var dollarSign = elementText.indexOf("$");

      // $ in front of the dollar amount, if text starts with $ or text in front of $ is not numeric
      if (dollarSign === 0 || isNaN(parseInt(elementText.substring(0, dollarSign)))) {
        elementText = elementText.substring(dollarSign + 1);
        startIndex += 1 + dollarSign;
      }

      // money value must contain a decimal, trim symbol from end of dollar amount
      if (dollarSign === elementText.length - 1 || elementText.indexOf(".") === elementText.length - 1) {
        elementText = elementText.substring(0, elementText.length - 1);
        endIndex--;
      }
      else if (elementText.indexOf(".") === -1) {
        console.log("searchTerm is not numeric");
        return;
      }

    case "number":
      if (!isNumeric(elementText)) {
        console.log("searchTerm is not numeric");
        return;
      }
      break;
    default:
      break;
  }

  return {
    data: fieldValue,
    start: startIndex,
    end: endIndex,
    startNodeIndex: startNodeIndex,
    endNodeIndex: endNodeIndex
  };
}

// returns matches complete by text node
function findMatchesByNode(field, type) {
  var keys = Object.keys(searchTerms[field]);
  var results = [];

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];

    // do not include 'count' key
    if (!isNaN(parseInt(key))) {
      var newSearchTerm = findNodeMatch(field, key, type);
      if (newSearchTerm == null) {
        continue;
      }

      // only consider valid search terms
      if (isValidSearchTerm(newSearchTerm, type)) {
        // check all existing searchTerms for duplicates
        var duplicate = hasDuplicate(searchTerms[field], newSearchTerm);

        console.log(newSearchTerm);
        // delete any existing duplicate and add as a result (maintaining order)
        if (duplicate != null) {
          console.log("match duplicate");
          delete searchTerms[field][duplicate];
        }

        // check results for duplicates
        duplicate = hasDuplicate(results, newSearchTerm);

        // only add new result if it doesn't exist already
        if (duplicate != null) {
          console.log("results duplicate");
        } else {
          console.log("NOT duplicate");
          results.push(newSearchTerm);
        }
      }
    }
  }
  return results;
}

// returns matches complete by text node, indexed by original key
function findSortedMatchesByNode(field, type) {
  var keys = Object.keys(searchTerms[field]);
  var results = {};

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];

    // do not include 'count' key
    if (!isNaN(parseInt(key))) {
      var newSearchTerm = findNodeMatch(field, key, type);
      if (newSearchTerm == null) {
        continue;
      }

      // only consider valid search terms
      if (isValidSearchTerm(newSearchTerm, type)) {
        // check all existing searchTerms for duplicates
        var duplicate = hasDuplicate(searchTerms[field], newSearchTerm);

        console.log(newSearchTerm);
        // delete any existing duplicate and add as a result (maintaining order)
        if (duplicate != null) {
          console.log("match duplicate");
          delete searchTerms[field][duplicate];
        }

        // check results for duplicates
        duplicate = hasDuplicate(results, newSearchTerm);

        // only add new result if it doesn't exist already
        if (duplicate != null) {
          console.log("results duplicate");
        } else {
          console.log("NOT duplicate");
          results[key] = newSearchTerm;
        }
      }
    }
  }
  return results;
}

// returns a word match for searchTerms with params field and key for param type
function findWordMatch(field, key, type) {
  console.log("findMatchByWord: " + key);

  var fieldValue = getSearchTermProperty(field, "data", key);
  var startNodeIndex = getSearchTermProperty(field, "startNodeIndex", key);
  var endNodeIndex = getSearchTermProperty(field, "endNodeIndex", key);
  var startIndex = getSearchTermProperty(field, "start", key);
  var endIndex = getSearchTermProperty(field, "end", key);
  // code duplication so 'getSearchTermProperty' for data is not run twice
  var element = $("[data-tworeceipt-" + field + "-search='" + fieldValue + "']");

  // check if there are any non-space characters to left / right of indices
  var elementText = getDocumentText(element);
  var startText = elementText.substring(0, startIndex);
  //console.log(startText);
  // while there are no spaces from the end of startText, subtract characters from startIndex
  var charIndex = startText.length - 1;
  while (startText.charAt(charIndex).match(/\s/) === null && charIndex !== -1) {
    charIndex--;
    startIndex--;
  }

  var endText = elementText.substring(endIndex);
  //console.log(endText);
  charIndex = 0;
  while (endText.charAt(charIndex).match(/\s/) === null && charIndex !== endText.length) {
    charIndex++;
    endIndex++;
  }

  var finalText = elementText.substring(startIndex, endIndex);
  console.log("new search term: " + finalText);

  switch (type) {
    case "money":
      // remove all exact matches for money category
      delete searchTerms[field][key];

      var dollarSign = finalText.indexOf("$");

      // $ in front of the dollar amount, if text starts with $ or text in front of $ is not numeric
      if (dollarSign === 0 || isNaN(parseInt(finalText.substring(0, dollarSign)))) {
        finalText = finalText.substring(dollarSign + 1);
        startIndex += 1 + dollarSign;
      }

      // money value must contain a decimal, trim symbol from end of dollar amount
      if (dollarSign === finalText.length - 1 || finalText.indexOf(".") === finalText.length - 1) {
        finalText = finalText.substring(0, finalText.length - 1);
        endIndex--;
      }
      else if (finalText.indexOf(".") === -1) {
        console.log("searchTerm is not numeric");
        return;
      }
    case "number":
      if (!isNumeric(finalText)) {
        console.log("searchTerm is not numeric");
        // remove exact match search term if the word is not completely numeric
        console.log(searchTerms[field][key]);
        if (searchTerms[field].hasOwnProperty(key)) {
          delete searchTerms[field][key];
        }
        return;
      }
      break;
    default:
      break;
  }

  return {
    data: fieldValue,
    start: startIndex,
    end: endIndex,
    startNodeIndex: startNodeIndex,
    endNodeIndex: endNodeIndex
  };
}

// returns matches complete by word (separated by space characters/text nodes)
function findMatchesByWord(field, type) {
  var keys = Object.keys(searchTerms[field]);
  var results = [];

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];

    // do not include 'count' key
    if (!isNaN(parseInt(key))) {
      var newSearchTerm = findWordMatch(field, key, type);
      if (newSearchTerm == null) {
        continue;
      }

      // only consider valid search terms
      if (isValidSearchTerm(newSearchTerm, type)) {
        // check all existing searchTerms for duplicates
        var duplicate = hasDuplicate(searchTerms[field], newSearchTerm);

        console.log(newSearchTerm);
        // delete any existing duplicate and add as a result (maintaining order)
        if (duplicate != null) {
          console.log("match duplicate");
          delete searchTerms[field][duplicate];
        }

        // check results for duplicates
        duplicate = hasDuplicate(results, newSearchTerm);

        // only add new result if it doesn't exist already
        if (duplicate != null) {
          console.log("results duplicate");
        } else {
          console.log("NOT duplicate");
          results.push(newSearchTerm);
        }
      }
    }
  }
  return results;
}

// returns matches complete by word, indexed by original key
function findSortedMatchesByWord(field, type) {
  var keys = Object.keys(searchTerms[field]);
  var results = {};

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];

    // do not include 'count' key
    if (!isNaN(parseInt(key))) {
      var newSearchTerm = findWordMatch(field, key, type);
      if (newSearchTerm == null) {
        continue;
      }

      // only consider valid search terms
      if (isValidSearchTerm(newSearchTerm, type)) {
        // check all existing searchTerms for duplicates
        var duplicate = hasDuplicate(searchTerms[field], newSearchTerm);

        console.log(newSearchTerm);
        // delete any existing duplicate and add as a result (maintaining order)
        if (duplicate != null) {
          console.log("match duplicate");
          delete searchTerms[field][duplicate];
        }

        // check results for duplicates
        duplicate = hasDuplicate(results, newSearchTerm);

        // only add new result if it doesn't exist already
        if (duplicate != null) {
          console.log("results duplicate");
        } else {
          console.log("NOT duplicate");
          results[key] = newSearchTerm;
        }
      }
    }
  }
  return results;
}

// returns true if newSearchTerm is valid
function isValidSearchTerm(searchTerm, type) {
  if (type !== "number") {
    // selection length is not too long 200+ / short 3-
    if (searchTerm.end - searchTerm.start >= 200 || searchTerm.end - searchTerm.start <= 3) {
      return false;
    } else if (searchTerm.startNodeIndex > searchTerm.endNodeIndex) {
      return false;
    } else {
      return true;
    }
  } else {
    // selection length is not too long 200+
    if (searchTerm.end - searchTerm.start >= 200 || searchTerm.end - searchTerm.start <= 0) {
      return false;
    } else if (searchTerm.startNodeIndex > searchTerm.endNodeIndex) {
      return false;
    } else {
      return true;
    }
  }
}

// returns true if newSearchTerm is a duplicate of a searchTerm in searchTerms[field]
function hasDuplicate(collection, newSearchTerm) {
  var duplicate = null;

  // collection is an array
  if (Array.isArray(collection)) {
    for (var i = 0; i < collection.length; i++) {
      var value = collection[i];

      if (value.data === newSearchTerm.data &&
          value.start === newSearchTerm.start &&
          value.end === newSearchTerm.end &&
          value.nodeIndex === newSearchTerm.nodeIndex) {
        duplicate = i;
        break;
      }
    }
  }
  // collection is an object
  else {
    var keys = Object.keys(collection);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = collection[key];

      if (key !== "count" &&
          value.data === newSearchTerm.data &&
          value.start === newSearchTerm.start &&
          value.end === newSearchTerm.end &&
          value.nodeIndex === newSearchTerm.nodeIndex) {
        duplicate = key;
        break;
      }
    }
  }
  return duplicate;
}

// returns an array of matches for the parameter field - [ { label: "", value: "" }, { label: "", value: "" } ]
// format is intended as a jquery ui autocomplete source
// format for receipt items is intended for handsontable autocomplete (indices start from 0)
function getMatches(field, itemIndex) {
  if (searchTerms.hasOwnProperty(field) && Object.keys(searchTerms[field]).length > 0) {
    var matches = [];
    var keys = Object.keys(searchTerms[field]);
    for (var index = 0; index < keys.length; index++) {
      if (keys[index] !== "count") {
        var text = findMatchText(field, keys[index]);
        console.log(text);
        if (itemIndex != null) {
          matches.push(text);
        } else {
          matches.push({ "label": text, "value": keys[index] });
        }
      }
    }
    return matches;
  } else {
    return [];
  }
}

function getMatchElement(field, index) {
  return $("[data-tworeceipt-" + field + "-search='" + getSearchTermProperty(field, "data", index) + "']");
}

function getSearchTermProperty(field, property, index) {
  var result = -1;
  if (searchTerms.hasOwnProperty(field) && searchTerms[field].hasOwnProperty(index) && searchTerms[field][index].hasOwnProperty(property)) {
    result = searchTerms[field][index][property];
  }
  return result;
}

// find exact matched text stored on searchTerms
function findMatchText(field, index) {
  var element = getMatchElement(field, index),
      startIndex = getSearchTermProperty(field, "start", index),
      endIndex = getSearchTermProperty(field, "end", index),
      text = "";

  if ($(element).length > 0) {
    text = getDocumentText(element);
    console.log("startIndex: " + startIndex + ", endIndex: " + endIndex);
    console.log(text);
    if (text.length !== 0 && startIndex !== -1 && endIndex !== -1) {
      text = text.substring(startIndex, endIndex);
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
  if (index != null) {
    var element = getMatchElement(field, index),
        startIndex = getSearchTermProperty(field, "start", index),
        endIndex = getSearchTermProperty(field, "end", index),
        startNodeIndex = getSearchTermProperty(field, "startNodeIndex", index),
        params = { startIndex: startIndex, endIndex: endIndex, currentIndex: 0, nodeIndex: startNodeIndex, result: true };

    // look for start and end index within element
    if ($(element).length > 0) {
      var children = $(element)[0].childNodes;
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        params = iterateText(child, highlightText, params);

        if (params.result === false) {
          break;
        }
      }
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
    var dataField = "data-tworeceipt-" + field;
    if (index != null) {
      dataField += index;
    }

    var element = $("[" + dataField + "-start]");
    if (element.length > 0 && element[0] != null) {
      var startIndex = element.attr(dataField + "-start");
      var endIndex = element.attr(dataField + "-end");
      var startNodeIndex = element.attr(dataField + "-node");

      var params = { startIndex: startIndex, endIndex: endIndex, currentIndex: 0, nodeIndex: startNodeIndex, result: true };

      // look for start and end index within element
      var children = $(element)[0].childNodes;
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        params = iterateText(child, highlightText, params);

        if (params.result === false) {
          break;
        }
      }
    } else {
      console.log("element " + field + " does not exist. data field text not highlighted");
    }
  }
}

/* params:  startIndex - the character index where the highlighting should start
*           endIndex - the character index where the highlighting should end before
*           currentIndex - placeholder for how many indices have been passed so far
*           nodeIndex - placeholder for index in textNodes (only updates on match)
*           result - set to false to break out of iterateText
*/
function highlightText(node, params) {
  var currentIndex = params.currentIndex,
      text = node.nodeValue.trim(),
      result = true,
      spaceBuffer = 1,
      nodeIndex = params.nodeIndex;

  // track whitespace trimmed, so replaced text node will be identical to existing
  var leftTrimNum = node.nodeValue.indexOf(text);
  var leftTrim = node.nodeValue.substring(0, leftTrimNum);
  var rightTrimNum = node.nodeValue.length - text.length - leftTrimNum;
  var rightTrim = node.nodeValue.substring(node.nodeValue.length - rightTrimNum);

  // for first node, do not include space at start of text
  if (currentIndex === 0) {
    spaceBuffer = 0;
  }

  var startChar = -1, endChar = -1;
  var nextIndex = currentIndex + text.length + spaceBuffer;
  /*console.log(text.length + " " + text);
  console.log("current index: " + currentIndex);
  console.log("start index: " + params.startIndex);
  console.log("end index: " + params.endIndex);
  console.log("next index: " + nextIndex);*/
  // highlight from start of text node
  if (currentIndex >= params.startIndex && currentIndex < params.endIndex) {
    startChar = 0;
  }
  // highlight from middle of text node
  else if (currentIndex < params.startIndex && nextIndex >= params.startIndex) {
    startChar = params.startIndex - currentIndex - spaceBuffer;
  }

  // highlight to end of text node
  if (nextIndex >= params.startIndex && nextIndex < params.endIndex) {
    endChar = null;
  }
  // highlight to middle of text node
  else if (currentIndex < params.endIndex && nextIndex >= params.endIndex) {
    endChar = text.length - (nextIndex - params.endIndex);
    // stop iterating when current index is past highlight target
    result = false;
  }
  console.log("start: " + startChar);
  console.log("end: " + endChar);
  currentIndex = nextIndex;

  if (startChar !== -1) {
    var leftText = text.substring(0, startChar);
    var rightText = "";
    var markText = "";
    if (endChar !== null) {
      rightText = text.substring(endChar);
      markText = text.substring(startChar, endChar);
    } else {
      markText = text.substring(startChar);
    }

    var tempNode = document.createElement("span");
    tempNode.setAttribute("name", "twoReceiptHighlight");
    tempNode.setAttribute("data-node-index", nodeIndex);
    tempNode.innerHTML = leftTrim + leftText +
                          "<mark>" + markText + "</mark>" +
                          rightText + rightTrim;
    node.parentNode.insertBefore(tempNode, node);
    node.parentNode.removeChild(node);

    nodeIndex++;
  }

  return {
          "startIndex": params.startIndex,
          "endIndex": params.endIndex,
          "currentIndex": currentIndex,
          "nodeIndex": nodeIndex,
          "result": result
         };
}

// returns highlighted text to its original form
function cleanHighlight() {
  var highlightSpan = $("[name='twoReceiptHighlight']");
  if (highlightSpan.length > 0) {
    console.log("CLEAN HIGHLIGHT");
    highlightSpan.each(function(index) {
      var node = highlightSpan[index];
      var element = highlightSpan.eq(index);
      var nodeIndex = element.attr("data-node-index");
      var params = { "text": "", "trim": false, "whitespace": true };
      params = iterateText(node, addText, params);

      var textNode = document.createTextNode(params.text);
      node.parentNode.insertBefore(textNode, node);
      node.parentNode.removeChild(node);

      // set textNodes reference to new text node
      textNodes[nodeIndex] = textNode;
      console.log(textNode);
    });
  }
}

// removes data-tworeceipt-field-search attribute from all elements (if optional key, only that element)
// if field is null, removes data attributes for all searchTerms fields
function cleanElementData(field, key) {
  if (field) {
    var dataField = "data-tworeceipt-" + field + "-search";
    if (key) {
      dataField += "='" + key + "'";
    }
    var elements = $("[" + dataField + "]");
    for (var index = 0; index < elements.length; index++) {
      elements.eq(index).removeAttr(dataField);
    }
    delete searchTerms[field];

  } else {
    var keys = Object.keys(searchTerms);
    for (var i = 0; i < keys.length; i++) {
      var field = keys[i];

      var dataField = "data-tworeceipt-" + field + "-search";
      var elements = $("[" + dataField + "]");
      for (var index = 0; index < elements.length; index++) {
        elements.eq(index).removeAttr(dataField);
      }
    }
    searchTerms = {};
  }
}

// initializes textNodes and retrieves document text
function initializeContentSearch() {
  var selector = "body",
      params = { "text": "", "trim": true, "textNodes": [] };

  // iterate through all children of body element
  if ($(selector).length > 0) {
    var children = $(selector)[0].childNodes;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      params = iterateText(child, initTextNodes, params);
    }
    textNodes = params.textNodes;
  } else {
    console.log("element does not exist. no text retrieved");
  }
  return params.text;
}

// stores text node in param textNodes and calls addText
function initTextNodes(node, params) {
  params.textNodes.push(node);
  params = addText(node, params);
  return params;
}

// retrieves the text contents of a optional param element or document body
function getDocumentText(element) {
  element = $(element) || $("body");
  var params = { "text": "", "trim": true };

  // iterate through all children of body element
  if (element.length > 0) {
    var children = element[0].childNodes;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      params = iterateText(child, addText, params);
    }
  } else {
    console.log("element does not exist. no text retrieved");
  }
  return params.text;
}

function isValidNode(node) {
  var valid = false;
  if (node.nodeType === 3 && /\S/.test(node.nodeValue)) {
    valid = true;
  }
  // iterateText through children of non-style/script elements
  else if (node.nodeType === 1 && node.childNodes.length > 0 && !/(style|script)/i.test(node.tagName)) {
    var style = window.getComputedStyle(node);
    // ignore hidden elements
    if (style.visibility !== "hidden" && style.display !== "none") {
      var children = node.childNodes;
      valid = true;
    }
  }
  return valid;
}

function iterateText(node, method, methodParams) {
  // run method for non-whitespace text nodes
  if (node.nodeType === 3 && /\S/.test(node.nodeValue)) {
    methodParams = method(node, methodParams);
  }
  // exception case to include whitespace text nodes
  else if (node.nodeType === 3 && methodParams.whitespace !== undefined) {
    methodParams = method(node, methodParams);
  }
  // iterateText through children of non-style/script elements
  else if (node.nodeType === 1 && node.childNodes.length > 0 && !/(style|script)/i.test(node.tagName)) {
    var style = window.getComputedStyle(node);
    // ignore hidden elements
    if (style.visibility !== "hidden" && style.display !== "none") {
      var children = node.childNodes;
      for (var i = 0; i < children.length; i++) {
        var child = children[i];

        methodParams = iterateText(child, method, methodParams);
        if (methodParams.result != null && methodParams.result === false) {
          break;
        }
      }
    }
  }
  return methodParams;
}

// set attributes field, index implies receipt item
function setFieldText(element, start, end, field, index, startNodeIndex) {
  var dataField = "data-tworeceipt-" + field;
  if (index != null) {
    dataField += index;
    if (attributes.items[index] == null) {
      attributes.items[index] = {};
    }
    attributes.items[index][field] = true;
  } else {
    attributes[field] = true;
  }

  element.attr(dataField + "-start", start);
  element.attr(dataField + "-end", end);
  element.attr(dataField + "-node", startNodeIndex);
}

// removes data-tworeceipt-field-start and -end attributes for selected field (index for receipt items)
// if field is null, removes all -start and -end attributes for all fields
function cleanFieldText(field, index) {
  if (field) {
    var dataField = "data-tworeceipt-" + field;
    if (index != null) {
      dataField += index;

      if (attributes.items.hasOwnProperty(index) && attributes.items[index].hasOwnProperty(field)) {
        delete attributes.items[index][field];
        if (Object.keys(attributes.items[index]).length === 0) {
          delete attributes.items[index];
        }
      }
    } else if (attributes.hasOwnProperty(field)) {
      delete attributes[field];
    }

    var element = $("[" + dataField + "-start]");
    if (element.length > 0) {
      element.attr(dataField + "-start", null);
      element.attr(dataField + "-end", null);
      element.attr(dataField + "-node", null);
    } else {
      console.log("element " + field + " does not exist. data field text not removed");
    }
  } else {
    var keys = Object.keys(attributes);
    for (var i = 0; i < keys.length; i++) {
      var field = keys[i];

      if (field === "items") {
        var itemKeys = Object.keys(attributes.items);
        for (var j = 0; j < itemKeys.length; j++) {
          var itemIndex = itemKeys[j];
          var itemValue = attributes.items[itemIndex];

          var itemAttributeKeys = Object.keys(itemValue);
          for (var k = 0; k < itemAttributeKeys.length; k++) {
            var itemAttribute = itemAttributeKeys[k];
            var dataField = "data-tworeceipt-" + itemAttribute + itemIndex + "-start";
            var element = $("[" + dataField + "]");
            if (element.length > 0) {
              element.attr(dataField + "-start", null);
              element.attr(dataField + "-end", null);
              element.attr(dataField + "-node", null);
            } else {
              console.log("element " + itemAttribute + itemIndex + " does not exist. data field text not removed");
            }
          }
        }
      } else {
        var dataField = "data-tworeceipt-" + field + "-start";
        var element = $("[" + dataField + "]");
        if (element.length > 0) {
          element.attr(dataField + "-start", null);
          element.attr(dataField + "-end", null);
          element.attr(dataField + "-node", null);
        } else {
          console.log("element " + field + " does not exist. data field text not removed");
        }
      }
    }

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
