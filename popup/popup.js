document.title = browser.i18n.getMessage("extensionName");
document.getElementById("p_title").innerHTML = browser.i18n.getMessage("popupTitle");
document.getElementById("p_available").innerHTML = browser.i18n.getMessage("popupLoading");
document.getElementById("p_nav_overview").innerHTML = browser.i18n.getMessage("popupNavOverview");
document.getElementById("p_nav_show").innerHTML = browser.i18n.getMessage("popupNavShow");
document.getElementById("p_refresh").addEventListener("click", refreshData);
document.getElementById("p_nav_overview").addEventListener("click", showOverview);
document.getElementById("error").addEventListener("click", closeError);
var storedData;
var selectedCategories;
var toShow = null;
var operatorList = {
	'AND': {'title': browser.i18n.getMessage("titleAND")},
	'OR': {'title': browser.i18n.getMessage("titleOR")},
	'XOR': {'title': browser.i18n.getMessage("titleXOR")}
	/* 'NOR', 'NAND', 'XNOR'*/
};

// refresh data and rebuild UI
function refreshData() {
	fetchStorage();
	if(toShow !== null) {
		showWiki();
	}
}

// toggle display to overview
function showOverview() {
	document.getElementById("p_nav_overview").classList.add("active");
	document.getElementById("p_nav_show").classList.remove("active")
	document.getElementById("p_overview").classList.remove("hidden");
	document.getElementById("p_wiki").classList.add("hidden");
}

// toggle display to selected wiki
function showSelected() {
	document.getElementById("p_nav_overview").classList.remove("active");
	document.getElementById("p_nav_show").classList.add("active")
	document.getElementById("p_overview").classList.add("hidden");
	document.getElementById("p_wiki").classList.remove("hidden");
}

// main storage function, creating a promise
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

// retrieve data from storage and create overview of all available wikis
function fetchStream(dataStream) {
	storedData = dataStream;
	if(typeof(storedData) === 'undefined' || Object.keys(storedData).length == 0) {
		document.getElementById("p_overview").innerHTML = `<div>${browser.i18n.getMessage("popupNavOverviewEmpty")}</div>`;
		document.getElementById("p_nav_show").classList.add('hidden');
		return;
	}
	document.getElementById("p_overview").innerHTML = '';
	var html = '';
	for(let [key, value] of Object.entries(storedData)) {
		html += `<strong name="popupShow" title="${browser.i18n.getMessage("titleOpen")}" class="section_title clickable" data-wiki="${key}">
		<img name="popupShow" src="../heroicons/globe-alt.svg" class="icon" data-wiki="${key}" title="${browser.i18n.getMessage("titleOpen")}">
		${key}
		</strong>`;
		value = JSON.parse(value);
		var entries = value.length;
		var sum = 0;
		var hasError = false;
		var entryContent = `<ul id="expand_list_${key}" class="category-list hidden">`;
		for(let i = 0; i < entries; i++) {
			if(typeof value[i] !== 'object' || Object.keys(value[i]).length != 4) {
				hasError = true;
				raiseError(`${key}: ${browser.i18n.getMessage("errorPopupCorruptedCategory")}`);
				break;
			}
			entryContent += `<li>
			<div class="flex-10">${value[i]['title']}</div>
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
		if(!hasError)
			html += entryContent;
	}
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
}

// display selected wiki and stored categories of said wiki
function showWiki() {
	/* each category has:
	 * title - title of the category
	 * path - path to category
	 * items - Obj. of k (string) - v (URL)
	 */
	selectedCategories = {};
	if('dataset' in this && toShow == this.dataset.wiki) {
		showSelected();
		return;
	}
	if(toShow !== null) {
		document.getElementById("p_math").innerHTML = '';
		document.getElementById("p_result").innerHTML = '';
	}
	if('dataset' in this)
		toShow = this.dataset.wiki;
	var html = '';
	JSON.parse(storedData[toShow]).forEach(function(category) {
		html += `<label for="sc_${category.title}" class="clickable">
		<input type="checkbox" name="selected_cat" id="sc_${category.title}" value="${category.title}" class="clickable">
		${category.title}
		<i>(${Object.keys(category.items).length})</i>
		</label>`;
	});

	if(!document.getElementById("p_nav_show").classList.contains("clickable")) {
		document.getElementById("p_nav_show").addEventListener("click", showSelected);
		document.getElementById("p_nav_show").classList.add("clickable");
	}
	document.getElementById("p_nav_show").textContent = toShow;
	document.getElementById("p_available").innerHTML = html;
	document.getElementsByName("selected_cat").forEach(function(node) {node.addEventListener("click", addCatCalc);});
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
	if(!this.checked) {
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
	} else {
		if(Object.keys(selectedCategories).length > 0)
			selectedCategories[Object.keys(selectedCategories).length] = {'type' : 'o', 'value': 'AND'};
		selectedCategories[Object.keys(selectedCategories).length] = {'type' : 'c', 'value': caller};
	}
	//if(selectedCategories.indexOf(caller) != -1)
	//	return;
	var html = '';
	for(let i = 0; i < Object.keys(selectedCategories).length; i++) {
		if(selectedCategories[i]['type'] == 'o')
			html += generateOperators(i, selectedCategories[i]['value']);
		else
			html += `<i>${selectedCategories[i]['value']}</i>`;
	}
	document.getElementById("p_math").innerHTML = html;
	document.getElementsByName("math_operator").forEach(function(node) {node.addEventListener("change", updateOperator);});
	catCalc();
}

// create visual operator selection
function generateOperators(operatorID, value) {
	var operator = '';
	operator += `<select id="operator_${operatorID}" name="math_operator" class="clickable">`;
	Object.keys(operatorList).forEach(function(o) {
		operator += `<option title="${operatorList[o].title}"${o == value ? ' selected' : ''}>${o}</option>`;
	});
	operator += `</select>`;
	return operator;
}

// update operator on change and recalculate
function updateOperator() {
	var caller = this.id;
	selectedCategories[caller.replace('operator_', '')]['value'] = this.options[this.selectedIndex].text;
	catCalc();
}

// calculate category entries from user selection
function catCalc() {
	if(Object.keys(selectedCategories).length == 0) { // when no categories selected, nothing to do
		document.getElementById("p_result").innerHTML = '';
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
				/*case 'NAND':
					resultList = calcAND(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']), true);
					break;*/
				case 'OR':
					resultList = calcOR(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']));
					break;
				/*case 'NOR':
					resultList = calcOR(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']), true);
					break;*/
				case 'XOR':
					resultList = calcOR(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']), false, true);
					break;
				/*case 'XNOR':
					resultList = calcOR(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']), true, true);
					break;*/
				default:
					break;
			}
		}
	}
	// visual output of results
	var html = '';
	resultList.sort();
	resultList.forEach(function(r) {
		html += `<a href="${getURLFromCategoryItem(wikiData, r)}" target="_blank" class="result-entry clickable">${r}</a>`;
	});
	if(Object.keys(resultList).length > 0) {
		html = `<div><h4>${browser.i18n.getMessage("popupMathResults")} <i>(${Object.keys(resultList).length})</i></h4>
		<label for="resultFilter">${browser.i18n.getMessage("popupMathResultsFilter")}</label><input id="resultFilter" type="text">
		<input id="resultFilterReset" type="button" class="clickable" value="${browser.i18n.getMessage("popupMathResultsFilterReset")}"></div>
		<div>` + html + `</div>`;
	} else {
		html = `<h4>${browser.i18n.getMessage("popupMathResultsNone")}</h4>` + html;
	}
	document.getElementById("p_result").innerHTML = html;
	document.querySelectorAll(".result-entry").forEach(function(node) {node.addEventListener("pointerup", openTab);});
	document.getElementById("resultFilter").addEventListener("keyup", filterResults);
	document.getElementById("resultFilterReset").addEventListener("click", filterResultsReset);
}

// retrieve all items of a category
function getItemsFromCategory(data, categoryName) {
	var result = [];
	data.forEach(function(d) {
		if(d['title'] == categoryName) {
			result = Object.keys(d['items']);
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
		r = a.concat(b);
		r = r.filter((elem, index, self) => self.indexOf(elem) === index);
	} else {
		for(let i = 0; i < a.length; i++) {
			b.includes(a[i]) ? r.push(a[i]) : '';
		}
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
		for(let i = 0; i < a.length; i++) {
			b.includes(a[i]) ? '' : r.push(a[i]);
		}
		for(let i = 0; i < b.length; i++) {
			a.includes(b[i]) ? '' : r.push(b[i]);
		}
	} else { // OR
		r = b;
		for(let i = 0; i < a.length; i++) {
			b.includes(a[i]) ? '' : r.push(a[i]);
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
	let filter = this.value;
	document.querySelectorAll('.result-entry').forEach(function(elem) {elem.innerHTML.includes(filter) || filter.length == 0 ? elem.classList.remove('hidden') : elem.classList.add('hidden');});
}

// reset filtering of resultlist
function filterResultsReset() {
	document.getElementById('resultFilter').value = '';
	document.querySelectorAll('.result-entry.hidden').forEach(function(elem) {elem.classList.remove('hidden');});
}

// visual error handler
function raiseError(error) {
	let errorNode = document.getElementById("error");
	if(errorNode.innerHTML == '')
		errorNode.innerHTML = error;
	else
		errorNode.innerHTML += '<br>' + error;
	errorNode.classList.add('error');
	errorNode.title = browser.i18n.getMessage("titleClose");
}

// close open error message
function closeError() {
	let errorNode = document.getElementById("error");
	errorNode.innerHTML = '';
	errorNode.classList.remove('error');
}

window.onload = fetchStorage();