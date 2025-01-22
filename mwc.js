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
	if((document.getElementById("catlinks") && document.getElementById("catlinks").hasChildNodes()) || document.getElementById("mw-category-generated"))
		mwc_attach();
}

// attache event handlers to categories and fetch all categories for action button
function mwc_attach() {
	if(document.getElementById("catlinks") && document.getElementById("catlinks").hasChildNodes()) {
		var catlist = document.getElementById("catlinks").firstChild.lastChild;
		var catPopup = {};
		catlist.childNodes.forEach(getCategories);

		function getCategories(n) {
			n.firstChild.addEventListener("contextmenu", function() {
				var targetTitle = n.firstChild.innerHTML;
				var targetHref = n.firstChild.href;
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
	}
}