const MEDIAWIKI_MENU_ITEM = "mediawiki-menu-item";

var targetTitle;
var targetHref;
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
		case 'addCategoryBulk': // event source: none // TODO: is this necessary?
			messageListenerAddCategoryBulk(listener);
			break;
		case 'catPopup': // event source: mwc.js
			messageStoreCaregoryPopupData(listener);
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
	}
	else // as of now this should never occour
		browser.menus.update(MEDIAWIKI_MENU_ITEM, {visible: false});
	browser.menus.refresh();
}

// TODO, is this necessary? see listener addCategoryBulk
function messageListenerAddCategoryBulk(listener) {
	console.log(`A content script sent a message: ${listener.title}`);
	console.log(`A content script sent a message: ${listener.data}`);
}

// TODO this currently serves no purpose
function messageStoreCaregoryPopupData(listener) {
	categeoriesOnPage = listener.all;
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
	storageManager();
}

// main storage function, creating a promise
function storageManager() {
	var sm = browser.storage.local.get(null);
	sm.then(storageManagerStream);
}

// check if requested category is already stored
function storageManagerStream(storedData) {
	if(targetHref.hostname in storedData) { // if the wiki's category is already stored, return
		var content = JSON.parse(storedData[targetHref.hostname]);
		for(let i = 0; i < content.length; i++) {
			if(content[i]['title'] == targetTitle)
				return;
		}
	}
	scrapeCategoryTask(storedData, targetHref);
}

// load category document for processing, web request
function scrapeCategoryTask(storedData, target) {
	var req = new XMLHttpRequest();
	req.open('GET', target);
	req.responseType = 'document';
	req.setRequestHeader('Access-Control-Allow-Origin', '*'); // User Agent?
	req.setRequestHeader('Accept', 'text/html');
	req.addEventListener('load', function() {
		if(req.readyState === 4 && req.status === 200) { // TODO status != 200 ?
			scrapeCategoryList(req.responseXML, storedData);
		}
	});
	req.send();
}

// search HTML code for category intries
// TODO improve overall resiliance against changes in the HTML structure
function scrapeCategoryList(content, storedData) {
	var catLinks = [];
	var hasNext = false;
	if(content.querySelector("#mw-pages")) { // locate category area and grab individual category entries
		catLinks = content.querySelectorAll('#mw-pages .mw-category a');
		var converted = content.querySelector('#mw-pages').innerHTML; // manually search and grab next-page button
		converted = converted.substring(0, converted.indexOf('<div'));
		converted = converted.substring(converted.lastIndexOf('(') + 1, converted.lastIndexOf(')'));
		if(converted.indexOf('<a') != -1) {
			converted = content.querySelector('#mw-pages div');
			while(typeof converted.tagName === 'undefined' || converted.tagName.toLowerCase() != 'a') { // TODO hacky!
				converted = converted.previousSibling;
			}
			hasNext = converted.href;
		}
	}
	else if(content.querySelector('.category-page__members')) { // locate category area and grab individual category entries
		catLinks = content.querySelectorAll('.category-page__members a.category-page__member-link');
		if(content.querySelector('.category-page__pagination-next')) // search and grab next-page button
			hasNext = content.querySelector('.category-page__pagination-next').href;
	}
	var catList = {};
	var replacer = targetHref.href.replace(targetHref.pathname, '');
	for(let i = 0; i < catLinks.length; i++) { // adjust href format for addon-use
		catList[catLinks[i].title] = catLinks[i].href.replace(replacer, '');
	}

	var content;
	if(targetHref.hostname in storedData) {console.log(1);
		content = JSON.parse(storedData[targetHref.hostname]);
	} else {
		content = [];
	}
	var existing = false;
	content.forEach(function(c) {if(c['title'] == targetTitle) c['items'] = {... c['items'], ...catList}; existing = true;});
	if(!existing)
		content.push({'title': targetTitle, 'path': targetHref.pathname, 'protocol': targetHref.protocol, 'items' : catList});
	storedData[targetHref.hostname] = JSON.stringify(content);

	if(hasNext !== false) { // if next-page is available, call next page
		if(!hasNext.startsWith(targetHref.protocol + '//' + targetHref.hostname))
			hasNext = targetHref.protocol + '//' + targetHref.hostname + hasNext;
		scrapeCategoryTask(storedData, new URL(hasNext));
	} else {
		browser.storage.local.set(storedData);
	}
}

// TODO is this necessary?
function fetchCategoryPage(categoryURL) {
	var req = fetch(categoryURL, {
		method: 'GET',
		mode: 'cors',
		headers: {
			'Accept': 'text/html',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': '*'
		},
		referrerPolicy: 'no-referrer'
	});
	req.then(processCategoryPage);
}

// TODO is this necessary?
function processCategoryPage(res) {
	console.log(`Characters: ${res.status}`);
	console.log(`Characters: ${res.responseText.length}`);
}

browser.runtime.onMessage.addListener(messageListener);
browser.menus.onHidden.addListener(messageListenerHideCM);
browser.menus.onClicked.addListener(storageManager);