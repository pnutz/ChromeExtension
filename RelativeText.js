// RelativeText class to store and calculate text given surrounding text, dependent on page textNodes and element containing text

/*
* lastNodeIndex: last textNodes index containing text, used to find an index in textNodes quicker
* startNodeIndex: relative start index of text node within element
* endNodeIndex: relative end index of text node within element
* leftText: text within start text node not included in text
* rightText: text within end text node not included in text
*/
function RelativeText(element, start, end, startNodeIndex, endNodeIndex) {
  var text = getDocumentText(element);

  this.lastNodeIndex = endNodeIndex;

  var leftText = text.substring(0, start);
  var leftNodeIndex = startNodeIndex - 1;
  var leftNode = textNodes[leftNodeIndex];
  var indexCount = 0;
  // iterate backwards from start_node_index until element doesn't contain text node
  while ($.contains(element[0], leftNode)) {
    leftText = leftText.substring(leftText.length - leftNode.nodeValue.trim().length + 1);
    leftNodeIndex -= 1;
    leftNode = textNodes[leftNodeIndex];
    indexCount++;
  }
  this.startNodeIndex = indexCount;
  this.leftText = leftText;

  var rightText = text.substring(end);
  var rightNodeIndex = endNodeIndex + 1;
  var rightNode = textNodes[rightNodeIndex];
  while ($.contains(element[0], rightNode)) {
    rightText = rightText.substring(0, rightText.length - rightNode.nodeValue.trim().length - 1);
    rightNodeIndex += 1;
    rightNode = textNodes[rightNodeIndex];
  }
  this.rightText = rightText;
  this.endNodeIndex = indexCount + endNodeIndex - startNodeIndex;
}

// returns js object containing 'text', 'start' character index, 'end' character index, and 'startNodeIndex'
RelativeText.prototype.calculateElementText = function(element) {
  /*console.log("existing data");
  console.log("start node: " + this.startNodeIndex);
  console.log("end node: " + this.endNodeIndex);
  console.log("leftText: " + this.leftText);
  console.log("rightText: " + this.rightText);*/

  var text = getDocumentText(element);

  var index = this.lastNodeIndex;
  // iterate until index is 1st text_node contained in element
  while (!$.contains(element[0], textNodes[index]) && index < textNodes.length) {
    index++;
  }

  // element does not follow RelativeText element
  if (index === textNodes.length) {
    return false;
  }

  var start = 0;
  var elementNodeIndex = 0;

  // loop through element to find startNodeIndex and calculate start
  while (elementNodeIndex !== this.startNodeIndex && elementNodeIndex < textNodes.length) {
    if (start === 0) {
      start += textNodes[index].nodeValue.trim().length;
    } else {
      start += textNodes[index].nodeValue.trim().length + 1;
    }
    index++;
    elementNodeIndex++;
  }

  // initialize end before start is finalized
  var end = start;

  // leftText should start at index 0?
  var leftIndex = textNodes[index].nodeValue.trim().indexOf(this.leftText);
  if (leftIndex === 0) {
    start += this.leftText.length;
  }

  // set startNodeIndex
  var startNodeIndex = index;

  // deduct 1 for final iteration of while loop (so index = startNodeIndex) if it was ever entered
  if (elementNodeIndex !== 0) {
    index--;
    elementNodeIndex--;
  }

  // loop through element to find endNodeIndex and calculate end
  while (elementNodeIndex !== this.endNodeIndex && elementNodeIndex < textNodes.length) {
    if (end === 0) {
      end += textNodes[index].nodeValue.trim().length;
    } else {
      end += textNodes[index].nodeValue.trim().length + 1;
    }
    index++;
    elementNodeIndex++;
  }

  // rightText should start at text length - rightText.length?
  var endNodeText = textNodes[index].nodeValue.trim();
  var rightIndex = endNodeText.indexOf(this.rightText);
  if (rightIndex === endNodeText.length - this.rightText.length) {
    end += rightIndex;
  } else if (end === 0) {
    end += textNodes[index].nodeValue.trim().length;
  } else {
    end += textNodes[index].nodeValue.trim().length + 1;
  }

  text = text.substring(start, end);

  return { text: text, start: start, end: end, startNodeIndex: startNodeIndex };
};
