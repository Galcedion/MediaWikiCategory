document.getElementById("ba_title").textContent = browser.i18n.getMessage("extensionName");
document.getElementById("ba_popup").value = browser.i18n.getMessage("browserActionOpenPopup");
document.getElementById("ba_popup").addEventListener("click", openTab);
var lastSelected;

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
		var html = `<h4>${browser.i18n.getMessage("browserActionAvailableCategories")}</h4>`;
		for(const [k, v] of Object.entries(tabData.categories)) {
			html += `<p name="currentCategories" data-name="${k}" data-href="${v}" title="${browser.i18n.getMessage("titleSave")}"><img src="../heroicons/folder-arrow-down.svg" class="icon"> ${k}</p>`;
		}
		document.getElementById("ba_current").innerHTML = html;
		document.getElementsByName("currentCategories").forEach(function(node) {node.addEventListener("click", saveCategory);});
	}
}

// open popup.html in a new tab
function openTab() {
	browser.tabs.create({'active': false, 'url': '../popup/popup.html'});
}

// send call to current tab to save the selected category
function saveCategory() {
	lastSelected = this;
	browser.tabs.query({active: true, currentWindow: true})
	.then(tl => browser.tabs.sendMessage(tl[0].id, {'task': 'save', 'name': this.getAttribute('data-name'), 'href': this.getAttribute('data-href')}))
	.then(this.classList.add('saved'))
	.catch(e => raiseError(this, e));
}

// visual error handler
function raiseError(caller, error) {
	caller.classList.remove('saved');
	caller.classList.add('error');
	document.getElementById("error").textContent = error;
	document.getElementById("error").classList.add('error');
}

// listener for incoming events
function contentMessageListener(listener) {
	switch(listener.task) {
		case 'raiseError': // event source: background.js
			if(typeof listener.target === 'undefined' || listener.target != 'ba')
				return;
			raiseError(lastSelected, listener.error);
			break;
	}
}

window.onload = checkTab();
browser.runtime.onMessage.addListener(contentMessageListener);