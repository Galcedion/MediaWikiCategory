document.getElementById("ba_title").textContent = browser.i18n.getMessage("extensionName");
document.getElementById("ba_popup").value = browser.i18n.getMessage("browserActionOpenPopup");
document.getElementById("ba_popup").addEventListener("click", openTab);
document.getElementById("error").addEventListener("click", closeError);
var lastSelected;
var detailTarget = false;
var blockBackground = false;

// entry point for browser action
// access current tab to check for wiki presence
function checkTab() {
	var connection = true;
	var current = browser.tabs.query({active: true, currentWindow: true})
	.then(tl => browser.tabs.sendMessage(tl[0].id, {'task': 'getWiki'}))
	.catch(e => connection = false);
	if(connection) // on reply move on
		current.then(checkTabWiki);
	else // no wiki when tabs error
		document.getElementById("ba_current").textContent = browser.i18n.getMessage("browserActionNoWiki");
}

// check whether the current tab is a wiki
function checkTabWiki(tabData) {
	if(!tabData.wiki) // if no wiki
		document.getElementById("ba_current").textContent = browser.i18n.getMessage("browserActionNoWiki");
	else { // else display available categories
		document.getElementById("ba_popup").value = browser.i18n.getMessage("browserActionOpenPopupDetail") + ': ' + tabData.name;
		detailTarget = tabData.name;
		var html = `<h4>${browser.i18n.getMessage("browserActionAvailableCategories")}</h4>`;
		for(const [k, v] of Object.entries(tabData.categories)) {
			html += `<p name="currentCategories" data-name="${k}" data-href="${v}" title="${browser.i18n.getMessage("titleSave")}"><img src="../heroicons/folder-arrow-down.svg" class="icon"> ${k}</p>`;
		}
		document.getElementById("ba_current").innerHTML = html;
		document.getElementsByName("currentCategories").forEach(function(node) {node.addEventListener("click", saveCategory);});
		fetchStorage();
	}
}

// open popup.html in a new tab
function openTab() {
	let targetURL = '../popup/popup.html';
	if(detailTarget)
		targetURL += '?wiki=' + detailTarget;
	browser.tabs.create({'active': false, 'url': targetURL});
}

// send call to current tab to save the selected category
function saveCategory() {
	if(blockBackground)
		return;
	lastSelected = this;
	browser.tabs.query({active: true, currentWindow: true})
	.then(tl => browser.tabs.sendMessage(tl[0].id, {'task': 'save', 'name': this.getAttribute('data-name'), 'href': this.getAttribute('data-href')}))
	//.then(this.classList.add('saved'))
	.catch(e => {raiseError(this, e);});
}

// visual error handler
function raiseError(caller, error) {
	if(caller !== null) {
		caller.classList.remove('saved');
		caller.classList.add('error');
	}
	let errorNode = document.getElementById("error");
	errorNode.textContent = error;
	errorNode.classList.add('error');
	errorNode.title = browser.i18n.getMessage("titleClose");
}

// close open error message
function closeError() {
	let errorNode = document.getElementById("error");
	errorNode.textContent = '';
	errorNode.classList.remove('error');
}

// listener for incoming events
function contentMessageListener(listener) {
	if(typeof listener.target === 'undefined' || listener.target != 'ba')
		return;
	switch(listener.task) {
		case 'raiseError': // event source: background.js
			raiseError(lastSelected, listener.error);
			break;
		case 'finishedCategoryScrape': // event source: background.js
			listener.category = new URL(listener.category).pathname;
			let catList = document.getElementsByName("currentCategories");
			for(let i = 0; i < catList.length; i++) {
				if(catList[i].dataset.href.includes(listener.category))
					listener.success ?  catList[i].classList.add('saved') : catList[i].classList.add('error');
			}
			break;
	}
}

// main storage function, creating a promise
function fetchStorage() {
	var sm = browser.storage.local.get(null);
	sm.then(fetchStream);
}

// retrieving storage stream, checking current wiki for categories already stored
function fetchStream(dataStream) {
	for(let [key, value] of Object.entries(dataStream)) {
		if(key == detailTarget) {
			let storedCategories = [];
			JSON.parse(value).forEach(function(elem) {storedCategories.push(elem.title);});
			document.getElementsByName('currentCategories').forEach(function(node) {if(storedCategories.includes(node.dataset.name)) node.classList.add('saved');});
			break;
		}
	}
}

window.onload = checkTab();
browser.runtime.onMessage.addListener(contentMessageListener);