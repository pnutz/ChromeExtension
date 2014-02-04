var overflow = document.body.style.overflow;
var amazon = false;
var htmlGet = "pull-off";
var incomingPort;

$(document).ready(function() {
	
	// display notification if new purchase on amazon
	if (location.href.indexOf("https://www.amazon.ca/gp/buy/thankyou/handlers/display.html") != -1) {
		amazon = true;
		createNotification();
	}
	
	// only run function when user prompts to start, so links keep working
	$(document).click(function(event) {
		if (htmlGet != "pull-off" && self !== top)
		{
				window.parent.postMessage(element.text().trim(), '*');
				return false;
		}
		else if (htmlGet != "pull-off")
		{
			var element = $(event.target);
			console.log("Element Clicked: " + element.text().trim());
			
			incomingPort.postMessage({response: htmlGet.substring(6), data: element.text().trim()});
					
			return false;
		}
	});
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
	//document.body.style.overflow = "scroll";
}

// long-lived connection from background
chrome.runtime.onConnect.addListener(function(port) {
	// connect if not an iframe
	if (self == top)
	{
		console.log("Connected to port: " + port.name);
		console.assert(port.name == "addReceipt");
		incomingPort = port;
		
		port.onMessage.addListener(function(msg) {
			console.log("Received msg: " + msg.request + " for port: " + port.name);
			htmlGet = msg.request;
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
		console.log("received onMessage connection instead of port connect");
		// do not load for iframe
		if (self == top)
		{
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
	});
	
	window.addEventListener("message", function(event) {
		if (event.origin.indexOf("chrome-extension://") != -1)
		{
			console.log(event.data);
			var notdiv = document.getElementById("notificationdiv");
			notdiv.parentNode.removeChild(notdiv);
			
			document.documentElement.style.paddingTop = "0px";
			/*if (overflow === "")
			{
				document.body.style.overflow = "visible";
			}
			else
			{
				document.body.style.overflow = overflow;
			}*/
			
			if (event.data == "yes")
			{
				chrome.runtime.sendMessage({ greeting: "parseHTML",
							data: document.body.outerHTML,
							text: document.body.innerText,
							url: location.href.toLowerCase() });
			}
			else if (event.data == "no")
			{
				// UNTESTED
				if (amazon)
				{
					var orderId = "orderId=";
					var orderNumber = location.href.substring(location.href.indexOf(orderId) + orderId.length, location.href.indexOf("&purchaseId"));
					var url = 'https://www.amazon.ca/gp/css/summary/print.html/ref=oh_pi_o00_?ie=UTF8&orderID=' + orderNumber;
					$.ajax({ url: url,
						success: function(data) {
							var parser = new DOMParser();
							var doc = parser.parseFromString(data, "text/html");
							// DOM
							
							chrome.runtime.sendMessage({ greeting: "parseHTML",
								data: data,
								text: doc.body.innerText,
								url: url},
								function(response) {});
						}
					});
				}
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
					incomingPort.postMessage({response: htmlGet.substring(6), data: event.data});
				}
			}
		}
	});