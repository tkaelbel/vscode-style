exports.messages = {
	admin: "Run VS Code with admin privileges so the changes can be applied.",
	enabled:
		"vscode-style enabled. Restart to take effect. " +
		"If Code complains about it is corrupted, CLICK DON'T SHOW AGAIN. " +
		"See README for more detail.",
	disabled: "vscode-style disabled and reverted to default. Restart to take effect.",
	already_disabled: "vscode-style already disabled.",
	somethingWrong: "Something went wrong: ",
	restartIde: "Restart Visual Studio Code",
	notfound: "vscode-style not found.",
	notConfigured:
		"vscode-style path not configured. " +
		'Please set "vscode-style.classes" or "vscode-style.js" in your user settings.',
	reloadAfterVersionUpgrade:
		"Detected reloading css/js after VSCode is upgraded. " + "Performing application only.",
	unableToLocateVsCodeInstallationPath:
		"Unable to locate the installation path of VSCode. This extension may not function correctly.",
	cannotLoad: url => `Cannot load '${url}'. Skipping.`
};
