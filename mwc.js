var isWiki = false;
var availableCategories = {};
var curHostname = new URL(window.location.href).hostname;

mwc_check();

// check if the page contains mediawiki categories
function mwc_check() {
	if(document.querySelector("body.mediawiki"))
		mwc_attach();
}

// attach event handlers to categories and fetch all categories for action button
function mwc_attach() {
	isWiki = true;
	if(document.querySelector("#catlinks ul")) {
		let catlist = document.querySelectorAll("#catlinks ul a");
		catlist.forEach(mwc_addListener);
	}
	if(document.querySelector("#articleCategories .category")) {
		let catlist = document.querySelectorAll("#articleCategories .category a");
		catlist.forEach(mwc_addListener);
	}
	if(document.querySelector("#mw-subcategories .CategoryTreeItem")) {
		let catlist = document.querySelectorAll("#mw-subcategories .CategoryTreeItem bdi a");
		catlist.forEach(mwc_addListener);
	}
}

// add listener to all given nodes
function mwc_addListener(n) {
	availableCategories[n.textContent] = n.href;
	n.addEventListener("contextmenu", function() {
		var targetTitle = n.textContent;
		var targetHref = n.href;
		browser.runtime.sendMessage({
			task: 'enableCM',
			enableCM: true,
			title: targetTitle,
			href: targetHref
		});
	});
}

// listener for incoming events
function contentMessageListener(listener) {
	switch(listener.task) {
		case 'getWiki': // event source: browseraction.js
			return Promise.resolve({'wiki': isWiki, 'categories': availableCategories});
			break;
		case 'save': // event source: browseraction.js
			browser.runtime.sendMessage({
				task: 'storeFromPopup',
				title: listener.name,
				href: listener.href,
			});
			break;
	}
}

browser.runtime.onMessage.addListener(contentMessageListener);