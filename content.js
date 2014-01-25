/* MutationObserver configuration data: Listen for "childList"
 * mutations in the specified element and its descendants */
var config = {
    childList: true,
    subtree: true
};
var regex = /<a.*?>[^<]*<\/a>/;

/* Traverse 'rootNode' and its descendants and modify '<a>' tags */
function modifyLinks(rootNode) {
    var nodes = [rootNode];
    while (nodes.length > 0) {
        var node = nodes.shift();
        if (node.tagName == "A") {
            /* Modify the '<a>' element */
            node.innerHTML = "~~" + node.innerHTML + "~~";
        } else {
            /* If the current node has children, queue them for further
             * processing, ignoring any '<script>' tags. */
            [].slice.call(node.children).forEach(function(childNode) {
                if (childNode.tagName != "SCRIPT") {
                    nodes.push(childNode);
                }
            });
        }
    }
}

/* Observer1: Looks for 'div.notificationdiv' */
var observer1 = new MutationObserver(function(mutations) {
    /* For each MutationRecord in 'mutations'... */
    mutations.some(function(mutation) {
        /* ...if nodes have been added... */
        if (mutation.addedNodes && (mutation.addedNodes.length > 0)) {
            /* ...look for 'div#notificationdiv' */
            var node = mutation.target.querySelector("div#notificationdiv");
            if (node) {
                /* 'div#notificationdiv' found; stop observer 1 and start observer 2 */
                observer1.disconnect();
                observer2.observe(node, config);

                if (regex.test(node.innerHTML)) {
                    /* Modify any '<a>' elements already in the current node */
                    modifyLinks(node);
                }
                return true;
            }
        }
    });
});

/* Observer2: Listens for '<a>' elements insertion */
var observer2 = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes) {
            [].slice.call(mutation.addedNodes).forEach(function(node) {
                /* If 'node' or any of its descendants are '<a>'... */
                if (regex.test(node.outerHTML)) {
                    /* ...do something with them */
                    modifyLinks(node);
                }
            });
        }
    });
});

/* Start observing 'body' for 'div#notificationdiv' */
observer1.observe(document.body, config);

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if (request.greeting == "getHTML") {
			sendResponse({
				data: document.body.outerHTML,
				farewell: "sendHTML"
			});
		}
		// this is how lastpass does it, by adding a div and iframe element to the current page
		else if (request.greeting == "showNotification") {
			// only create element if it doesn't exist
			if (observer1)
			{
				// css for iframe
				var style = document.createElement("style");
				style.type = "text/css";
				style.innerHTML = ".twoReceiptIFrame { width: 100%; }";
				document.getElementsByTagName("head")[0].appendChild(style);
				
				// append iframe notification within div to body
				var div = document.createElement("div");
				div.id = "notificationdiv";
				div.setAttribute("style", "top: 0px; left: 0px; height: 1px; width: 100%; position: fixed; background-color: black; z-index: 1000000099; visibility: visible;");
				var iframe = document.createElement("iframe");
				iframe.id = "twoReceiptIFrame";
				iframe.className = "twoReceiptIFrame";
				iframe.scrolling = "no";
				iframe.style.width = "100%";
				iframe.setAttribute("style", 'height: 27px; border: 0px;');
				iframe.src = chrome.extension.getURL("/notification/notificationbar.html");
				div.appendChild(iframe);
				document.body.appendChild(div);
			}
		}
	});
	
	window.addEventListener("message", function(event) {
		console.log(event);
		if (event.origin.indexOf("chrome-extension://") != -1)
		{
			console.log(event.data);
			var notdiv = document.getElementById("notificationdiv");
			notdiv.parentNode.removeChild(notdiv);
			
			if (event.data == "no")
			{
			} else if (event.data == "yes")
			{
			} else if (event.data == "x")
			{
			}
		}
	});