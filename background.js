const MEDIAWIKI_MENU_ITEM = "mediawiki-menu-item";

var targetTitle;
var targetHref;
var categeoriesOnPage;
var tmpStorage = {};

browser.menus.create({
	id: MEDIAWIKI_MENU_ITEM,
	contexts: ["link"],
	title: browser.i18n.getMessage("dropdownDefault"),
	visible: false
});
/*browser.browserAction.setIcon({
	"16": "icon.svg"
});*/
browser.browserAction.setTitle({
	title: browser.i18n.getMessage("extensionName")
});

browser.browserAction.setPopup({popup: 'ba/browseraction.html'});

function messageListener(listener) {
	switch(listener.task) {
		case 'enableCM':
			messageListenerDisplayCM(listener);
			break;
		case 'addCategoryBulk':
			messageListenerAddCategoryBulk(listener);
			break;
		case 'catPopup':
			messageStoreCaregoryPopupData(listener);
			break;
		case 'storeFromPopup':
			storeFromPopup(listener);
			break;
	}
}

function messageListenerDisplayCM(listener) {
	if(listener.enableCM) {
		browser.menus.update(MEDIAWIKI_MENU_ITEM, {
			visible: true,
			title: `${browser.i18n.getMessage("fetchCategory")}: ${listener.title}`
		});
		targetTitle = listener.title;
		targetHref = (new URL(listener.href));
		/*var req = new XMLHttpRequest();
		req.open('GET', targetHref);
		req.responseType = 'document';
		req.setRequestHeader('Access-Control-Allow-Origin', '*'); // User Agent?
		req.setRequestHeader('Accept', 'text/html'); // User Agent?
		req.addEventListener('load', function() {
			console.log(req.status);
		});
		req.send();*/
	}
	else
		browser.menus.update(MEDIAWIKI_MENU_ITEM, {visible: false});
	browser.menus.refresh();
}

function messageListenerAddCategoryBulk(listener) {
	console.log(`A content script sent a message: ${listener.title}`);
	console.log(`A content script sent a message: ${listener.data}`);
}

function messageStoreCaregoryPopupData(listener) {
	categeoriesOnPage = listener.all;
}

function messageListenerHideCM() {
	browser.menus.update(MEDIAWIKI_MENU_ITEM, {visible: false});
	browser.menus.refresh();
}

function storeFromPopup(listener) {
	targetTitle = listener.title;
	targetHref = (new URL(listener.href));
	storageManager();
}

function storageManager() {
	var sm = browser.storage.local.get(null);
	sm.then(storageManagerStream);
}

function storageManagerStream(storedData) {
	if(targetHref.hostname in storedData) {
		var content = JSON.parse(storedData[targetHref.hostname]);
		for(let i = 0; i < content.length; i++) {
			if(content[i]['title'] == targetTitle)
				return;
		}
	}
	scrapeCategoryTask(storedData, targetHref);
}

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

function scrapeCategoryList(content, storedData) {
	var catLinks = [];
	var hasNext = false;
	if(content.querySelector("#mw-pages")) {
		catLinks = content.querySelectorAll('#mw-pages .mw-category a');
		var converted = content.querySelector('#mw-pages').innerHTML;
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
	else if(content.querySelector('.category-page__members')) {
		catLinks = content.querySelectorAll('.category-page__members a.category-page__member-link');
		if(content.querySelector('.category-page__pagination-next'))
			hasNext = content.querySelector('.category-page__pagination-next').href;
	}
	var catList = {};
	var replacer = targetHref.href.replace(targetHref.pathname, '');
	for(let i = 0; i < catLinks.length; i++) {
		catList[catLinks[i].title] = catLinks[i].href.replace(replacer, '');
	}

	var content;
	if(targetHref.hostname in storedData) {
		content = JSON.parse(storedData[targetHref.hostname]);
	} else {
		content = [];
	}
	var existing = false;
	content.forEach(function(c) {if(c['title'] == targetTitle) c['items'] = {... c['items'], ...catList}; existing = true;});
	if(!existing)
		content.push({'title': targetTitle, 'path': targetHref.pathname, 'protocol': targetHref.protocol, 'items' : catList});
	storedData[targetHref.hostname] = JSON.stringify(content);

	if(hasNext !== false) {;
		if(!hasNext.startsWith(targetHref.protocol + '//' + targetHref.hostname))
			hasNext = targetHref.protocol + '//' + targetHref.hostname + hasNext;
		scrapeCategoryTask(storedData, new URL(hasNext));
	} else {
		browser.storage.local.set(storedData);
	}
}

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

function processCategoryPage(res) {
	console.log(`Characters: ${res.status}`);
	console.log(`Characters: ${res.responseText.length}`);
}

browser.runtime.onMessage.addListener(messageListener);
browser.menus.onHidden.addListener(messageListenerHideCM);
browser.menus.onClicked.addListener(storageManager);
/*browser.menus.onClicked.addListener((info, tab) => {
	console.log(`Item ${info.menuItemId} clicked in tab ${tab.id}`);
});*/