document.getElementById("p_title").innerHTML = browser.i18n.getMessage("popupTitle");
document.getElementById("p_available").innerHTML = browser.i18n.getMessage("popupLoading");
document.getElementById("p_nav_overview").innerHTML = browser.i18n.getMessage("popupNavOverview");
document.getElementById("p_nav_show").innerHTML = browser.i18n.getMessage("popupNavShow");
document.getElementById("p_nav_overview").addEventListener("click", showOverview);
var storedData;
var selectedCategories;
var toShow;
var calculatedElements;

// toggle display to overview
function showOverview() {
	document.getElementById("p_nav_overview").classList.add("nav_active");
	document.getElementById("p_nav_show").classList.remove("nav_active")
	document.getElementById("p_overview").classList.remove("hidden");
	document.getElementById("p_wiki").classList.add("hidden")
}

// toggle display to selected wiki
function showSelected() {
	document.getElementById("p_nav_overview").classList.remove("nav_active");
	document.getElementById("p_nav_show").classList.add("nav_active")
	document.getElementById("p_overview").classList.add("hidden");
	document.getElementById("p_wiki").classList.remove("hidden")
}

// main storage function, creating a promise
function fetchStorage() {
	var sm = browser.storage.local.get(null);
	sm.then(fetchStream);
}

// delete entire selected wiki from storage
function deleteWiki() {
	var toDel = this.id.substring(4);
	browser.storage.local.remove(toDel);
	location.reload();
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
		html += `<strong class="clickable">${key}</strong>`;
		value = JSON.parse(value);
		var entries = value.length;
		var sum = 0;
		for(let i = 0; i < value.length; i++) {
			sum += Object.keys(value[i]['items']).length;
		}
		html += `<div><emph id="show_${key}" name="popupShow" class="clickable" title="${browser.i18n.getMessage("titleOpen")}">🌐</emph> ${entries} ${browser.i18n.getMessage("popupCategories")}, ${sum} ${browser.i18n.getMessage("popupPages")} <emph id="del_${key}" name="popupDelete" class="clickable" title="${browser.i18n.getMessage("titleDelete")}">🗑</emph></div>`;
	}
	document.getElementById("p_overview").innerHTML = html;
	document.getElementsByName("popupShow").forEach(function(node) {node.addEventListener("click", showWiki);});
	document.getElementsByName("popupDelete").forEach(function(node) {node.addEventListener("click", deleteWiki);});
}

// display selected wiki and stored categories of said wiki
function showWiki() {
	/* each category has:
	 * title - title of the category
	 * path - path to category
	 * items - Obj. of k (string) - v (URL)
	 */
	selectedCategories = {};
	calculatedElements = [];
	toShow = this.id.substring(5);
	var wikiInfo = JSON.parse(storedData[toShow]);
	var html = '';
	wikiInfo.forEach(function(category) {
		html += `<input type="checkbox" name="selected_cat" id="sc_${category.title}" value="${category.title}" class="clickable"><label for="sc_${category.title}" class="clickable">${category.title} <i>(${Object.keys(category.items).length})</i></label>`;
	});

	var pageList = document.getElementsByClassName("page")
	for(let i = 0; i < pageList.length; i++) {
		if(pageList[i].id == toShow)
			pageList[i].classList.remove('hidden');
		else
			pageList[i].classList.add('hidden');
	}
	document.getElementById("p_available").innerHTML = html;
	document.getElementsByName("selected_cat").forEach(function(node) {node.addEventListener("click", addCatCalc);});
	document.getElementById("p_nav_show").addEventListener("click", showSelected);
	document.getElementById("p_nav_show").innerHTML = toShow;
	showSelected();
}

// create calculation overview based on selected categories
function addCatCalc() {
	var caller = this.value;
	var checked = this.checked;
	if(!checked) {
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
				delete selectedCategories[Object.keys(selectedCategories).length -1];
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
	['OR', 'AND', 'XOR'].forEach(function(o) {
		if(o == value)
			operator += `<option selected>${o}</option>`;
		else
			operator += `<option>${o}</option>`;
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
				case 'OR':
					resultList = calcOR(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']));
					break;
				case 'XOR':
					resultList = calcOR(resultList, getItemsFromCategory(wikiData, selectedCategories[i]['value']), true);
					break;
				default:
					break;
			}
		}
	}
	// visual output of results
	var html = '';
	var hasResults = false;
	resultList.forEach(function(r) {
		hasResults = true;
		html += `<p name="math_result" data-href="${getURLFromCategoryItem(wikiData, r)}" class="result-entry">${r}</p>`;
	});
	if(hasResults)
		html = `<h4>${browser.i18n.getMessage("popupMathResults")}</h4>` + html;
	else
		html = `<h4>${browser.i18n.getMessage("popupMathResultsNone")}</h4>` + html;
	document.getElementById("p_result").innerHTML = html;
	document.getElementsByName("math_result").forEach(function(node) {node.addEventListener("click", openTab);});
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
			url = `${d['protocol']}//${toShow}/${d['items'][itemName]}`;
		}
	});
	return url;
}

// calculate logical AND
function calcAND(a, b) {
	var r = [];
	for(let i = 0; i < a.length; i++) {
		b.includes(a[i]) ? r.push(a[i]) : '';
	}
	return r;
}

// calculate logical OR or XOR
function calcOR(a, b, xor = false) {
	var r = [];
	if(xor) {
		for(let i = 0; i < a.length; i++) {
			b.includes(a[i]) ? '' : r.push(a[i]);
		}
		for(let i = 0; i < b.length; i++) {
			a.includes(b[i]) ? '' : r.push(b[i]);
		}
	} else {
		r = b;
		for(let i = 0; i < a.length; i++) {
			b.includes(a[i]) ? '' : r.push(a[i]);
		}
	}
	return r;
}

// open selected entry in a new tab
function openTab() {
	browser.tabs.create({'active': false, 'url': this.getAttribute('data-href')});
	this.classList.add('clicked');
}

window.onload = fetchStorage();