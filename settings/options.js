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
document.getElementById("l_data_ul").textContent = browser.i18n.getMessage('optionsLabelDataUpload');
document.getElementById("data_ul_submit").value = browser.i18n.getMessage('optionsDataUploadNow');
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
var currentCallerValue = '';

document.getElementById('button_save').addEventListener('click', saveSettings);
document.getElementById('button_reset').addEventListener('click', resetSettings);
document.getElementById('data_dl_settings').addEventListener('click', dataDownload);
document.getElementById('data_dl_wiki').addEventListener('click', dataDownload);
document.getElementById('data_dl_all').addEventListener('click', dataDownload);
document.getElementById('data_ul_submit').addEventListener('click', dataUpload);
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
	if(typeof this.value !== 'undefined')
		currentCallerValue = this.value;
	syncSettings.notation = document.getElementById('set_notation').value.toUpperCase();
	if(!(syncSettings.notation in notationOptions)) {
		syncSettings.notation = notationOptionsDefault;
	}
	syncSettings.math = document.getElementById('set_math').value.toUpperCase();
	if(!(syncSettings.math in mathOptions)) {
		syncSettings.math = mathOptionsDefault;
	}
	browser.storage.sync.set(syncSettings)
	.then(
		(s) => {showMessage(`${browser.i18n.getMessage('genOperationSuccessful')}: ${currentCallerValue}`, 'SUCCESS');},
		(e) => {showMessage(`${browser.i18n.getMessage('genOperationFailed')}: ${currentCallerValue} - ${e.message}`, 'ERROR');}
	);
}

// restore default settings and save
function resetSettings() {
	document.getElementById('set_notation').value = notationOptionsDefault;
	document.getElementById('set_math').value = mathOptionsDefault;
	currentCallerValue = this.value;
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

// use the given file to overwrite existing data
function dataUpload() {
	let ul = document.getElementById('data_ul');
	if(ul.files.length == 0) {
		showMessage(browser.i18n.getMessage('errorNoFile'), 'ERROR');
		return;
	} else if(ul.files.length > 1) { // as of now, this should never happen
		showMessage(browser.i18n.getMessage('errorTooManyFiles', 1), 'ERROR');
		ul.value = null;
		return;
	}
	ul = ul.files[0];
	if(ul.size == 0) {
		showMessage(browser.i18n.getMessage('errorFileEmpty', ul.name), 'ERROR');
		document.getElementById('data_ul').value = null;
		return;
	}
	let reader = new FileReader();
	reader.readAsText(ul, 'UTF-8');
	reader.onload = function(stream) {
		try {
			let dataBlob = JSON.parse(stream.target.result);
			if(dataBlob.settings !== undefined) {
				if(dataBlob.settings.notation !== undefined)
					document.getElementById('set_notation').value = dataBlob.settings.notation;
				if(dataBlob.settings.math !== undefined)
					document.getElementById('set_math').value = dataBlob.settings.math;
				saveSettings();
			}
			if(dataBlob.wiki !== undefined) { // TODO error handling and potential race conditions
				browser.storage.local.clear();
				browser.storage.local.set(dataBlob.wiki);
			}
		} catch (e) {
			if(e.name == 'SyntaxError' && e.message.indexOf('JSON.parse') == 0) {
				showMessage(browser.i18n.getMessage('errorNoJSONFile', ul.name), 'ERROR');
			}
			document.getElementById('data_ul').value = null;
		}
	};
	reader.onerror = function() {
		showMessage(browser.i18n.getMessage('errorCantOpenFile', ul.name), 'ERROR');
		document.getElementById('data_ul').value = null;
	};
}

// delete selected or all storages
function deleteStorage() {
	currentCallerValue = this.value;
	if(this.id == 'delete_local' || this.id == 'delete_all') {
		browser.storage.local.clear()
		.then(
			(s) => {showMessage(`${browser.i18n.getMessage('genOperationSuccessful')}: ${currentCallerValue}`, 'SUCCESS');},
			(e) => {showMessage(`${browser.i18n.getMessage('genOperationFailed')}: ${currentCallerValue} - ${e.message}`, 'ERROR');}
		);
	}
	if(this.id == 'delete_sync' || this.id == 'delete_all') {
		browser.storage.sync.clear()
		.then(
			(s) => {showMessage(`${browser.i18n.getMessage('genOperationSuccessful')}: ${currentCallerValue}`, 'SUCCESS');},
			(e) => {showMessage(`${browser.i18n.getMessage('genOperationFailed')}: ${currentCallerValue} - ${e.message}`, 'ERROR');}
		);
	}
	showMessage(browser.i18n.getMessage('optionsReload', 5));
	setTimeout(function() {window.location.reload();}, 5000);
}

// visual message handler for errors, infos and successes
function showMessage(msg, type = null) {
	let msgNode = document.getElementById("message");
	let newMsg = document.createElement('div');
	newMsg.classList.add('message');
	if(type == 'ERROR')
		newMsg.classList.add('error');
	else if(type == 'SUCCESS')
		newMsg.classList.add('success');
	newMsg.textContent = msg;
	newMsg.title = browser.i18n.getMessage("titleClose");
	newMsg.addEventListener("click", closeMsg);
	msgNode.appendChild(newMsg);
}

// close open message
function closeMsg() {
	this.remove();
}