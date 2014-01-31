var title = null;
var date = null;
var vendor_name = null;
var total = null;
var currency = null;
var transactionNumber = null;
var receipt_items = null;

// searches string to return a string between substring1 and substring2 - finds first instance of substring2 after substring1
function stringBetween(string, substring1, substring2) {
	var first_index = string.indexOf(substring1);
	return string.substring(first_index + substring1.length, string.indexOf(substring2, first_index));
}

// use newdata flag to check in addreceipt to pull? what if not all data was parsed
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log("onMessage:", request);
	
	// uses html sanitizer to remove dangerous tags from the page html
	if (request.greeting != null && request.greeting == "parseHTML")
	{
		// html method
		function urlX(url) { if(/^https?:\/\//.test(url)) { return url }}
    function idX(id) { return id }
		var output = request.data;
    output = html_sanitize(request.data, urlX, idX);
		// sanitized html
		//console.log(output);
		/*var parser = new DOMParser();
		var doc = parser.parseFromString(output, "text/html");
		// DOM
		console.log(doc);*/
		
		// trying text method
		var text = request.text;
		console.log(text);
		
		// MANUAL CASE FOR AMAZON
		if (request.url.indexOf("amazon") != -1)
		{
			var dateSearch = "Order Placed:";
			var orderNumberSearch = "Amazon.ca order number:";
			var orderTotal = "Order Total:";
			var money = "$";
			var shipped = "Shipment #1:";
			var shipped_print = "Shipped on";
			var price = "Price";
			var howMany = "of:";
			var condition = "Condition:";
			var soldBy = "Sold by:";
			var sellerProfile = "(seller profile)";
			var shipping = "Shipping & Handling";
			var tax1 = "Estimated GST/HST";
			var tax2 = "Estimated PST/RST/QST";
			
			date = stringBetween(text, dateSearch, orderNumberSearch).trim();
			var tempdate = new Date(date);
			date = ("0" + tempdate.getMonth() + 1).slice(-2) + "/" + ("0" + tempdate.getDate()).slice(-2) + "/" + tempdate.getFullYear()
			console.log("Date: " + date);
			title = "Amazon Purchase On " + date;
			console.log("Title: " + title);
			transactionNumber = stringBetween(text, orderNumberSearch, orderTotal).trim();
			console.log("Order Number: " + transactionNumber);
			currency = stringBetween(text, orderTotal, money).trim();
			console.log("Currency: " + currency);
			if (text.indexOf(shipped) == -1)
			{
				total = stringBetween(text, money, shipped_print).trim();
			}
			else
			{
				total = stringBetween(text, money, shipped).trim();
			}
			console.log("Total: " + total);
			// vendor is amazon
			if (text.indexOf(sellerProfile) == -1)
			{
				vendor_name = stringBetween(text, soldBy, currency).trim();
			}
			// vendor is not amazon -- for amazon, vendor should be amazon, not individual stores purchased from
			else
			{
				vendor_name = stringBetween(text, soldBy, sellerProfile).trim();
			}
			console.log("Vendor: " + vendor_name);
			
			// set text after first occurrence of currency - we know total (w/ currency) is displayed at the top
			text = text.substring(text.indexOf(currency) + currency.length);
			
			// find number of receipt_items on page
			var receiptItemCount = 0;
			var ofIndex = text.indexOf(howMany);
			while (ofIndex != -1)
			{
				receiptItemCount++;
				ofIndex = text.indexOf(howMany, ofIndex + 1);
			}
			
			receipt_items = [];

			var name;
			var cost;
			var quantity;
			var costIndex;
			var costEnd;
			var float_cost;
			for (var currentItem = 1; currentItem <= receiptItemCount; currentItem++)
			{
				// special case for 1st item in list
				if (currentItem == 1)
				{
					quantity = stringBetween(text, price, howMany).trim();
				}
				// every other item in list
				else
				{
					quantity = text.substring(0, text.indexOf(howMany)-1).trim();
				}
				
				// at most 2 decimal places for each price
				costIndex = text.indexOf(currency);
				costEnd = text.indexOf(".", costIndex) + 2;
				cost = text.substring(costIndex + currency.length, costIndex + costEnd);
				costEnd = cost.indexOf(".") + 3;
				cost = cost.substring(2, costEnd);
				
				name = stringBetween(text, howMany, condition).trim();
				
				// remove product type if it exists
				name = name.replace(/\[.+\]/g, '').trim();
				
				// calculate cost
				float_cost = parseFloat(cost) / parseFloat(quantity);
				
				console.log("Name: " + name);
				console.log("Cost: " + float_cost);
				console.log("Quantity: " + quantity);
				
				receipt_items.push({'name': name, 'cost': float_cost, 'quantity': quantity});
				
				// set text after first occurrence of cost
				text = text.substring(text.indexOf(cost) + cost.length)
			}
			
			quantity = 1;
			
			// shipping & handling
			text = text.substring(text.indexOf(shipping));
			
			// at most 2 decimal places for each price
			costIndex = text.indexOf(currency);
			costEnd = text.indexOf(".", costIndex) + 2;
			cost = text.substring(costIndex + currency.length, costIndex + costEnd);
			costEnd = cost.indexOf(".") + 3;
			cost = cost.substring(2, costEnd);
			
			receipt_items.push({'name': shipping, 'cost': cost, 'quantity': quantity});
			
			// tax1
			text = text.substring(text.indexOf(tax1));
			
			// at most 2 decimal places for each price
			costIndex = text.indexOf(currency);
			costEnd = text.indexOf(".", costIndex) + 2;
			cost = text.substring(costIndex + currency.length, costIndex + costEnd);
			costEnd = cost.indexOf(".") + 3;
			cost = cost.substring(2, costEnd);
			
			receipt_items.push({'name': tax1, 'cost': cost, 'quantity': quantity});
			
			// tax2
			text = text.substring(text.indexOf(tax2));
			
			// at most 2 decimal places for each price
			costIndex = text.indexOf(currency);
			costEnd = text.indexOf(".", costIndex) + 2;
			cost = text.substring(costIndex + currency.length, costIndex + costEnd);
			costEnd = cost.indexOf(".") + 3;
			cost = cost.substring(2, costEnd);
			
			receipt_items.push({'name': tax2, 'cost': cost, 'quantity': quantity});
								
			/*receipt_items = [
				{
					'name': "Nintendo 3DS XL",
					'cost': 12.99,
					'quantity': 2
				},
				{
					'name': "SteelSeries QcK Gaming Mouse Pad (Black)",
					'cost': 9.98,
					'quantity': 1
				},
				{
					'name': "Shipping & Handling",
					'cost': -4.48,
					'quantity': 1
				}
			];*/
			chrome.windows.create({"url" : "addreceipt.html", "type" : "popup"});
		}
	}
});