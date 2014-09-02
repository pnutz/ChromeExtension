// ElementPath class (method to find an element from element body/row - transition from aServer to chrome extension)
ElementPath.DATA_ATTR = "data-tworeceipt-row";
ElementPath.CONTAINER_TAGS = ["BODY", "DIV", "P", "TABLE", "UL", "SPAN", "SECTION", "ARTICLE"];
ElementPath.ROW_TAGS = ["TR", "LI"];

function ElementPath(rowIndex, element, path, topElement) {
  if (element != null) {
    this._element = element;
  } else {
    this._element = null;
  }

  if (path != null) {
    this._path = path;
  } else {
    this._path = [];
  }

  if (topElement != null) {
    this._topElement = topElement;
    if (rowIndex != null) {
      this.rowIndex = rowIndex;
    }
  } else if (rowIndex != null) {
    this.rowIndex = rowIndex;

    var top = $("[" + ElementPath.DATA_ATTR + this.rowIndex + "='" + this.rowIndex + "']");
    if (top.length > 0) {
      this._topElement = top.eq(0);
    } else {
      this._topElement = null;
    }
  } else {
    this._topElement = $("body").eq(0);
  }
}

// get/set path
Object.defineProperty(ElementPath.prototype, "path", {
  get: function() {
    // lazy loads path if topElement and element exist
    if (this._path.length === 0 && this._element != null && this._topElement != null) {
      this._path = this.findElementPath();
    }
    return this._path;
  },
  // set path if value is an array
  set: function(value) {
    if (Object.prototype.toString.call(value) === "[object Array]") {
      this._element = null;
      this._path = value;
    }
  }
});

// get/set element
Object.defineProperty(ElementPath.prototype, "element", {
  get: function() {
    // lazy loads element if path exists
    if (this._element == null) {
      this._element = this.getEndOfPath();
    }
    return this._element;
  },
  set: function(value) {
    if (value != null) {
      this._element = value;
      this._path = [];
    }
  }
});

// get/set rowElement
Object.defineProperty(ElementPath.prototype, "top", {
  get: function() {
    // lazy load top element
    if (this._topElement == null) {
      if (this.rowIndex != null) {
        var element = $("[" + ElementPath.DATA_ATTR + this.rowIndex + "='" + this.rowIndex + "']");
        // default to closest row element if there is no top element
        if (element.length === 0) {
          element = this.findClosestRowElement();
          // run set method for top
          this.top = element;
        } else {
          element = element.eq(0);
          this._topElement = element;
        }
      } else {
        this._topElement = $("body").eq(0);
      }
    }
    return this._topElement;
  },
  set: function(value) {
    if (value != null) {
      this._topElement = value;
      this._path = [];
      if (this.rowIndex != null) {
        this.setRowElement();
      }
    }
  }
});

// returns a hard copy of ElementPath
ElementPath.prototype.copy = function() {
  // set path if it doesn't exist
  if (this._path.length === 0 && this._element != null && this._topElement != null) {
    this._path = this.findElementPath();
  }
  var newPath = $.extend(true, {}, this);
  return new ElementPath(newPath.rowIndex, newPath._element, newPath._path, newPath._topElement);
};

// modifies path by change at index
ElementPath.prototype.alterPath = function(index, change) {
  if (this._path.length > index) {
    this._element = null;
    this._path[index] = this._path[index] + change;
  }
  return this;
};

// find closest row element, compare with any existing elements with attr
// set attr based on best top element and clean
ElementPath.prototype.findClosestRowElement = function() {
  var element = null;

  if (this.rowIndex != null && this._element != null) {
    var element = this._element;
    var tag = element.prop("tagName");
    var matchFound = $.inArray(tag, ElementPath.ROW_TAGS);

    while (matchFound === -1 && element.parent().length > 0) {
      element = element.parent();
      tag = element.prop("tagName");
      matchFound = $.inArray(tag, ElementPath.ROW_TAGS);
    }

    // set to parent of containerTag
    if (element.parent().length > 0) {
      element = element.parent();
    }

    // check if attr exists already
    element = ElementPath.compareRows(element, this.rowIndex);
    this.top = element;
  }

  return element;
};

// set data attribute on row element
ElementPath.prototype.setRowElement = function() {
  var attr = this._topElement.attr(ElementPath.DATA_ATTR + this.rowIndex);
  if (typeof attr === typeof undefined || attr === false) {
    this._topElement.attr(ElementPath.DATA_ATTR + this.rowIndex, this.rowIndex);
  }
};

// need cleanup method that runs this
ElementPath.prototype.cleanRowElement = function() {
  this._topElement.removeAttr(ElementPath.DATA_ATTR + this.rowIndex);
};

// calculates the path from element to top element (requires a defined element and top)
ElementPath.prototype.findElementPath = function() {
  var path = [];
  var element = this._element;
  var topElement = this._topElement;

  if (element != null && element.length > 0 && topElement != null && topElement.length > 0) {
    var parentElement = element.parent();

    while (parentElement.length > 0 && element[0] !== topElement[0]) {
      var order = parentElement.children().index(element);
      path.unshift(order);
      element = parentElement;
      parentElement = parentElement.parent();
    }

    // represents first element in element_path. differentiates an invalid path from a valid path
    path.unshift(0);
  }

  return path;
};

// returns DOM element node at the end of path
ElementPath.prototype.getEndOfPath = function() {
  var elementPath = this._path;
  var element = this.top;

  if (elementPath.length > 0) {
    for (var i = 0; i < elementPath.length; i++) {
      // first entry in elementPath is always body/row tag
      if (i !== 0) {
        element = element.children();
        if (element.length > elementPath[i]) {
          element = element.eq(elementPath[i]);
        } else {
          console.log("element had less children than element path index");
          element = null;
          break;
        }
      }
    }
  } else {
    console.log("element path does not exist");
    element = null;
  }

  return element;
};

// compares two paths and returns a path representing the parent element
ElementPath.findParentElementPath = function(path1, path2) {
  console.log("compare parent element path");
  console.log(path1);
  console.log(path2);

  if ((path1 == null || path1.length === 0) && (path2 == null || path2.length === 0)) {
    return [];
  }
  else if (path1 == null || path1.length === 0) {
    return path2;
  }
  else if (path1 === path2 || path2 == null || path2.length === 0) {
    return path1;
  }

  var finalIndex = 0;
  for (var i = 0; i < path1.length; i++) {
    if (i < path2.length && path1[i] === path2[i]) {
      finalIndex = i;
    } else {
      break;
    }
  }

  path1.splice(finalIndex, path1.length - finalIndex - 1);
  return path1;
};

// returns a DOM element that is a parent topElement to all receipt item attributes
// sets topElement for all elementPaths requiring row
ElementPath.setParentRow = function(elementPaths) {
  var top;
  // one ElementPath will contain a parent topElement
  for (var i = 0; i < elementPaths.length; i++) {
    var elementPath = elementPaths[i];
    if (top == null) {
      top = elementPath.top;
    } else if (elementPath.top != null) {
      top = ElementPath.findParent(top, elementPath.top);
    }
  }

  for (var i = 0; i < elementPaths.length; i++) {
    var elementPath = elementPaths[i];
    if (elementPath._topElement[0] !== top[0]) {
      elementPath.top = top;
    }
  }

  return top;
};

// returns a DOM element that is a parent to all template fields
ElementPath.getParentElement = function(savedData, isItemField) {
  var parentElement;
  var keys = Object.keys(savedData);

  if (isItemField == null) {
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var formItem;

      if (key !== "items") {
        var keyElement = $("[data-tworeceipt-" + key + "-start]");
        if (keyElement.length > 0) {
          formItem = keyElement.eq(0);
        }
      } else {
        formItem = ElementPath.getParentElement(savedData[key], true);
      }

      if (formItem != null) {
        if (parentElement != null) {
          parentElement = ElementPath.findParent(parentElement, formItem);
        }
        else {
          parentElement = formItem;
        }
      }
    }
  } else {
    for (var i = 0; i < keys.length; i++) {
      var itemIndex = keys[i];
      var itemValue = savedData[itemIndex];

      var itemKeys = Object.keys(itemValue);
      for (var j = 0; j < itemKeys.length; j++) {
        var itemAttr = itemKeys[j];
        var keyElement = $("[data-tworeceipt-" + itemAttr + itemIndex + "-start]");
        var formItem;
        if (keyElement.length > 0) {
          formItem = keyElement.eq(0);
        }

        if (formItem != null) {
          if (parentElement != null) {
            parentElement = ElementPath.findParent(parentElement, formItem);
          }
          else {
            parentElement = formItem;
          }
        }
      }
    }
  }

  return parentElement;
};

// returns a parent element that contains both element1 and element2 (can be equal to each other)
// element1 cannot be null
ElementPath.findParent = function(element1, element2) {
  // if element2 contains element1
  if ($.contains(element2[0], element1[0])) {
    element1 = element2;
  }
  // if element1 does not contain element2
  else if (!$.contains(element1[0], element2[0])) {
    // while element1 does not contain element2 and they are not equal
    while (!$.contains(element1[0], element2[0]) && element1[0] !== element2[0]) {
      element1 = element1.parent();
    }
  }

  return element1;
};

// iterate up parent elements until a container element is selected. return container DOM element
ElementPath.getParentContainer = function(element) {
  var tag = element.prop("tagName");
  var matchFound = $.inArray(tag, ElementPath.CONTAINER_TAGS);

  while (matchFound === -1 && element.parent().length > 0) {
    element = element.parent();
    tag = element.prop("tagName");
    matchFound = $.inArray(tag, ElementPath.CONTAINER_TAGS);
  }

  return element;
};

// compares param row element with existing element containing attr
ElementPath.compareRows = function(element, rowIndex) {
  var existing = $("[" + ElementPath.DATA_ATTR + rowIndex + "='" + rowIndex + "']");
  if (existing.length > 0) {
    existing = existing.eq(0);
    var result = ElementPath.findParent(element, existing);

    // check if result child tag is in containerTags
    var resultChildren = result.children();
    for (var i = 0; i < resultChildren.length; i++) {
      if ($.inArray(resultChildren.eq(i).prop("tagName"), ElementPath.ROW_TAGS)) {
        element = existing;
        break;
      }
    }

    if (element[0] !== existing[0]) {
      this.cleanRowElement();
    }
  }

  return element;
};
