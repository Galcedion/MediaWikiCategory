document.getElementById("ba_title").innerHTML = browser.i18n.getMessage("extensionName");
document.getElementById("ba_popup").value = browser.i18n.getMessage("browserActionOpenPopup");
document.getElementById("ba_popup").addEventListener("click", openTab);

function checkTab() {
	var current = browser.tabs.query({active: true, currentWindow: true}).then(tl => browser.tabs.sendMessage(tl[0].id, {'task': 'getWiki'})); // TODO: can fail on FF internal pages
	current.then(checkTabWiki);
}

function checkTabWiki(tabData) {
	if(!tabData.wiki)
		document.getElementById("ba_current").innerHTML = browser.i18n.getMessage("browserActionNoWiki");
}

function openTab() {
	browser.tabs.create({'active': false, 'url': '../popup/popup.html'});
}

window.onload = checkTab();