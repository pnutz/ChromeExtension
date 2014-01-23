chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		//sendResponse({ farewell: "getText" });
		if (request.greeting == "getText") {
				sendResponse({
						data: document.body.outerHTML,
						farewell: "getText"
				});
		}
	});