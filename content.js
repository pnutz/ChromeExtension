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
	});
	
	window.addEventListener("message", function(event) {
		if (event.origin.indexOf("chrome-extension://") != -1)
		{
			console.log(event.data);
			var notdiv = document.getElementById("notificationdiv");
			notdiv.parentNode.removeChild(notdiv);
			
			if (event.data == "no")
			{
				
			}
			else if (event.data == "yes")
			{
				chrome.runtime.sendMessage({greeting: "genReceipt", title: "test", date: "01/20/2014", vendor_name: "test", currency: "USD", total: 1},
				function(response) {});
			}
			else if (event.data == "x")
			{
				
			}
		}
	});