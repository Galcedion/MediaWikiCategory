document.getElementById("p_title").innerHTML = browser.i18n.getMessage("popupTitle");
document.getElementById("p_available").innerHTML = browser.i18n.getMessage("popupLoading");
document.getElementById("p_nav_overview").innerHTML = browser.i18n.getMessage("popupNavOverview");
document.getElementById("p_nav_show").innerHTML = browser.i18n.getMessage("popupNavShow");
document.getElementById("p_nav_overview").addEventListener("click", showOverview);
var storedData;
var selectedCategories;
var toShow;
var calculatedElements;

function showOverview() {
	document.getElementById("p_nav_overview").classList.add("nav_active");
	document.getElementById("p_nav_show").classList.remove("nav_active")
	document.getElementById("p_overview").classList.remove("hidden");
	document.getElementById("p_wiki").classList.add("hidden")
}
function showSelected() {
	document.getElementById("p_nav_overview").classList.remove("nav_active");
	document.getElementById("p_nav_show").classList.add("nav_active")
	document.getElementById("p_overview").classList.add("hidden");
	document.getElementById("p_wiki").classList.remove("hidden")
}

function showTitle() {
	var title = document.getElementById('p_title');
	//title.innerHTML = `<div>${categeoriesOnPage.length}</div>`;
	//title.innerHTML = `<div>${window.location.pathname}</div>`;
}

function fetchStorage() {
	var sm = browser.storage.local.get(null);
	sm.then(fetchStream);
}

function deleteWiki() {
	var toDel = this.id.substring(4);
	browser.storage.local.remove(toDel);
	location.reload();
}

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
		html += `<div><emph id="show_${key}" name="popupShow" class="clickable">🌐</emph> ${entries} ${browser.i18n.getMessage("popupCategories")}, ${sum} ${browser.i18n.getMessage("popupPages")} <emph id="del_${key}" name="popupDelete" class="clickable">🗑</emph></div>`;
	}
	/*Object.keys(storedData).forEach(function(key) {
		html += `<strong>${typeof storedData}</strong>`;
		//html += `<div>${storedData[key].items.length} 🗑</div>`;
		//document.getElementById("p_available").innerHTML += `<div>${key}</div>`;
		//document.getElementById("p_math").innerHTML += `<div id="${key}" class="hidden page">${storedData[key].length} ${browser.i18n.getMessage("elements")}</div>`;
	});*/
	document.getElementById("p_overview").innerHTML = html;
	/*document.getElementById("p_math").firstChild.classList.remove("hidden");
	document.getElementById("p_available").childNodes.forEach(function(cn) {
		cn.addEventListener('click', function() {showPages(cn.innerHTML)});
	});*/
	document.getElementsByName("popupShow").forEach(function(node) {node.addEventListener("click", showWiki);});
	document.getElementsByName("popupDelete").forEach(function(node) {node.addEventListener("click", deleteWiki);});
}

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
	var html = '<div>';
	wikiInfo.forEach(function(category) {
		html += `<input type="checkbox" name="selected_cat" id="sc_${category.title}" value="${category.title}"><label for="sc_${category.title}">${category.title} <i>(${Object.keys(category.items).length})</i></label>`;
		//for(let i = 0; i < wikiInfo.length; i++) {
		//	html = JSON.stringify(wikiInfo);
		//}
	});
	//html += '</div><div id="cat_calculation"></div><div id="cat_cal_result"></div>';
	html += '</div>';
	//html = storedData[toShow];//.length;//[0]['title'];

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

function generateOperators(operatorID, value) {
	var operator = '';
	operator += `<select id="operator_${operatorID}" name="math_operator">`;
	['OR', 'AND', 'XOR'].forEach(function(o) {
		if(o == value)
			operator += `<option selected>${o}</option>`;
		else
			operator += `<option>${o}</option>`;
	});
	operator += `</select>`;
	return operator;
}

function updateOperator() {
	var caller = this.id;
	selectedCategories[caller.replace('operator_', '')]['value'] = this.options[this.selectedIndex].text;
	catCalc();
}

function catCalc() {
	if(Object.keys(selectedCategories).length == 0) {
		document.getElementById("p_result").innerHTML = '';
		return;
	}
	var wikiData = JSON.parse(storedData[toShow]);
	var resultList = getItemsFromCategory(wikiData, selectedCategories[0]['value']);
	var operator = null;
	for(let i = 1; i < Object.keys(selectedCategories).length; i++) {
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
	var html = '';
	resultList.forEach(function(r) {
		//html += `<div><a href="https://${toShow}/${getURLFromCategoryItem(wikiData, r)}">${r}</a></div>`;
		html += `<div><p name="math_result" data-href="${getURLFromCategoryItem(wikiData, r)}">${r}</a></div>`;
	});
	document.getElementById("p_result").innerHTML = html;
	document.getElementsByName("math_result").forEach(function(node) {node.addEventListener("click", openTab);});
}

function getItemsFromCategory(data, categoryName) {
	var result;
	data.forEach(function(d) {
		if(d['title'] == categoryName) {
			result = Object.keys(d['items']);
		}
	});
	return result;
}

function getURLFromCategoryItem(data, itemName) {
	var url;
	data.forEach(function(d) {
		if(typeof d['items'][itemName] !== 'undefined') {
			url = `${d['protocol']}//${toShow}/${d['items'][itemName]}`;
		}
	});
	return url;
}

function calcAND(a, b) {
	var r = [];
	for(let i = 0; i < a.length; i++) {
		b.includes(a[i]) ? r.push(a[i]) : '';
	}
	return r;
}

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

function openTab() {
	browser.tabs.create({'active': false, 'url': this.getAttribute('data-href')});
}

window.onload = showTitle();
window.onload = fetchStorage();
