document.getElementById("l_set_notation").textContent = browser.i18n.getMessage('optionsLabelSetNotation');
document.getElementById("button_save").value = browser.i18n.getMessage('optionsButtonSave');
document.getElementById("button_reset").value = browser.i18n.getMessage('optionsButtonReset');
const notationOptions = {
	TEXT: browser.i18n.getMessage('optionsNotationText'),
	LOGICSYMBOL: browser.i18n.getMessage('optionsNotationLogicSymbol')
};
const notationOptionsDefault = "TEXT";
document.getElementById('button_save').addEventListener('click', saveSettings);
document.getElementById('button_reset').addEventListener('click', resetSettings);
var getSettings = browser.storage.sync.get();
getSettings.then(loadSettings);

function loadSettings(settings) {
	let tmp = notationOptionsDefault;
	if(settings.notation)
		tmp = settings.notation;
	var select = document.getElementById('set_notation');
	for(n in notationOptions) {
		var option = document.createElement('option');
		option.value = n;
		option.textContent = notationOptions[n];
		if(tmp == n)
			option.selected = true;
		select.appendChild(option);
	}
}

function saveSettings() {
	let settings = {};
	settings.notation = document.getElementById('set_notation').value.toUpperCase();
	if(!(settings.notation in notationOptions)) {
		settings.notation = notationOptionsDefault;
	}
	browser.storage.sync.set(settings);
}

function resetSettings() {
	document.getElementById('set_notation').value = notationOptionsDefault;
	saveSettings();
}