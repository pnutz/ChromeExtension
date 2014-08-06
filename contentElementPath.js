// methods related to storing element_path for html2canvas snapshot

// returns a element that is a parent to all template fields
function getParentElement(savedData, isItemField) {
  var parentElement;

  if (!isItemField) {
    var keys = Object.keys(savedData);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var formItem;

      if (key !== "items") {
        var selector = "[data-tworeceipt-" + key + "-start]";
        formItem = $(selector)[0];
      } else {
        formItem = getParentElement(value, true);
      }

      if (formItem != null) {
        if (parentElement != null) {
          parentElement = findParent(parentElement, formItem);
        }
        else {
          parentElement = formItem;
        }
      }
    }
  } else {
    var keys = Object.keys(savedData);
    for (var i = 0; i < keys.length; i++) {
      var itemIndex = keys[i];
      var itemValue = savedData[key];

      var itemKeys = Object.keys(itemValue);
      for (var j = 0; j < itemKeys.length; j++) {
        var itemAttr = itemKeys[j];
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
      }
    }
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
    for (var i = 0; i < elementPath.length; i++) {
      // first entry in elementPath is always body tag
      if (i !== 0) {
        element = element.children().eq(elementPath[i]);
      }
    }
  }

  return element;
}

// iterate up parent elements until a container element is selected
function getParentContainer(element) {
  var element_tags = ["BODY", "DIV", "P", "TABLE", "UL", "SPAN", "SECTION", "ARTICLE"];
  var tag = element.prop("tagName");
  var match_found = $.inArray(tag, element_tags);

  while (match_found === -1) {
    element = element.parent();
    tag = element.prop("tagName");
    match_found = $.inArray(tag, element_tags);
  }

  return element;
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
