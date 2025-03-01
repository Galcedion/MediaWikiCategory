const MEDIAWIKI_MENU_ITEM = "mediawiki-menu-item";

var targetTitle;
var targetHref;
var caller = false;
var categeoriesOnPage;
var tmpStorage = {};

// defining menu and browser action
browser.menus.create({
	id: MEDIAWIKI_MENU_ITEM,
	contexts: ["link"],
	title: browser.i18n.getMessage("dropdownDefault"),
	visible: false
});
browser.browserAction.setTitle({
	title: browser.i18n.getMessage("extensionName")
});
browser.browserAction.setPopup({popup: 'ba/browseraction.html'});

// listener for incoming events
function messageListener(listener) {
	switch(listener.task) {
		case 'enableCM': // event source: mwc.js
			messageListenerDisplayCM(listener);
			break;
		case 'storeFromPopup': // event source: mwc.js
			storeFromPopup(listener);
			break;
	}
}

// show / hide menu
function messageListenerDisplayCM(listener) {
	if(listener.enableCM) {
		browser.menus.update(MEDIAWIKI_MENU_ITEM, {
			visible: true,
			title: `${browser.i18n.getMessage("fetchCategory")}: ${listener.title}`
		});
		targetTitle = listener.title;
		targetHref = (new URL(listener.href));
		caller = listener.caller;
	}
	else // as of now this should never occour
		browser.menus.update(MEDIAWIKI_MENU_ITEM, {visible: false});
	browser.menus.refresh();
}

// hide the menu when the menu is not displayed
function messageListenerHideCM() {
	browser.menus.update(MEDIAWIKI_MENU_ITEM, {visible: false});
	browser.menus.refresh();
}

// passing popup storage request to storageManager
function storeFromPopup(listener) {
	targetTitle = listener.title;
	targetHref = (new URL(listener.href));
	storageManager(listener.caller);
}

// main storage function, creating a promise
function storageManager(caller = false) {
	var sm = browser.storage.local.get(null);
	sm.then(function(data) {storageManagerStream(data, caller);});
}

// check if requested category is already stored
function storageManagerStream(storedData, caller) {
	if(targetHref.hostname in storedData) { // if the wiki's category is already stored, return
		var content = JSON.parse(storedData[targetHref.hostname]);
		for(let i = 0; i < content.length; i++) {
			if(content[i]['title'] == targetTitle)
				return;
		}
	}
	scrapeCategoryTask(storedData, targetHref, caller);
}

// load category document for processing, web request
function scrapeCategoryTask(storedData, target, caller) {
	var req = new XMLHttpRequest();
	req.open('GET', target);
	req.responseType = 'document';
	req.setRequestHeader('Access-Control-Allow-Origin', '*'); // User Agent?
	req.setRequestHeader('Accept', 'text/html');
	req.addEventListener('load', function() {
		if(req.readyState === 4 && req.status === 200) { // TODO status != 200 ?
			scrapeCategoryList(req.responseXML, storedData);
		} else {
			transmitError(caller, browser.i18n.getMessage("errorWebReqFail"));
		}
	});
	req.addEventListener('error', function() {
		transmitError(caller, browser.i18n.getMessage("errorWebReqFail"));
	});
	req.send();
}

// search HTML code for category entries
function scrapeCategoryList(content, storedData, caller) {
	var catLinks = [];
	var hasNext = false;
	if(content.querySelectorAll('#mw-pages .mw-category').length == 1) { // locate category area and grab individual category entries
		catLinks = content.querySelectorAll('#mw-pages .mw-category a');
		var converted = content.querySelector('#mw-pages').innerHTML; // manually search and grab next-page button
		converted = (converted.indexOf('<div') == -1 ? '' : converted.substring(0, converted.indexOf('<div')));
		if(converted.lastIndexOf('(') == -1 || converted.lastIndexOf(')') == -1)
			converted = '';
		else
			converted = converted.substring(converted.lastIndexOf('(') + 1, converted.lastIndexOf(')'));
		if(converted.indexOf('<a') != -1) {
			converted = content.querySelector('#mw-pages div');
			if(converted !== null) {
				let limit = 0;
				let maxlimit = 2;
				while(limit <= maxlimit && (typeof converted.tagName === 'undefined' || converted.tagName.toLowerCase() != 'a')) {
					converted = converted.previousSibling;
					++limit;
				}
				if(limit <= maxlimit)
					hasNext = converted.href;
			}
		}
	}
	else if(content.querySelector('.category-page__members')) { // locate category area and grab individual category entries
		catLinks = content.querySelectorAll('.category-page__members a.category-page__member-link');
		if(content.querySelector('a.category-page__pagination-next')) // search and grab next-page button
			hasNext = content.querySelector('a.category-page__pagination-next').href;
	}
	var catList = {};
	var replacer = targetHref.href.replace(targetHref.pathname, '');
	for(let i = 0; i < catLinks.length; i++) { // fill category list, adjust href format for addon-use
		catList[catLinks[i].title] = catLinks[i].href.replace(replacer, '');
	}

	var content;
	if(targetHref.hostname in storedData) {
		content = JSON.parse(storedData[targetHref.hostname]);
	} else {
		content = [];
	}
	var existing = false;
	content.forEach(function(c) { // check if category is already stored, add additional items
		if(c['title'] == targetTitle) {
			c['items'] = {... c['items'], ...catList};
			existing = true;
		}
	});
	if(!existing)
		content.push({'title': targetTitle, 'path': targetHref.pathname, 'protocol': targetHref.protocol, 'items' : catList});
	storedData[targetHref.hostname] = JSON.stringify(content);

	if(hasNext !== false) { // if next-page is available, call next page
		if(!hasNext.startsWith(targetHref.protocol + '//' + targetHref.hostname))
			hasNext = targetHref.protocol + '//' + targetHref.hostname + hasNext;
		scrapeCategoryTask(storedData, new URL(hasNext), caller);
	} else {
		browser.storage.local.set(storedData);
	}
}

function transmitError(to, errorMsg) {
	if(to == 'ba') {
		browser.runtime.sendMessage({
			task: 'raiseError',
			caller: 'background',
			target: to,
			error: errorMsg
		});
	} else {
		browser.tabs.query({active: true, currentWindow: true})
		.then(tl => {
			for(let t of tl) {
				browser.tabs.sendMessage(t.id, {
					task: 'raiseError',
					caller: 'background',
					target: to,
					error: errorMsg
				});
			}
		});
	}
}

browser.runtime.onMessage.addListener(messageListener);
browser.menus.onHidden.addListener(messageListenerHideCM);
browser.menus.onClicked.addListener(function() {storageManager(caller);});