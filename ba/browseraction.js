document.getElementById("ba_title").textContent = browser.i18n.getMessage("extensionName");
document.getElementById("ba_popup").value = browser.i18n.getMessage("browserActionOpenPopup");
document.getElementById("ba_popup").addEventListener("click", openTab);

function checkTab() {
	var connection = true;
	var current = browser.tabs.query({active: true, currentWindow: true})
	.then(tl => browser.tabs.sendMessage(tl[0].id, {'task': 'getWiki'}))
	.catch(e => connection = false);
	if(connection)
		current.then(checkTabWiki);
	else
		document.getElementById("ba_current").textContent = browser.i18n.getMessage("browserActionNoWiki");
}

function checkTabWiki(tabData) {
	if(!tabData.wiki)
		document.getElementById("ba_current").textContent = browser.i18n.getMessage("browserActionNoWiki");
	else {
		let html = `<h4>${browser.i18n.getMessage("browserActionAvailableCategories")}</h4>`;
		for(const [k, v] of Object.entries(tabData.categories)) {
			html += `<p name="currentCategories" data-name="${k}" data-href="${v}">💾 ${k}</p>`;
		}
		document.getElementById("ba_current").innerHTML = html;
		document.getElementsByName("currentCategories").forEach(function(node) {node.addEventListener("click", saveCategory);});
	}
}

function openTab() {
	browser.tabs.create({'active': false, 'url': '../popup/popup.html'});
}

function saveCategory() {
	browser.tabs.query({active: true, currentWindow: true})
	.then(tl => browser.tabs.sendMessage(tl[0].id, {'task': 'save', 'name': this.getAttribute('data-name'), 'href': this.getAttribute('data-href')}))
	.then(this.classList.add('saved'))
	.catch(e => raiseError(this, e));
}

function raiseError(caller, error) {
	caller.classList.remove('saved');
	caller.classList.add('error');
	document.getElementById("error").textContent = error;
	document.getElementById("error").classList.add('error');
}

window.onload = checkTab();