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
		var parser = new DOMParser();
		var doc = parser.parseFromString(output, "text/html");
		// DOM
		console.log(doc);
		
		
		// trying text method
		var text = request.text;
		console.log(text);
		
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
		var subtotal = "Item(s) Subtotal:";
		var shippingAddress = "Shipping Address:";
		
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
		
		var receiptItemCount = text.match(/of:/g);
		receipt_items = [];
		// set text after first occurrence of currency
		text = text.substring(text.indexOf(currency) + currency.length)
		
		var quantity = stringBetween(text, price, howMany).trim();
		var name = stringBetween(text, howMany, condition).trim();
		name = name.replace(/[.+]/g, '').trim();
		
		if (receiptItemCount == 1)
		{
			var cost;
			// html version, condition is true
			if (text.indexOf(subtotal) < text.indexOf(shippingAddress))
			{
				cost = stringBetween(text, currency, subtotal).substring(1).trim();
			}
			// text version, condition is false
			else
			{
				cost = stringBetween(text, currency, shippingAddress).substring(1).trim();
			}
			console.log("Cost: " + cost);
			var float_cost = parseFloat(cost) / parseFloat(quantity);
		}
		else
		{
			// next one starts with of:
		}
		/*
		Price
		1 of: GC Controller Adapter for PC.
		Condition: New
		Sold by: Canadian Classroom (seller profile)
		CDN$ 20.00
		Item(s) Subtotal: OR Shipping Address: OR __ of:
		
		*/
		//1st price to howMany, howMany to condition (ignore anything between [])
		//any more, 
		// shipping & handling
		// estimated gst/hst
		// estimated pst/rst/qst
		console.log("Name: " + name);
		console.log("Cost: " + float_cost);
		console.log("Quantity: " + quantity);
		//receipt_items.push({'name': name, 'cost': float_cost, 'quantity': quantity});
		
		receipt_items = [
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
		];
		chrome.windows.create({"url" : "addreceipt.html", "type" : "popup"});
	}
});