var isWiki = false;
var availableCategories = {};
var curURL = window.location.href;
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
		browser.runtime.sendMessage({
			task: 'enableCM',
			enableCM: true,
			title: n.textContent,
			href: n.href,
			caller: curURL
		});
	});
}

// listener for incoming events
function contentMessageListener(listener) {
	switch(listener.task) {
		case 'getWiki': // event source: browseraction.js
			return Promise.resolve({'wiki': isWiki, 'categories': availableCategories, 'name': curHostname});
			break;
		case 'save': // event source: browseraction.js
			browser.runtime.sendMessage({
				task: 'storeFromPopup',
				title: listener.name,
				href: listener.href,
				caller: 'ba'
			});
			break;
		case 'raiseError': // event source: background.js
			if(typeof listener.target === 'undefined' || listener.target != curURL)
				return;
			raiseError(listener.error);
			break;
	}
}

// visual error handler
function raiseError(error) {
	var dialog = document.createElement('dialog');
	var id = 0;
	while(document.getElementById('mwc_err' + id) != null) {
		++id;
	}
	dialog.id = 'mwc_err' + id;
	dialog.open = true;
	dialog.style.cssText = 'position: fixed; z-index: 100; top: calc(50% - 5em); padding: 0.5em 1em; width: 20em; background-color: white; border: 0; border-radius: 1em; box-shadow: 0 0 0.5em 0.5em crimson;';
	dialog.innerHTML = '<h3>' + browser.i18n.getMessage("errorDialogTitle") + '</h3>\
	<hr>\
	<p style="text-align:justify;">' + error + '</p>\
	<p style="text-align:center;"><input type="button" style="padding:0.5em;font-weight:bold;" onclick="document.getElementById(\'mwc_err' + id + '\').remove();" value="' + browser.i18n.getMessage("errorDialogOK") + '"></p>';
	document.getElementsByTagName('BODY')[0].insertBefore(dialog, document.getElementsByTagName('BODY')[0].firstChild);
}

browser.runtime.onMessage.addListener(contentMessageListener);