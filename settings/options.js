document.getElementById("section_settings").textContent = browser.i18n.getMessage('optionsSectionSettings');
document.getElementById("l_set_notation").textContent = browser.i18n.getMessage('optionsLabelSetNotation');
document.getElementById("l_set_math").textContent = browser.i18n.getMessage('optionsLabelSetMath');
document.getElementById("button_save").value = browser.i18n.getMessage('optionsButtonSave');
document.getElementById("button_reset").value = browser.i18n.getMessage('optionsButtonReset');
document.getElementById("section_data").textContent = browser.i18n.getMessage('optionsSectionData');
document.getElementById("t_download").textContent = browser.i18n.getMessage('optionsDataDownload');
document.getElementById("data_dl_settings").value = browser.i18n.getMessage('optionsDataDownloadSettings');
document.getElementById("data_dl_wiki").value = browser.i18n.getMessage('optionsDataDownloadWiki');
document.getElementById("data_dl_all").value = browser.i18n.getMessage('optionsDataDownloadAll');
document.getElementById("section_delete").textContent = browser.i18n.getMessage('optionsSectionDelete');
document.getElementById("delete_local").value = browser.i18n.getMessage('optionsDeleteLocal');
document.getElementById("delete_sync").value = browser.i18n.getMessage('optionsDeleteSync');
document.getElementById("delete_all").value = browser.i18n.getMessage('optionsDeleteAll');
const notationOptions = {
	TEXT: browser.i18n.getMessage('optionsNotationText'),
	LOGICSYMBOL: browser.i18n.getMessage('optionsNotationLogicSymbol')
};
const mathOptions = {
	SIMPLE: browser.i18n.getMessage('optionsMathSimple'),
	ADVANCED: browser.i18n.getMessage('optionsMathAdvanced')
};
const notationOptionsDefault = "TEXT";
const mathOptionsDefault = "SIMPLE";
var syncSettings = {};
var localStorage = {};

document.getElementById('button_save').addEventListener('click', saveSettings);
document.getElementById('button_reset').addEventListener('click', resetSettings);
document.getElementById('data_dl_settings').addEventListener('click', dataDownload);
document.getElementById('data_dl_wiki').addEventListener('click', dataDownload);
document.getElementById('data_dl_all').addEventListener('click', dataDownload);
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
	syncSettings.notation = tmp;
	var select = document.getElementById('set_notation');
	for(n in notationOptions) {
		let option = document.createElement('option');
		option.value = n;
		option.textContent = notationOptions[n];
		if(tmp == n)
			option.selected = true;
		select.appendChild(option);
	}
	tmp = mathOptionsDefault;
	if(settings.math)
		tmp = settings.math;
	syncSettings.math = tmp;
	var select = document.getElementById('set_math');
	for(m in mathOptions) {
		let option = document.createElement('option');
		option.value = m;
		option.textContent = mathOptions[m];
		if(tmp == m)
			option.selected = true;
		select.appendChild(option);
	}
}


// load local storage
function loadLocal(storage) {
	localStorage = structuredClone(storage);
}

// save the currently selected settings
function saveSettings() {
	syncSettings.notation = document.getElementById('set_notation').value.toUpperCase();
	if(!(syncSettings.notation in notationOptions)) {
		syncSettings.notation = notationOptionsDefault;
	}
	syncSettings.math = document.getElementById('set_math').value.toUpperCase();
	if(!(syncSettings.math in mathOptions)) {
		syncSettings.math = mathOptionsDefault;
	}
	browser.storage.sync.set(syncSettings);
}

// restore default settings and save
function resetSettings() {
	document.getElementById('set_notation').value = notationOptionsDefault;
	document.getElementById('set_math').value = mathOptionsDefault;
	saveSettings();
}

// provide a data download
function dataDownload() {
	let dataBlob = {};
	let fname = (new Date()).toISOString();
	fname = fname.substring(0, fname.lastIndexOf('T'));
	fname = `mwc_${this.id.substring(this.id.lastIndexOf("_")+1)}_${fname}`;
	if(this.id == 'data_dl_settings' || this.id == 'data_dl_all')
		dataBlob['settings'] = syncSettings;
	if(this.id == 'data_dl_wiki' || this.id == 'data_dl_all')
		dataBlob['wiki'] = localStorage;
	dataBlob = new Blob([JSON.stringify(dataBlob)], {type: 'application/json'});
	let dl = document.createElement('a');
	dl.download = fname;
	dl.href = URL.createObjectURL(dataBlob);
	document.body.append(dl);
	dl.click();
	dl.remove();
}

/*
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
*/

// delete selected or all storages
function deleteStorage() {
	if(this.id == 'delete_local' || this.id == 'delete_all')
		browser.storage.local.clear();
	if(this.id == 'delete_sync' || this.id == 'delete_all')
		browser.storage.sync.clear();
	window.location.reload();
}