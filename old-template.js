// methods to format template the old way (in eventPage.js)

// check what manual changes were done to pulled data on receipt save
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
  // add+trim text/removed text
  else if (saved_string.length < template_string.length) {
    //var temp_template = calculate
    
    /*if (temp_template == null) {
      
    }*/
    
    console.log("removed text");
    template = calculateRemovedText(template, saved_string);
  }
  // add+trim text/drastic change
  else {
    //template = calculate
    //template = null;
  }
  return template;
}

// modifies template if text added to saved_string is found in template html, returns null if not
function calculateAddedText(template, saved_string) {
  
  // calculate left_text & right_text from text added-on to saved_string
  var first_index = saved_string.indexOf(template.selection);
  var second_index = first_index + template.selection.length;
  var left_text = saved_string.substring(0, first_index);
  var right_text = saved_string.substring(second_index);
  console.log("left_text: " + left_text);
  console.log("right_text: " + right_text);
  
  // parseHTML does not track body or html tags, so used div
  var html, $doc, element;
  
  // compare characters left of TEXT_ID
  if (left_text.length > 0) {
    html = "<div>" + template.html + "</div>";
    $doc = $($.parseHTML(html));
    element = $doc.find(".TwoReceipt").first();
    
    first_index = element.text().indexOf(TEXT_ID);
  
    var left_node, left_node_text;
    // first_index selects one character past the one we are calculating with
    // TEXT_ID is at the beginning of the element, switch elements
    if (first_index == 0) {
      left_node = findNextNode("left", element[0]);
      left_node_text = left_node.nodeValue;
      first_index = left_node_text.length;
    } else {      
      left_node = findTextNodeInElement("left", element[0]);
      // pick node to the left of left_node if TEXT_ID is at the start
      if (left_node.nodeValue.indexOf(TEXT_ID) == 0) {
        left_node = findNextNode("left", left_node);
        left_node_text = left_node.nodeValue;
        first_index = left_node_text.length;
      } else {
        left_node_text = left_node.nodeValue;
        first_index = left_node_text.indexOf(TEXT_ID);
      }
    }
    
    for (var count = left_text.length - 1; count >= 0; count--) {
      // ignore user-entered space
      if (!isBlank(left_text.charAt(count))) {
        first_index--;
        
        // character at beginning of element, switch elements
        if (first_index < 0) {
          left_node = findNextNode("left", left_node);
          left_node_text = left_node.nodeValue;
          first_index = left_node_text.length - 1;
        }
        left_character = left_node_text.charAt(first_index);
        
        while (left_character != left_text.charAt(count)) {
          // return null if a non-blank character is mis-matched
          if (!isBlank(left_character)) {
            console.log("left: returning null " + left_character + "-" + left_text.charAt(count));
            return null;
          } else {
            console.log("left: " + left_character + "-" + left_text.charAt(count));
          }
          
          first_index--;
          
          // character at beginning of element, switch elements
          if (first_index < 0) {
            left_node = findNextNode("left", left_node);
            left_node_text = left_node.nodeValue;
            first_index = left_node_text.length - 1;
          }
          left_character = left_node_text.charAt(first_index);
        }
      }
    }
    
    // insert TEXT_ID to the left of first_index
    if (first_index < 0) {
      left_node.nodeValue = TEXT_ID + left_node.nodeValue;
    } else {
      left_node.nodeValue = left_node.nodeValue.substring(0, first_index) + TEXT_ID + left_node.nodeValue.substring(first_index);
    }
    
    // remove 2nd TEXT_ID from html (replaced by 1st)
    html = $doc.eq(0).html();
    var temp_index = -1;
    for (var count = 0; count < 2; count++) {
      temp_index = html.indexOf(TEXT_ID, temp_index + 1);
      // remove nested instances
      if (count != 0) {
        html = html.substring(0, temp_index) + html.substring(temp_index + TEXT_ID.length);
      }
    }
    // update html without invalid TEXT_IDs
    $doc.eq(0).html(html);
  }
  
  // compare characters right of TEXT_ID
  if (right_text.length > 0) {
    // if left case was applied, right side needs $doc to be reset or won't work, because of html modification
    if (html == null) {
      html = "<div>" + template.html + "</div>";
    } else {
      html = "<div>" + html + "</div>";
    }
    $doc = $doc = $($.parseHTML(html));
    element = $doc.find(".TwoReceipt").first();
    
    second_index = element.text().lastIndexOf(TEXT_ID) + TEXT_ID.length;
  
    var right_node, right_node_text;
    // second_index selects one character behind the one we are calculating with
    // TEXT_ID is at the end of the element, switch_elements
    if (second_index == element.text().length) {
      right_node = findNextNode("right", element[0]);
      right_node_text = right_node.nodeValue;
      second_index = -1;
    } else {
      right_node = findTextNodeInElement("right", element[0]);
      // pick node to the right of right_node if TEXT_ID is at the end
      if (right_node.nodeValue.lastIndexOf(TEXT_ID) == right_node.nodeValue.length - TEXT_ID.length) {
        right_node = findNextNode("right", right_node);
        right_node_text = right_node.nodeValue;
        second_index = -1;
      } else {
        right_node_text = right_node.nodeValue;
        second_index = right_node.nodeValue.lastIndexOf(TEXT_ID) + TEXT_ID.length - 1;
      }
    }
    
    // go from left to right
    for (var count = 0; count < right_text.length; count++) {
      // ignore user-entered space
      if (!isBlank(right_text.charAt(count))) {
        second_index++;
        
        // character at end of element, switch elements
        if (second_index == right_node_text.length) {
          right_node = findNextNode("right", right_node);
          right_node_text = right_node.nodeValue;
          second_index = 0;
        }
        right_character = right_node_text.charAt(second_index);
      
        while (right_character != right_text.charAt(count)) {
          // return null if a non-blank character is mis-matched
          if (!isBlank(right_character)) {
            console.log("right: returning null " + right_character + "-" + right_text.charAt(count));
            return null;
          } else {
            console.log("right: " + right_character + "-" + right_text.charAt(count));
          }
          
          second_index++;
          
          // character at end of element, switch elements
          if (second_index == right_node_text.length) {
            right_node = findNextNode("right", right_node);
            right_node_text = right_node.nodeValue;
            second_index = 0;
          }
          right_character = right_node_text.charAt(second_index);
        }
      }
    }
    
    second_index++;
    
    // insert TEXT_ID to the right of second_index
    if (second_index >= right_node_text.length) {
      right_node.nodeValue = right_node.nodeValue + TEXT_ID + "";
    } else {
      right_node.nodeValue = right_node.nodeValue.substring(0, second_index) + TEXT_ID + right_node.nodeValue.substring(second_index);
    }
    
    // remove 2nd TEXT_ID from html (replaced by 3rd)
    html = $doc.eq(0).html();
    var temp_index = -1;
    for (var count = 0; count < 2; count++) {
      temp_index = html.indexOf(TEXT_ID, temp_index + 1);
      // remove nested instances
      if (count != 0) {
        html = html.substring(0, temp_index) + html.substring(temp_index + TEXT_ID.length);
      }
    }
    // update html without invalid TEXT_IDs
    $doc.eq(0).html(html);
  }
  
  // set TwoReceipt class for doc html (first element that contains both TEXT_ID instances)
  element = $doc.find(".TwoReceipt").first();
  var original_element = element;
  first_index = element.text().indexOf(TEXT_ID);
  second_index = element.text().indexOf(TEXT_ID, first_index + 1);
  while (first_index == -1 || second_index == -1) {
    if (element.parent().length == 0) {
      return null;
    } else {
      element = element.parent();
    }
    first_index = element.text().indexOf(TEXT_ID);
    second_index = element.text().indexOf(TEXT_ID, first_index + 1);
  }
  
  original_element.removeClass(CLASS_NAME);
  element.addClass(CLASS_NAME);
  
  // modify template values
  template.selection = saved_string;
  template.element = element[0].outerHTML;
  template.html = $doc.eq(0).html();
  console.log(template);
  return template;
}

// returns (child) node immediately to the [direction] of param node
function findNextNode(direction, node) {
  if (direction == "left") {
    do {
      // move to previousSiblings until they exist
      while (node.previousSibling == null) {
        if (node.parentNode != null) {
          node = node.parentNode;
        } else {
          console.log("No parent node for " + direction);
          return null;
        }
      }
      console.log("prev sibling");
      node = node.previousSibling;
      
      // traverse children till deepest child node
      while (node.childNodes.length > 0) {
        node = node.childNodes[node.childNodes.length - 1];
      }
    }
    // looking for non-blank text node
    while (node.nodeType != Node.TEXT_NODE || (node.nodeType == Node.TEXT_NODE && isBlank(node.nodeValue)))
  } else {
    do {
      // move to nextSiblings until they exist
      while (node.nextSibling == null) {
        if (node.parentNode != null) {
          node = node.parentNode;
        } else {
          console.log("No parent node for " + direction);
          return null;
        }
      }
      console.log("next sibling");
      node = node.nextSibling;
      
      // traverse children till deepest child node
      while (node.childNodes.length > 0) {
        node = node.childNodes[0];
      }
    }
    // looking for non-blank text node
    while (node.nodeType != Node.TEXT_NODE || (node.nodeType == Node.TEXT_NODE && isBlank(node.nodeValue)))
  }
  return node;
}

// returns (child) node farthest [direction] in element that contains TEXT_ID
function findTextNodeInElement(direction, element) {
  if (direction == "left") {
    // find node for element
    var node = element.childNodes[0];
    while (node.childNodes.length > 0) {
      node = node.childNodes[0];
    }
    
    // iterate right through element until node contains TEXT_ID
    var previous_node, const_index;
    if (node.nodeValue == null) {
      const_index = -1;
    } else {
      const_index = node.nodeValue.indexOf(TEXT_ID);
    }
    while (const_index == -1) {
      //previous_node = node;
      node = findNextNode("right", node);
      if (node.nodeValue == null) {
        const_index = -1;
      } else {
        const_index = node.nodeValue.indexOf(TEXT_ID);
      }
    }
    return node;
  } else {
    // find node for element
    var node = element.childNodes[element.childNodes.length - 1];
    while (node.childNodes.length > 0) {
      node = node.childNodes[node.childNodes.length - 1];
    }
    
    // iterate left through element until node contains TEXT_ID
    var previous_node, const_index;
    if (node.nodeValue == null) {
      const_index = -1;
    } else {
      const_index = node.nodeValue.indexOf(TEXT_ID);
    }
    while (const_index == -1) {
      //previous_node = node;
      node = findNextNode("left", node);
      if (node.nodeValue == null) {
        const_index = -1;
      } else {
        const_index = node.nodeValue.indexOf(TEXT_ID);
      }
    }
    return node;
  }
}

// returns modified template
function calculateTrimmedText(template, saved_string) {

  // calculate left_text & right_text of text trimmed from template selection
  var first_index = template.selection.indexOf(saved_string);
  var second_index = first_index + saved_string.length;
  var left_text = template.selection.substring(0, first_index);
  var right_text = template.selection.substring(second_index);
  console.log("left_text: " + left_text);
  console.log("right_text: " + right_text);
  
  // parseHTML does not track body or html tags, so used div
  var html, $doc, element;

  // compare characters trimmed from left TEXT_ID
  if (left_text.length > 0) {
    html = "<div>" + template.html + "</div>";
    $doc = $($.parseHTML(html));
    element = $doc.find(".TwoReceipt").first();
    first_index = element.text().indexOf(TEXT_ID);
    
    var left_node = findTextNodeInElement("left", element[0]);
    var left_node_text;
    // first_index selects one character before the one we are calculating with
    // if TEXT_ID is at the end of the node, take node to the right
    if (left_node.nodeValue.indexOf(TEXT_ID) == left_node.nodeValue.length - TEXT_ID.length) {
      left_node = findNextNode("right", left_node);
      left_node_text = left_node.nodeValue;
      first_index = -1;
    } else {
      left_node_text = left_node.nodeValue;
      first_index = left_node_text.indexOf(TEXT_ID) + TEXT_ID.length - 1;
    }
    
    // go from left to right
    for (var count = 0; count < left_text.length; count++) {
      // ignore user-entered space
      if (!isBlank(left_text.charAt(count))) {
        first_index++;
        
        // character at end of element, switch elements
        if (first_index == left_node_text.length) {
          left_node = findNextNode("right", left_node);
          left_node_text = left_node.nodeValue;
          first_index = 0;
        }
        left_character = left_node_text.charAt(first_index);
        
        while (left_character != left_text.charAt(count)) {
          // return null if a non-blank character is mis-matched
          if (!isBlank(left_character)) {
            console.log("left: returning null " + left_character + "-" + left_text.charAt(count));
            return null;
          } else {
            console.log("left: " + left_character + "-" + left_text.charAt(count));
          }
          
          first_index++;
          
          // character at end of element, switch elements
          if (first_index == left_node_text.length) {
            left_node = findNextNode("right", left_node);
            left_node_text = left_node.nodeValue;
            first_index = 0;
          }
          left_character = left_node_text.charAt(first_index);
        }
      }
    }
    
    // insert TEXT_ID to the right of first_index
    first_index++;
    if (first_index == left_node_text.length) {
      left_node.nodeValue = TEXT_ID + left_node.nodeValue;
    } else {
      left_node.nodeValue = left_node.nodeValue.substring(0, first_index) + TEXT_ID + left_node.nodeValue.substring(first_index);
    }
    
    // remove first TEXT_ID from html
    html = $doc.eq(0).html();
    var temp_index = html.indexOf(TEXT_ID);
    html = html.substring(0, temp_index) + html.substring(temp_index + TEXT_ID.length);
    // update html without invalid TEXT_IDs
    $doc.eq(0).html(html);
  }
  
  // compare characters trimmed from right TEXT_ID
  if (right_text.length > 0) {
    // if left case was applied, right side needs $doc to be reset or won't work, because of html modification
    if (html == null) {
      html = "<div>" + template.html + "</div>";
    } else {
      html = "<div>" + html + "</div>";
    }
    $doc = $($.parseHTML(html));
    element = $doc.find(".TwoReceipt").first();
    second_index = element.text().indexOf(TEXT_ID, first_index + 1) + TEXT_ID.length;
  
    var right_node = findTextNodeInElement("right", element[0]);
    var right_node_text;
    // second_index selects one character past the one we are calculating with
    // if TEXT_ID is at the beginning of the node, take node to the left
    if (right_node.nodeValue.lastIndexOf(TEXT_ID) == 0) {
      right_node = findNextNode("left", right_node);
      right_node_text = right_node.nodeValue;
      second_index = right_node_text.length;
    } else {
      right_node_text = right_node.nodeValue;
      second_index = right_node_text.lastIndexOf(TEXT_ID);
    }
    
    // go from right to left
    for (var count = right_text.length - 1; count >= 0; count--) {
      // ignore user-entered space
      if (!isBlank(right_text.charAt(count))) {
        second_index--;
        
        // character at beginning of element, switch elements
        if (second_index < 0) {
          right_node = findNextNode("left", right_node);
          right_node_text = right_node.nodeValue;
          second_index = right_node_text.length - 1;
        }
        right_character = right_node_text.charAt(second_index);
      
        while (right_character != right_text.charAt(count)) {
          // return null if a non-blank character is mis-matched
          if (!isBlank(right_character)) {
            console.log("right: returning null " + right_character + "-" + right_text.charAt(count));
            return null;
          } else {
            console.log("right: " + right_character + "-" + right_text.charAt(count));
          }
          
          second_index--;
          
          // character at beginning of element, switch elements
          if (second_index < 0) {
            right_node = findNextNode("left", right_node);
            right_node_text = right_node.nodeValue;
            second_index = right_node_text.length - 1;
          }
          right_character = right_node_text.charAt(second_index);
        }
      }
    }
    
    // insert TEXT_ID to the left of second_index
    if (second_index == 0) {
      right_node.nodeValue = TEXT_ID + right_node.nodeValue;
    } else {
      right_node.nodeValue = right_node.nodeValue.substring(0, second_index) + TEXT_ID + right_node.nodeValue.substring(second_index);
    }
    
    // remove last TEXT_ID from html
    html = $doc.eq(0).html();
    var temp_index = html.lastIndexOf(TEXT_ID);
    html = html.substring(0, temp_index) + html.substring(temp_index + TEXT_ID.length);
    // update html without invalid TEXT_IDs
    $doc.eq(0).html(html);
  }
  
  // set TwoReceipt class for doc html (first element that contains both TEXT_ID instances)
  element = $doc.find(".TwoReceipt").first();
  original_element = element;
  // loop through element children until there are no more children to loop through
  while (element.children().length != 0) {
    var valid_child = false;
    for (var index = 0; index < element.children().length; index++) {
      first_index = element.children(index).text().indexOf(TEXT_ID);
      second_index = element.children(index).text().indexOf(TEXT_ID, first_index + 1);
      // if element child contains both TEXT_IDs
      if (first_index != -1 && second_index != -1) {
        valid_child = true;
        element = element.children(index);
        break;
      }
    }
    console.log(element.text());
    // none of the element children contain TEXT_ID
    if (!valid_child) {
      break;
    }
  }
  
  first_index = element.text().indexOf(TEXT_ID);
  second_index = element.text().indexOf(TEXT_ID, first_index + 1);
  while (first_index == -1 || second_index == -1) {
    if (element.parent().length == 0) {
      return null;
    } else {
      element = element.parent();
    }
    first_index = element.text().indexOf(TEXT_ID);
    second_index = element.text().indexOf(TEXT_ID, first_index + 1);
  }
  
  original_element.removeClass(CLASS_NAME);
  element.addClass(CLASS_NAME);
  
  // modify template values
  template.selection = saved_string;
  template.element = element[0].outerHTML;
  template.html = $doc.eq(0).html();
  console.log(template);
  return template;
}

// returns template if text is removed from the inside, otherwise returns null
function calculateRemovedText(template, saved_string) {
  
  if (characterMatch(saved_string, template.selection)) {
    return template;
  } else {
    return null;
  }
}

// character by character comparison of 2 strings, to find if submitted_string is within template_string
// returns true if 1st string is still considered a substring of 2nd string (requires consecutive characters matching)
function characterMatch(submitted_string, template_string) {
  var j = 0,
  consecutive_match = false,
  num_consec_matches = 0,
  submitted_character, template_character;
  
  // iterate through submitted_string
  for(var i = 0; i < submitted_string.length; i++) {
    submitted_character = submitted_string.charAt(i);
    // do not compare blank characters
    if (!isBlank(submitted_character)) {
      var character_match = false;
      // keep iterating through template_string until match is found or end of string
      while (j < template_string.length && !character_match) {
        template_character = template_string.charAt(j);
        // do not compare blank characters
        if (!isBlank(template_character)) {
          character_match = (template_character == submitted_character);
          console.log(character_match + " " + template_character + " " + submitted_character);
          j++;
          
          // add to num consec if already consecutive
          if (consecutive_match) {
            if (character_match) {
              num_consec_matches++;
            } else {
              consecutive_match = false;
            }
          }
          // start tracking consecutive_match if character matches
          else if (character_match) {
            consecutive_match = true;
          }
        } else {
          j++;
        }
      }
    }
  }
  
  // match, but too few consecutive matches
  if (character_match && num_consec_matches / submitted_string.length < CONSEC_PERCENT) {
    console.log("too few consecutive matches");
    return false;
  }
  // match
  else if (character_match) {
    console.log("characters matched");
    return true;
  }
  // no match
  else {
    console.log("characters not matched");
    return false;
  }
}

// returns true if string is blank
function isBlank(text) {
  // remove whitespace (\n, \t, etc)
  if (text.trim() === "") {
    return true;
  } else {
    return false;
  }
}