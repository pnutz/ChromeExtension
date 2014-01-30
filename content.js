var overflow = document.body.style.overflow;

$(document).ready(function() {
	/*
	// display notification if new purchase on amazon
	if (location.href.indexOf("https://www.amazon.ca/gp/buy/thankyou/handlers/display.html") != -1) {
		createNotification();
	}*/
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
	document.body.appendChild(div);
	
	document.body.style.paddingTop = "27px";
	document.body.style.overflow = "scroll";
}

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
			createNotification();
		}
	});
	
	window.addEventListener("message", function(event) {
		if (event.origin.indexOf("chrome-extension://") != -1)
		{
			console.log(event.data);
			var notdiv = document.getElementById("notificationdiv");
			notdiv.parentNode.removeChild(notdiv);
			
			document.body.style.paddingTop = "0px";
			if (overflow === "")
			{
				document.body.style.overflow = "visible";
			}
			else
			{
				document.body.style.overflow = overflow;
			}
			
			if (event.data == "yes")
			{
				// if new purchase on amazon -- THIS IS SLOW - find html url of different page
				//if (amazon) 
				//var orderId = "orderId=";
				//var ordernumber = location.href.substring(location.href.indexOf(orderId) + orderId.length, location.href.indexOf("&purchaseId"));
				/*$.ajax({ url: 'https://www.amazon.ca/gp/css/summary/print.html/ref=oh_pi_o00_?ie=UTF8&orderID=' + '702-2831481-3372262',//ordernumber,
					success: function(data) {
						chrome.runtime.sendMessage({ greeting: "parseHTML",
							data: data },
							function(response) {});
					}
				});*/
				
				chrome.runtime.sendMessage({ greeting: "parseHTML",
							data: document.body.outerHTML,
							text: document.body.innerText },
							function(response) {});
			}
			else if (event.data == "no")
			{
			
			}
			else if (event.data == "x")
			{
				
			}
		}
	});