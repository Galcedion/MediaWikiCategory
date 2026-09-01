document.title = browser.i18n.getMessage("extensionName");
document.getElementById("p_title").textContent = browser.i18n.getMessage("popupTitle");
document.getElementById("p_available").textContent = browser.i18n.getMessage("popupLoading");
document.getElementById("p_nav_overview").textContent = browser.i18n.getMessage("popupNavOverview");
document.getElementById("p_nav_show").textContent = browser.i18n.getMessage("popupNavShow");
document.getElementById("p_info").title = browser.i18n.getMessage("titleInfo");
document.getElementById("p_storage").title = browser.i18n.getMessage("titleStorage");
document.getElementById("p_refresh").title = browser.i18n.getMessage("titleRefresh");
document.getElementById("p_deleteall").title = browser.i18n.getMessage("titleDeleteAll");
document.getElementById("p_info").addEventListener("click", displayInfo);
document.getElementById("p_storage").addEventListener("click", displayStorage);
document.getElementById("p_refresh").addEventListener("click", refreshData);
document.getElementById("p_deleteall").addEventListener("click", deleteAll);
document.getElementById("p_nav_overview").addEventListener("click", showOverview);
document.addEventListener("keydown", function(event) {if(event.key == 'Escape') displayCleanup();});
document.addEventListener("mouseup", function(e) {mouseDown = false;});
var storedData;
var selectedCategories;
var toShow = null;
var operatorList = { // reference for math operators
	'AND': {'title': browser.i18n.getMessage("titleAND"), TEXT: "AND", LOGICSYMBOL: "⋀"},
	'OR': {'title': browser.i18n.getMessage("titleOR"), TEXT: "OR", LOGICSYMBOL: "⋁"},
	'XOR': {'title': browser.i18n.getMessage("titleXOR"), TEXT: "XOR", LOGICSYMBOL: "⊻"},
	'NAND': {'title': browser.i18n.getMessage("titleNAND"), TEXT: "NAND", LOGICSYMBOL: "⊼"},
	'NOR': {'title': browser.i18n.getMessage("titleNOR"), TEXT: "NOR", LOGICSYMBOL: "⊽"},
	'XNOR': {'title': browser.i18n.getMessage("titleXNOR"), TEXT: "XNOR", LOGICSYMBOL: "⊙"}
};
const storageUsageTotal = browser.i18n.getMessage("popupStorageTotal");
var storageUsage = {};
var currentTabsURL = [];
const displayState = {NODATA: 'NODATA', DATA: 'DATA', OVERVIEW: 'OVERVIEW', INWIKI: 'INWIKI'}; // reference for reload operations to refresh specific sections
var pageDisplayState = displayState.NODATA;
var rebuild = false;
var caseSensitive = false;
var tt_operator = null;
var mouseDown = false;
var langList = [];

var settings = {};
var getSettings = browser.storage.sync.get();
getSettings.then(loadSettings);

// load sync storage settings
function loadSettings(syncSettings) {
	let tmp = "TEXT";
	if(syncSettings.notation)
		tmp = syncSettings.notation;
	settings["notation"] = tmp;
	tmp = "SIMPLE";
	if(syncSettings.math)
		tmp = syncSettings.math;
	settings["math"] = tmp;
}

// fetch open tabs
function loadCurrentTabs() {
	currentTabsURL = [];
	browser.tabs.query({}).then(tl => {
		for(const t of tl) {
			if(t.url.indexOf('#') >= 0)
				t.url = t.url.substring(0, t.url.indexOf('#'));
			currentTabsURL.push(t.url);
		}
	});
}

// toggle display of info
function displayInfo() {
	let isActive = Boolean(document.getElementById("info_display"));
	displayCleanup();
	if(isActive)
		return;
	document.getElementById("p_info").classList.add("active");
	let infoDisplay = generateNode('div', {'id': 'info_display', 'class': 'display_box info_display'});
	infoDisplay.innerHTML += `${browser.i18n.getMessage("infoDialogPopupUse")}<br>${browser.i18n.getMessage("infoDialogTruthTableUse")}`; // TODO in general try to replace br with CSS
	let operatorHTML = '';
	for(let [key, value] of Object.entries(operatorList)) {
		operatorHTML += `<i name="tt_operator" data-operator="${key}">${value[settings.notation]}</i>`;
	}
	infoDisplay.innerHTML += `<div class="info-operators text-center">${operatorHTML}</div><h4 id="tt_title" class="text-center">${browser.i18n.getMessage("infoDialogTruthTable")}</h4>`;
	infoDisplay.innerHTML += `<table id="tt_table" class="margin-center text-center">
		<tr>
			<th>${browser.i18n.getMessage("infoDialogTruthTableCategoryLeft")}</th><th>${browser.i18n.getMessage("infoDialogTruthTableCategoryRight")}</th><th>${browser.i18n.getMessage("infoDialogTruthTableResult")}</th>
		</tr>
		<tr><td class="tt_no">${browser.i18n.getMessage("infoDialogTruthTableNo")}</td><td class="tt_no">${browser.i18n.getMessage("infoDialogTruthTableNo")}</td><td></td></tr>
		<tr><td class="tt_no">${browser.i18n.getMessage("infoDialogTruthTableNo")}</td><td class="tt_yes">${browser.i18n.getMessage("infoDialogTruthTableYes")}</td><td></td></tr>
		<tr><td class="tt_yes">${browser.i18n.getMessage("infoDialogTruthTableYes")}</td><td class="tt_no">${browser.i18n.getMessage("infoDialogTruthTableNo")}</td><td></td></tr>
		<tr><td class="tt_yes">${browser.i18n.getMessage("infoDialogTruthTableYes")}</td><td class="tt_yes">${browser.i18n.getMessage("infoDialogTruthTableYes")}</td><td></td></tr>
	</table>`;
	document.getElementById("p_special").appendChild(infoDisplay);
	document.getElementsByName("tt_operator").forEach(function(i) {i.addEventListener("mouseover", showTruthTable)});
}

// toggle display of storage in use
function displayStorage() {
	let isActive = Boolean(document.getElementById("storage_display"));
	displayCleanup();
	if(isActive)
		return;
	const units = {0: 'B', 1: 'kB', 2: 'MB', 3: 'GB', 4: 'TB'};
	document.getElementById("p_storage").classList.add("active");
	let storageDisplay = generateNode('div', {'id': 'storage_display', 'class': 'display_box storage_display'});
	let table = generateNode('table', {'class': 'margin-center'});
	let firstRow = true;
	for(let [key, value] of Object.entries(storageUsage)) {
		let unitStep = 0;
		while(value > 1024 && unitStep + 1 < Object.keys(units).length) {
			unitStep += 1;
			value /= 1024;
		}
		value = (Math.ceil(value * 10) / 10).toFixed(1);
		let tr = generateNode('tr');
		if(firstRow) {
			tr.appendChild(generateNode('th', {}, {}, key));
			tr.appendChild(generateNode('th', {}, {}, `${value} ${units[unitStep]}`));
			firstRow = false;
		} else {
			tr.appendChild(generateNode('td', {}, {}, key));
			tr.appendChild(generateNode('td', {}, {}, `${value} ${units[unitStep]}`));
		}
		table.appendChild(tr);
	}
	storageDisplay.appendChild(table);
	document.getElementById("p_special").appendChild(storageDisplay);
}

// removes unnecessary elements from the page
function displayCleanup() {
	if(document.getElementById("info_display")) { // remove displayInfo content
		document.getElementById("info_display").remove();
		document.getElementById("p_info").classList.remove("active");
		tt_operator = null;
	}
	if(document.getElementById("storage_display")) { // remove displayStorage content
		document.getElementById("storage_display").remove();
		document.getElementById("p_storage").classList.remove("active");
	}
}

// refresh data and rebuild UI
function refreshData() {
	if(document.getElementById("storage_display"))
		displayStorage();
	rebuild = true;
	fetchStorage();
	loadCurrentTabs();
}

// toggle display to overview
function showOverview() {
	pageDisplayState = displayState.OVERVIEW;
	document.getElementById("p_nav_overview").classList.add("active");
	document.getElementById("p_nav_show").classList.remove("active")
	document.getElementById("p_overview").classList.remove("hidden");
	document.getElementById("p_wiki").classList.add("hidden");
}

// toggle display to selected wiki
function showSelected() {
	pageDisplayState = displayState.INWIKI;
	document.getElementById("p_nav_overview").classList.remove("active");
	document.getElementById("p_nav_show").classList.add("active")
	document.getElementById("p_overview").classList.add("hidden");
	document.getElementById("p_wiki").classList.remove("hidden");
}

// main storage function, creating a promise to get local storage
function fetchStorage() {
	var sm = browser.storage.local.get(null);
	sm.then(fetchStream);
}

// delete either selected wiki or selected wiki category from storage
function deleteWiki() {
	var wiki = this.dataset.wiki;
	if(this.hasAttribute('data-category')) {
		var content = JSON.parse(storedData[wiki]);
		for(let i = 0; i < content.length; i++) {
			if(content[i]['title'] == this.dataset.category) {
				content.splice(i, 1);
				break;
			}
		}
		storedData[wiki] = JSON.stringify(content);
		browser.storage.local.set(storedData);
		this.parentNode.parentNode.remove();
	} else {
		browser.storage.local.remove(wiki);
		refreshData();
	}
}

// create dialog box to delete all local storage
function deleteAll() {
	let dialog = generateNode('dialog', {'id': 'delete_all_dialog', 'open': true});
	dialog.appendChild(generateNode('p', {}, {}, browser.i18n.getMessage("popupDeleteAllText")));
	let p = generateNode('p', {'style': 'text-align:center;'});
	p.appendChild(generateNode('input', {
		'type': 'button',
		'data-confirmation': 1,
		'value': browser.i18n.getMessage("popupDeleteAllYes")
	}, {'click': deleteAllConfirmation}));
	p.appendChild(generateNode('input', {
		'type': 'button',
		'data-confirmation': 0,
		'value': browser.i18n.getMessage("popupDeleteAllNo")
	}, {'click': deleteAllConfirmation}));
	dialog.appendChild(p);
	document.getElementsByTagName('BODY')[0].insertBefore(dialog, document.getElementsByTagName('BODY')[0].firstChild);
}

// on confirmation delete all local storage
function deleteAllConfirmation() {
	document.getElementById("delete_all_dialog").remove();
	if(this.dataset.confirmation == 1) {
		toShow = null;
		document.getElementById('p_nav_overview').click();
		document.getElementById("p_nav_show").textContent = browser.i18n.getMessage("popupNavShow");
		document.getElementById("p_nav_show").classList.remove("clickable");
		['p_available', 'p_math', 'p_result'].forEach(function(i) {clearChildren(document.getElementById(i));});
		browser.storage.local.clear();
		refreshData();
	}
}

// calculate approximate disc size in use by storage
function calculateStorage() {
	storageUsage[storageUsageTotal] = 0;
	for(let [key, value] of Object.entries(storedData)) {
		let curStorage = key.length * 2 + value.length * 2;
		storageUsage[storageUsageTotal] += curStorage;
		storageUsage[key] = curStorage;
	}
}

// retrieve data from local storage and create overview of all available wikis
function fetchStream(dataStream) {
	storedData = dataStream;
	if(typeof(storedData) === 'undefined' || Object.keys(storedData).length == 0) {
		document.getElementById("p_overview").appendChild(generateNode('div', {}, {}, browser.i18n.getMessage("popupNavOverviewEmpty")));
		document.getElementById("p_nav_show").classList.add('hidden');
		rebuild = false;
		return;
	}
	document.getElementById("p_nav_show").classList.remove('hidden');
	if(pageDisplayState == displayState.NODATA)
		pageDisplayState = displayState.DATA;
	clearChildren(document.getElementById("p_overview"));
	var html = '';
	for(let [key, value] of Object.entries(storedData)) {
		html += `<strong name="popupShow" title="${browser.i18n.getMessage("titleOpen")}" class="section_title clickable" data-wiki="${key}">
		<img name="popupShow" src="../heroicons/globe-alt.svg" class="icon" data-wiki="${key}" title="${browser.i18n.getMessage("titleOpen")}">
		${key}
		</strong>`;
		value = JSON.parse(value);
		var entries = value.length;
		var sum = 0;
		var entryContent = `<ul id="expand_list_${key}" class="category-list hidden">`;
		for(let i = 0; i < entries; i++) {
			let hasError = false;
			if(typeof value[i] !== 'object' || !validateCategoryData(value[i])) {
				hasError = true;
				raiseError(`${key}: ${browser.i18n.getMessage("errorPopupCorruptedCategory", value[i].title)}`);
			}
			entryContent += `<li>
			<div class="flex-10${hasError ? ' error' : ''}">${value[i]['title']}</div>
			<div class="flex-1 text-right">(${Object.keys(value[i]['items']).length})</div>
			<div class="flex-1 text-center"><img name="popupDelete" src="../heroicons/trash.svg" data-wiki="${key}" data-category="${value[i]['title']}" class="clickable icon" title="${browser.i18n.getMessage("titleDelete")}"></div>
			</li>`;
			sum += Object.keys(value[i]['items']).length;
		}
		entryContent += `</ul>`;
		html += `<div>
		<img id="expand_${key}" name="popupExpand" src="../heroicons/arrows-pointing-out.svg" class="icon${sum == 0 ? ' disabled' : ' clickable'}" data-wiki="${key}" data-expanded="0" title="${sum == 0 ? browser.i18n.getMessage("titleDisabled") : browser.i18n.getMessage("titleOpen")}">
		${entries} ${browser.i18n.getMessage("popupCategories")}, ${sum} ${browser.i18n.getMessage("popupPages")}
		<img name="popupDelete" src="../heroicons/trash.svg" class="clickable icon" data-wiki="${key}" title="${browser.i18n.getMessage("titleDelete")}">
		</div>`;
		html += entryContent;
	}
	calculateStorage();
	document.getElementById("p_overview").innerHTML = html;
	document.getElementsByName("popupShow").forEach(function(node) {node.addEventListener("click", showWiki);});
	document.getElementsByName("popupExpand").forEach(function(node) {if(!node.classList.contains('disabled')) {node.addEventListener("click", expandWiki);}});
	document.getElementsByName("popupDelete").forEach(function(node) {node.addEventListener("click", deleteWiki);});
	let instantOpen = new URLSearchParams(window.location.search).get('wiki');
	if(instantOpen !== null) {
		document.querySelector(`.section_title[data-wiki="${instantOpen}"]`).click();
		let baseLocation = window.location.href.substring(0, window.location.href.lastIndexOf('?'));
		window.history.replaceState(null, '', baseLocation);
	}
	if(rebuild) { // rebuild on refresh
		if(pageDisplayState == displayState.INWIKI)
			document.querySelectorAll('[data-wiki="' + toShow + '"]')[0].click();
		else if(toShow !== null && pageDisplayState == displayState.OVERVIEW) {
			document.querySelectorAll('[data-wiki="' + toShow + '"]')[0].click();
			showOverview();
		}
		rebuild = false;
	}
}

// generator for HTML-Nodes
function generateNode(tag, params = {}, eventListener = {}, nodeInnerText = null) {
	let node = document.createElement(tag);
	for(const [k, v] of Object.entries(params)) {
		node.setAttribute(k, v);
	}
	for(const [k, v] of Object.entries(eventListener)) {
		node.addEventListener(k, v);
	}
	if(nodeInnerText !== null)
		node.innerText = nodeInnerText;
	return node;
}

// removes all child nodes as well as any textContent
function clearChildren(parent) {
	while(parent.lastElementChild) {
		parent.removeChild(parent.lastElementChild);
	}
	parent.textContent = '';
}

// check if the category has the necessary keys
function validateCategoryData(category) {
	let mandatoryKeys = {'title': ['r', /^.+$/g], 'path': ['r', /^[^<>\\ ]+$/g], 'protocol': ['r', /^\w+:$/g], 'items': ['o']};
	let optionalKeys = {'lang': /^\w+$/g}; // LEGACY SUPPORT for 1.1 and older
	for(mk in mandatoryKeys) {
		if(!(mk in category))
			return false;
		if(mandatoryKeys[mk][0] == 'r' && !(mandatoryKeys[mk][1]).test(category[mk]))
			return false;
		if(mandatoryKeys[mk][0] == 'o' && typeof category[mk] !== 'object')
			return false;
	}
	for(ok in optionalKeys) {
		if(ok in category && !(optionalKeys[ok]).test(category[ok]))
			return false;
	}
	return true;
}

// display selected wiki and stored categories of said wiki
function showWiki() {
	/* each category has:
	 * title - title of the category
	 * path - path to category
	 * lang - language of the category; introduced in MWC 1.2
	 * items - Obj. of k (string) - v (URL)
	 */
	selectedCategories = {};
	if('dataset' in this && toShow == this.dataset.wiki && !rebuild) {
		showSelected();
		return;
	}
	if(toShow !== null) {
		clearChildren(document.getElementById("p_math"));
		clearChildren(document.getElementById("p_result"));
	}
	if('dataset' in this)
		toShow = this.dataset.wiki;
	let availCatNode = document.getElementById("p_available");
	clearChildren(availCatNode);
	availCatNode.appendChild(generateNode('h4', {}, {}, browser.i18n.getMessage("popupMathAvailableCategories")));
	langList = [];
	JSON.parse(storedData[toShow]).forEach(function(category) {
		if("lang" in category && category.lang !== null && category.lang !== undefined && !langList.includes(category.lang))
			langList.push(category.lang);
		if(settings.math == "SIMPLE") {
			let label = generateNode('label', {'for': `sc_${category.title}`, 'class': 'clickable'});
			let input = generateNode('input', {
				'name': 'selected_cat',
				'id': `sc_${category.title}`,
				'class': 'clickable',
				'type': 'checkbox',
				'value': category.title
			},{'click': addCatCalc});
			label.appendChild(input);
			label.appendChild(generateNode('span', {}, {}, category.title));
			label.appendChild(generateNode('i', {}, {}, `(${Object.keys(category.items).length})`));
			availCatNode.appendChild(label);
		} else if(settings.math == "ADVANCED") {
			let button = generateNode('button', {'type': 'button', 'value': category.title, 'class': 'clickable'}, {'click': addCatCalc});
			button.appendChild(generateNode('img', {'src': '../heroicons/plus-circle.svg'}));
			let span = generateNode('span', {}, {}, category.title);
			span.appendChild(generateNode('i', {}, {}, Object.keys(category.items).length));
			button.appendChild(span);
			availCatNode.appendChild(button);
		}
	});

	if(!document.getElementById("p_nav_show").classList.contains("clickable")) {
		document.getElementById("p_nav_show").addEventListener("click", showSelected);
		document.getElementById("p_nav_show").classList.add("clickable");
	}
	document.getElementById("p_nav_show").textContent = toShow;
	if('dataset' in this)
		showSelected();
}

// expand the selected wiki and show its categories
function expandWiki() {
	var toExpand = document.getElementById('expand_list_' + this.dataset.wiki);
	if(this.dataset.expanded == '1') {
		toExpand.classList.add('hidden');
		this.src = '../heroicons/arrows-pointing-out.svg';
		this.dataset.expanded = 0;
		this.title = browser.i18n.getMessage("titleOpen");
		toExpand.previousElementSibling.classList.remove('border-merge');
	} else {
		toExpand.classList.remove('hidden');
		this.src = '../heroicons/arrows-pointing-in.svg';
		this.dataset.expanded = 1;
		this.title = browser.i18n.getMessage("titleClose");
		toExpand.previousElementSibling.classList.add('border-merge');
	}
}

// create calculation overview based on selected categories
function addCatCalc() {
	var caller = this.value;
	if((settings.math == "SIMPLE" && !this.checked)) {
		if(Object.keys(selectedCategories).length == 1)
			selectedCategories = {};
		else {
			for(let i = 0; i < Object.keys(selectedCategories).length; i++) {
				if(selectedCategories[i]['type'] != 'c' || selectedCategories[i]['value'] != caller)
					continue;
				for(let j = i; j < Object.keys(selectedCategories).length - 2; j++) {
					selectedCategories[j] = selectedCategories[j + 2];
				}
				delete selectedCategories[Object.keys(selectedCategories).length - 1];
				delete selectedCategories[Object.keys(selectedCategories).length - 1];
			}
		}
	} else if(settings.math == "SIMPLE" || settings.math == "ADVANCED") {
		if(Object.keys(selectedCategories).length > 0)
			selectedCategories[Object.keys(selectedCategories).length] = {'type' : 'o', 'value': 'AND'};
		selectedCategories[Object.keys(selectedCategories).length] = {'type' : 'c', 'value': caller};
	}
	renderMath();
}

//remove category from calculation overview
function removeCatCalc() {
	var remove = parseInt(this.dataset.selcat);
	if(Object.keys(selectedCategories).length == 1)
		selectedCategories = {};
	else {
		for(let i = 0; i < Object.keys(selectedCategories).length; i++) {
			if(i != remove)
				continue;
			for(let j = i; j < Object.keys(selectedCategories).length - 2; j++) {
				selectedCategories[j] = selectedCategories[j + 2];
			}
			delete selectedCategories[Object.keys(selectedCategories).length - 1];
			delete selectedCategories[Object.keys(selectedCategories).length - 1];
		}
	}
	renderMath();
}

// display the category math
function renderMath() {
	var pMath = document.getElementById("p_math");
	clearChildren(pMath);
	for(let i = 0; i < Object.keys(selectedCategories).length; i++) {
		if(selectedCategories[i]['type'] == 'o') {
			pMath.appendChild(generateOperators(i, selectedCategories[i]['value'], i));
		} else {
			let selCatParams = {'id': `selcat_${i}`, 'name': 'selcat'}
			if(settings.math == "ADVANCED") {
				var container = generateNode('div', {'class': (Object.keys(selectedCategories).length > 1) ? 'math-move' : 'math-fixed'});
			} else {
				if(Object.keys(selectedCategories).length > 1)
					selCatParams['class'] = 'math-move';
				else
					selCatParams['class'] = 'math-fixed';
			}
			let selCat = generateNode('div', selCatParams);
			selCat.appendChild(generateNode('i', {}, {}, `${selectedCategories[i]['value']}`));
			if(Object.keys(selectedCategories).length > 1) {
				selCat.addEventListener("mousedown", function(e) {
					mouseDown = this.id;
					this.style.cursor = 'grabbing';
					this.style.zIndex = 1;
					this.dataset.offset = e.clientX;
					this.classList.add('math-moving');
				});
				selCat.addEventListener("mousemove", function(e) {
					e.preventDefault();
					if(mouseDown != this.id)
						return;
					this.style.left = `${e.clientX - parseInt(this.dataset.offset)}px`;
				});
				selCat.addEventListener("mouseup", function() {dropCategory()});
			}
			if(settings.math == "ADVANCED") {
				container.appendChild(selCat);
				container.appendChild(generateNode('img', {'src': '../heroicons/minus-circle.svg', 'class': 'clickable icon hugging-left', 'data-selcat': i}, {'click': removeCatCalc}));
				pMath.appendChild(container);
			} else {
				pMath.appendChild(selCat);
			}
		}
	}
	document.querySelectorAll('.math-swap').forEach(function(node) {node.addEventListener("click", switchCategories);});
	catCalc();
}

// create visual operator selection
function generateOperators(operatorID, value, pos) {
	let operator = generateNode('div', {'class': 'text-center'});
	operator.appendChild(generateNode('img', {
		'src': '../heroicons/arrows-right-left.svg',
		'data-pos': pos,
		'class': 'clickable math-swap',
		'title': browser.i18n.getMessage("titleSwitch")
	}));
	var operatorSelect = generateNode('select', {
		'id': `operator_${operatorID}`,
		'name': 'math_operator',
		'class': 'clickable'}, {'change': updateOperator});
	Object.keys(operatorList).forEach(function(o) {
		let params = {'title': operatorList[o].title};
		if(o == value)
			params['selected'] = true;
		operatorSelect.appendChild(generateNode('option', params, {}, operatorList[o][settings.notation]));
	});
	operator.appendChild(operatorSelect);
	return operator;
}

// update operator on change and recalculate
function updateOperator() {
	selectedCategories[this.id.replace('operator_', '')]['value'] = this.options[this.selectedIndex].text;
	catCalc();
}

// switch two categories around an operator and recalculate
function switchCategories() {
	var caller = parseInt(this.dataset.pos);
	let tmp = selectedCategories[caller - 1];
	selectedCategories[caller - 1] = selectedCategories[caller + 1];
	selectedCategories[caller + 1] = tmp;
	renderMath();
}

// reorder categories per drag and drop
function dropCategory() {
	var moved = document.querySelectorAll('[data-offset]')[0];
	var movePos = moved.offsetLeft;//moved.dataset.offset;
	if(settings.math == "ADVANCED")
		movePos = moved.parentNode.offsetLeft;
	var moveOld = parseInt(moved.id.substring(7));
	var catList = document.getElementsByName('selcat');
	var curOffset = 0;
	for(let i = 0; i < catList.length; i++) {
		if(settings.math == "SIMPLE")
			curOffset = catList[i].offsetLeft;
		else if(settings.math == "ADVANCED")
			curOffset = catList[i].parentNode.offsetLeft;
		if(curOffset > movePos) {
			let insertBefore = parseInt(catList[i].id.substring(7));
			if(insertBefore == moveOld) {
				break;
			}
			if(moveOld <= insertBefore) {
				let tmp = selectedCategories[moveOld];
				for(let sc = moveOld; sc <= (insertBefore - 2); sc += 2) {
					selectedCategories[sc] = selectedCategories[sc + 2];
				}
				selectedCategories[insertBefore] = tmp;
			} else {
				let tmp = selectedCategories[moveOld];
				for(let sc = moveOld; sc >= (insertBefore + 2); sc -= 2) {
					selectedCategories[sc] = selectedCategories[sc - 2];
				}
				selectedCategories[insertBefore] = tmp;
			}
			break;
		}
	}
	renderMath();
}

// calculate category entries from user selection
function catCalc() {
	if(Object.keys(selectedCategories).length == 0) { // when no categories selected, nothing to do
		clearChildren(document.getElementById("p_result"));
		return;
	}
	var wikiData = JSON.parse(storedData[toShow]);
	var resultList = getItemsFromCategory(wikiData, selectedCategories[0]['value']);
	var operator = null;
	for(let i = 1; i < Object.keys(selectedCategories).length; i++) { // perform user selected calculations on the user selected categories
		if(selectedCategories[i]['type'] == 'o') {
			operator = selectedCategories[i]['value'];
		} else {
			switch(operator) {
				case 'AND':
					resultList = calcAND(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']));
					break;
				case 'NAND':
					resultList = calcAND(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']), true);
					break;
				case 'OR':
					resultList = calcOR(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']));
					break;
				case 'NOR':
					resultList = calcOR(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']), true);
					break;
				case 'XOR':
					resultList = calcOR(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']), false, true);
					break;
				case 'XNOR':
					resultList = calcOR(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']), true, true);
					break;
				default:
					break;
			}
		}
	}
	// visual output of results
	var html = '';
	resultList.sort();
	resultList.forEach(function(r) {
		let classes = 'result-entry clickable';
		let url = getURLFromCategoryItem(wikiData, r.item);
		let langStr = '';
		if(langList.length > 1 && r.lang !== undefined && r.lang !== null)
			langStr = ` data-lang="${r.lang}"`;
		if(currentTabsURL.includes(url))
			classes += ' clicked';
		html += `<a href="${url}" target="_blank" class="${classes}"${langStr}>${r.item}</a>`;
	});
	if(Object.keys(resultList).length > 0) {
		let langDisplay = '';
		if(langList.length > 1) {
			langDisplay = `<label for="resultLang">${browser.i18n.getMessage("popupMathResultsLang")}</label><select id="resultLang"><option value="">${browser.i18n.getMessage("genAll")}</option>`;
			langList.forEach(function(ll) {langDisplay += `<option value="${ll}">${ll}</option>`;});
			langDisplay += `</select>`;
		}
		html = `<div><h4>${browser.i18n.getMessage("popupMathResults")} <i>(${Object.keys(resultList).length})</i></h4>
		<label for="resultFilter">${browser.i18n.getMessage("popupMathResultsFilter")}</label><input id="resultFilter" type="text">
		<label for="resultFilterCaseSensitive"><input id="resultFilterCaseSensitive" type="checkbox" class="clickable">${browser.i18n.getMessage("popupMathResultsCaseSensitive")}</label>
		${langDisplay}
		<input id="resultFilterReset" type="button" class="clickable" value="${browser.i18n.getMessage("popupMathResultsFilterReset")}"></div>
		<div>` + html + `</div>`;
		document.getElementById("p_result").innerHTML = html;
		document.querySelectorAll(".result-entry").forEach(function(node) {node.addEventListener("pointerup", openTab);});
		document.getElementById("resultFilter").addEventListener("keyup", filterResults);
		document.getElementById("resultFilterCaseSensitive").addEventListener("click", filterResultsCaseSensitive);
		document.getElementById("resultFilterReset").addEventListener("click", filterResultsReset);
		if(langList.length > 1)
			document.getElementById("resultLang").addEventListener("change", filterResultsLang);
	} else {
		clearChildren(document.getElementById("p_result"));
		document.getElementById("p_result").appendChild(generateNode('h4', {}, {}, browser.i18n.getMessage("popupMathResultsNone")));
	}
}

// retrieve all items of a category
function getItemsFromCategory(data, categoryName) {
	var result = [];
	data.forEach(function(d) {
		if(d['title'] == categoryName) {
			let lang = null;
			if(typeof d['lang'] !== undefined && d['lang'] !== null)
				lang = d['lang'];
			for(let item in d['items'])
				result.push({'item': item, 'lang': lang});
		}
	});
	return result;
}

// create URL from the category entry
function getURLFromCategoryItem(data, itemName) {
	var url;
	data.forEach(function(d) {
		if(typeof d['items'][itemName] !== 'undefined') {
			let iname = (d['items'][itemName][0] == '/' ? '' : '/') + d['items'][itemName];
			url = `${d['protocol']}//${toShow}${iname}`;
		}
	});
	return url;
}

// calculate logical AND
function calcAND(a, b, not = false) {
	var r = [];
	if(not) {
		r = calcExclusive(a, b);
	} else {
		r = r.concat(calcMAP(b, a));
	}
	return r;
}

// calculate logical OR or XOR
function calcOR(a, b, not = false, xor = false) {
	var r = [];
	if(not && !xor) // NOR
		return [];
	else if(not && xor) // XNOR
		return calcAND(a, b);
	else if(xor) { // XOR
		r = calcExclusive(a, b);
	} else { // OR
		r = calcMerge(a, b);
	}
	return r;
}

// merges a and b to a unique object set
function calcMerge(a, b) {
	let aMap = a.map(m => JSON.stringify(m));
	let legacyMapNoLang = a.map(m => ((typeof(m.lang) === undefined || m.lang == null) ? m.item : null)).filter(i => i); // LEGACY SUPPORT for 1.1 and older
	let legacyMapFull = a.map(m => m.item); // LEGACY SUPPORT for 1.1 and older
	for(let i = 0; i < b.length; i++) {
		if((typeof(b[i].lang) === undefined || b[i].lang == null) && !legacyMapFull.includes(b[i].item)) {
			a.push(b[i]);
		} else if(!aMap.includes(JSON.stringify(b[i])) && !legacyMapNoLang.includes(b[i].item)) {
			a.push(b[i]);
		}
	}
	return a;
}

// calculate whether object elements are only available in one input
function calcExclusive(a, b) {
	let r = [];
	let aMap = a.map(m => JSON.stringify(m));
	let aLegacyMapNoLang = a.map(m => ((typeof(m.lang) === undefined || m.lang == null) ? m.item : null)).filter(i => i); // LEGACY SUPPORT for 1.1 and older
	let aLegacyMapFull = a.map(m => m.item); // LEGACY SUPPORT for 1.1 and older
	let bMap = b.map(m => JSON.stringify(m));
	let bLegacyMapNoLang = b.map(m => ((typeof(m.lang) === undefined || m.lang == null) ? m.item : null)).filter(i => i); // LEGACY SUPPORT for 1.1 and older
	let bLegacyMapFull = b.map(m => m.item); // LEGACY SUPPORT for 1.1 and older
	for(let i = 0; i < b.length; i++) {
		if((typeof(b[i].lang) === undefined || b[i].lang == null) && !aLegacyMapFull.includes(b[i].item)) {
			r.push(b[i]);
		} else if(!aMap.includes(JSON.stringify(b[i])) && !aLegacyMapNoLang.includes(b[i].item)) {
			r.push(b[i]);
		}
	}
	for(let i = 0; i < a.length; i++) {
		if((typeof(a[i].lang) === undefined || a[i].lang == null) && !bLegacyMapFull.includes(a[i].item)) {
			r.push(a[i]);
		} else if(!bMap.includes(JSON.stringify(a[i])) && !bLegacyMapNoLang.includes(a[i].item)) {
			r.push(a[i]);
		}
	}
	return r;
}

// calculate if a map of the first paramter includes an element of the second one
function calcMAP(a, b) {
	let r = [];
	let aMap = a.map(m => JSON.stringify(m));
	let legacyMapNoLang = a.map(m => ((typeof(m.lang) === undefined || m.lang == null) ? m.item : null)).filter(i => i); // LEGACY SUPPORT for 1.1 and older
	let legacyMapFull = a.map(m => m.item); // LEGACY SUPPORT for 1.1 and older
	for(let i = 0; i < b.length; i++) {
		if(typeof(b[i].lang) === undefined || b[i].lang == null) { // LEGACY SUPPORT for 1.1 and older
			if(legacyMapFull.includes(b[i].item))
				r.push(b[i]);
		} else {
			if(aMap.includes(JSON.stringify(b[i])) || legacyMapNoLang.includes(b[i].item))
				r.push(b[i]);
		}
	}
	return r;
}

// open selected entry in a new tab
function openTab() {
	this.classList.add('clicked');
}

// filter resultlist by live-input
function filterResults() {
	let filter = document.getElementById('resultFilter').value;
	if(!caseSensitive)
		filter = filter.toLowerCase();
	document.querySelectorAll('.result-entry').forEach(function(elem) {
		if(caseSensitive)
			elem.innerHTML.includes(filter) || filter.length == 0 ? elem.classList.remove('hidden') : elem.classList.add('hidden');
		else
			elem.innerHTML.toLowerCase().includes(filter) || filter.length == 0 ? elem.classList.remove('hidden') : elem.classList.add('hidden');
	});
}

// set case sensitive for resultlist live-input filter
function filterResultsCaseSensitive() {
	document.getElementById('resultFilterCaseSensitive').checked ? caseSensitive = true : caseSensitive = false;
	filterResults();
}

// filter the results by language
function filterResultsLang() {
	let filter = this.value;
	document.querySelectorAll('.result-entry').forEach(function(elem) {
		(elem.dataset.lang == filter || filter == '') ? elem.classList.remove('hidden') : elem.classList.add('hidden');
	});
}

// reset filtering of resultlist
function filterResultsReset() {
	document.getElementById('resultFilter').value = '';
	document.querySelectorAll('.result-entry.hidden').forEach(function(elem) {elem.classList.remove('hidden');});
}

// set truth table display to currently targeted logic operation
function showTruthTable() {
	if(tt_operator == this.dataset.operator)
		return;
	tt_operator = this.dataset.operator;
	document.getElementById('tt_title').textContent = browser.i18n.getMessage("infoDialogTruthTable") + ': ' + this.textContent;
	let tt_data = {
		AND : [0, 0, 0, 1],
		OR : [0, 1, 1, 1],
		XOR : [0, 1, 1, 0],
		NAND : [1, 1, 1, 0],
		NOR : [1, 0, 0, 0],
		XNOR : [1, 0, 0, 1],
	}
	let cells = document.querySelectorAll('#tt_table tr td:last-child');
	for(i = 0; i < cells.length; i++) {
		if(tt_data[tt_operator][i] == 0) {
			cells[i].classList.remove('tt_yes');
			cells[i].classList.add('tt_no');
			cells[i].textContent = browser.i18n.getMessage("infoDialogTruthTableNo");
		} else {
			cells[i].classList.remove('tt_no');
			cells[i].classList.add('tt_yes');
			cells[i].textContent = browser.i18n.getMessage("infoDialogTruthTableYes");
		}
	}
}

// visual error handler
function raiseError(error) {
	let errorNode = document.getElementById("error");
	errorNode.appendChild(generateNode('div', {
		'class': 'error',
		'title': browser.i18n.getMessage("titleClose")
	}, {'click': closeError}, error));
}

// close open error message
function closeError() {
	this.remove();
}

window.onload = fetchStorage();
window.onload = loadCurrentTabs();