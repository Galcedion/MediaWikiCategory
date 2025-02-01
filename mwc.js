var isWiki = false;
var curHostname = new URL(window.location.href).hostname;
var objMWDomain = browser.storage.local.get(curHostname);
objMWDomain.then(loadMWDomain);

function loadMWDomain(storage) { // TODO: necessary?
	if(!storage[curHostname])
		return;
		//[
		//{"title" "path" "items":{
}

mwc_check();

// check if the page contains mediawiki categories
function mwc_check() {
	if(document.querySelector("body.mediawiki"))
		mwc_attach();
}

// attache event handlers to categories and fetch all categories for action button
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
	var catPopup = {};
	n.addEventListener("contextmenu", function() {
		var targetTitle = n.innerHTML;
		var targetHref = n.href;
		catPopup[targetTitle] = targetHref;
		browser.runtime.sendMessage({
			task: 'enableCM',
			enableCM: true,
			title: targetTitle,
			href: targetHref
		});
	});
	browser.runtime.sendMessage({
		task: 'catPopup',
		enableCM: true,
		all: catPopup,
	});
}

function contentMessageListener(listener) {
	switch(listener.task) {
		case 'getWiki':
			return Promise.resolve({'wiki': isWiki});
			break;
	}
}

browser.runtime.onMessage.addListener(contentMessageListener);
