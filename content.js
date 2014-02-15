var overflow = document.body.style.overflow;
var amazon = false;
var htmlGet = "pull-off";
var incomingPort;
var lastClicked;

$(document).ready(function() {
	if (self === top)
	{
		console.log("document ready");
	}
	
	// "paypal" "pay with paypal" "bestbuy" don't work
	var postButtons = $("form[method='post']").find(":input[type='submit']");
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
			
			/*var form = submitElement.closest("form");
			// when detected button is submitted, send to background to check if page actually loaded
			form.submit(function(event) {
				alert("HERE");
				chrome.runtime.sendMessage({ greeting: "purchaseComplete" });
				//createNotification();
				return;
			});*/
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
	
	// display notification if new purchase on amazon
	if (location.href.indexOf("https://www.amazon.ca/gp/buy/thankyou/handlers/display.html") != -1) {
		amazon = true;
		createNotification();
	}
	
	// only run function when user prompts to start, so links keep working
	$(document).click(function(event) {
		lastClicked = $(event.target);
		
		if (htmlGet != "pull-off" && self !== top)
		{
				window.parent.postMessage(element.text().trim(), '*');
				return false;
		}
		else if (htmlGet != "pull-off")
		{
			var element = $(event.target);
			console.log("Element Clicked: " + element.text().trim());
			if (window.getSelection().toString() === "")
			{
				incomingPort.postMessage({response: htmlGet.substring(6), data: element.text().trim()});
			}
			return false;
		}
	});
	
	// get selected text on mouseup
	$(document).mouseup(function(event) {
		if (window.getSelection().toString() != "")
		{
			if (htmlGet != "pull-off" && self !== top)
			{
				window.parent.postMessage(window.getSelection().toString(), '*');
			}
			else if (htmlGet != "pull-off")
			{
				console.log("Mouse-Up: " + window.getSelection().toString());
				incomingPort.postMessage({response: htmlGet.substring(6), data: window.getSelection().toString()});
			}
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
		console.assert(port.name == "newReceipt");
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
								url: url});
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