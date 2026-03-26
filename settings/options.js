document.getElementById("section_settings").textContent = browser.i18n.getMessage('optionsSectionSettings');
document.getElementById("l_set_notation").textContent = browser.i18n.getMessage('optionsLabelSetNotation');
document.getElementById("button_save").value = browser.i18n.getMessage('optionsButtonSave');
document.getElementById("button_reset").value = browser.i18n.getMessage('optionsButtonReset');
document.getElementById("section_updown").textContent = browser.i18n.getMessage('optionsSectionUpDown');
document.getElementById("l_select_sync_up").textContent = browser.i18n.getMessage('optionsLabelSelectSyncUp');
document.getElementById("sync_up_selected").value = browser.i18n.getMessage('optionsSyncUpSelected');
document.getElementById("sync_up_selected").title = browser.i18n.getMessage('optionsSyncUpTitle');
document.getElementById("sync_up_all").value = browser.i18n.getMessage('optionsSyncUpAll');
document.getElementById("sync_up_all").title = browser.i18n.getMessage('optionsSyncUpTitle');
document.getElementById("l_select_sync_down").textContent = browser.i18n.getMessage('optionsLabelSelectSyncDown');
document.getElementById("sync_down_selected").value = browser.i18n.getMessage('optionsSyncDownSelected');
document.getElementById("sync_down_selected").title = browser.i18n.getMessage('optionsSyncDownTitle');
document.getElementById("sync_down_all").value = browser.i18n.getMessage('optionsSyncDownAll');
document.getElementById("sync_down_all").title = browser.i18n.getMessage('optionsSyncDownTitle');
document.getElementById("section_delete").textContent = browser.i18n.getMessage('optionsSectionDelete');
document.getElementById("delete_local").value = browser.i18n.getMessage('optionsDeleteLocal');
document.getElementById("delete_sync").value = browser.i18n.getMessage('optionsDeleteSync');
document.getElementById("delete_all").value = browser.i18n.getMessage('optionsDeleteAll');
const notationOptions = {
	TEXT: browser.i18n.getMessage('optionsNotationText'),
	LOGICSYMBOL: browser.i18n.getMessage('optionsNotationLogicSymbol')
};
const notationOptionsDefault = "TEXT";
var localStorage = {};

document.getElementById('button_save').addEventListener('click', saveSettings);
document.getElementById('button_reset').addEventListener('click', resetSettings);
document.getElementById('sync_up_selected').addEventListener('click', syncUp);
document.getElementById('sync_up_all').addEventListener('click', syncUp);
document.getElementById('sync_down_selected').addEventListener('click', syncDown);
document.getElementById('sync_down_all').addEventListener('click', syncDown);
document.getElementById('delete_local').addEventListener('click', deleteStorage);
document.getElementById('delete_sync').addEventListener('click', deleteStorage);
document.getElementById('delete_all').addEventListener('click', deleteStorage);
var getSettings = browser.storage.sync.get();
getSettings.then(loadSettings);
var getLocalStorage = browser.storage.local.get(null);
getLocalStorage.then(loadLocal);

// load sync storage settings
function loadSettings(settings) {
	let tmp = notationOptionsDefault;
	if(settings.notation)
		tmp = settings.notation;
	var select = document.getElementById('set_notation');
	for(n in notationOptions) {
		let option = document.createElement('option');
		option.value = n;
		option.textContent = notationOptions[n];
		if(tmp == n)
			option.selected = true;
		select.appendChild(option);
	}
}

// load local storage
function loadLocal(storage) {
	localStorage = JSON.parse(JSON.stringify(storage));
	var select = document.getElementById('select_sync_up');
	for(let [wiki, categories] of Object.entries(storage)) {
		let option = document.createElement('option');
		option.value = wiki;
		option.textContent = `${wiki} (${JSON.parse(categories).length} ${browser.i18n.getMessage("optionsSubstrCategories")})`;
		select.appendChild(option);
		localStorage[wiki] = categories;
	}
}

// save the currently selected settings
function saveSettings() {
	let settings = {};
	settings.notation = document.getElementById('set_notation').value.toUpperCase();
	if(!(settings.notation in notationOptions)) {
		settings.notation = notationOptionsDefault;
	}
	browser.storage.sync.set(settings);
}

// restore default settings and save
function resetSettings() {
	document.getElementById('set_notation').value = notationOptionsDefault;
	saveSettings();
}

// upload local storage wikis into sync storage
function syncUp() {
	let local = {};
	let saveAll = (this.id == 'sync_up_all' ? true : false);
	let selectedWikis = [];
	let optionList = document.getElementById('select_sync_up').options;
	for(let i = 0; i < optionList.length; i++) {
		if(optionList[i].selected)
			selectedWikis.push(optionList[i].value);
	}
	for(let [wiki, categories] of Object.entries(localStorage)) {
		if(saveAll || selectedWikis.includes(wiki))
			local[wiki] = categories;
	}
	browser.storage.sync.set({'localStorage': local});
	// TODO: if the value is larger than about:config dom.storage.default_quota this fails
}

// download sync storage wikis into local storage
function syncDown() {
	// TODO
}

// delete selected or all storages
function deleteStorage() {
	if(this.id == 'delete_local' || this.id == 'delete_all')
		browser.storage.local.clear();
	if(this.id == 'delete_sync' || this.id == 'delete_all')
		browser.storage.sync.clear();
	window.location.reload();
}