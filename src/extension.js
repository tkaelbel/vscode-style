const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const msg = require("./messages").messages;
const uuid = require("uuid");

function activate(context) {
	const appDir = require.main
		? path.dirname(require.main.filename)
		: globalThis._VSCODE_FILE_ROOT;
	if (!appDir) {
		vscode.window.showInformationMessage(msg.unableToLocateVsCodeInstallationPath);
	}

	const base = path.join(appDir, "vs", "code");
	let htmlFile = path.join(base, "electron-browser", "workbench", "workbench.html");
	if (!fs.existsSync(htmlFile)) {
		htmlFile = path.join(base, "electron-browser", "workbench", "workbench.esm.html");
	}
	if (!fs.existsSync(htmlFile)) {
		vscode.window.showInformationMessage(msg.unableToLocateVsCodeInstallationPath);
	}
	const BackupFilePath = uuid =>
		path.join(base, "electron-browser", "workbench", `workbench.${uuid}.bak-custom-css`);

	// ####  main commands ######################################################

	async function cmdInstall() {
		const uuidSession = uuid.v4();
		await createBackup(uuidSession);
		await performPatch(uuidSession);
	}

	async function cmdReinstall() {
		await uninstallImpl();
		await cmdInstall();
	}

	async function cmdUninstall() {
		await uninstallImpl();
		disabledRestart();
	}

	async function uninstallImpl() {
		const backupUuid = await getBackupUuid(htmlFile);
		if (!backupUuid) return;
		const backupPath = BackupFilePath(backupUuid);
		await restoreBackup(backupPath);
		await deleteBackupFiles();
	}

	async function getBackupUuid(htmlFilePath) {
		try {
			const htmlContent = await fs.promises.readFile(htmlFilePath, "utf-8");
			const m = htmlContent.match(
				/<!-- !! vscode-style-SESSION-ID ([0-9a-fA-F-]+) !! -->/
			);
			if (!m) return null;
			else return m[1];
		} catch (e) {
			vscode.window.showInformationMessage(msg.somethingWrong + e);
			throw e;
		}
	}

	async function createBackup(uuidSession) {
		try {
			let html = await fs.promises.readFile(htmlFile, "utf-8");
			html = clearExistingPatches(html);
			await fs.promises.writeFile(BackupFilePath(uuidSession), html, "utf-8");
		} catch (e) {
			vscode.window.showInformationMessage(msg.admin);
			throw e;
		}
	}

	async function restoreBackup(backupFilePath) {
		try {
			if (fs.existsSync(backupFilePath)) {
				await fs.promises.unlink(htmlFile);
				await fs.promises.copyFile(backupFilePath, htmlFile);
			}
		} catch (e) {
			vscode.window.showInformationMessage(msg.admin);
			throw e;
		}
	}

	async function deleteBackupFiles() {
		const htmlDir = path.dirname(htmlFile);
		const htmlDirItems = await fs.promises.readdir(htmlDir);
		for (const item of htmlDirItems) {
			if (item.endsWith(".bak-vscode-style")) {
				await fs.promises.unlink(path.join(htmlDir, item));
			}
		}
	}

	async function performPatch(uuidSession) {
		const config = vscode.workspace.getConfiguration("vscode-style");
		if (!patchIsProperlyConfigured(config)) {
			return vscode.window.showInformationMessage(msg.notConfigured);
		}

		let html = await fs.promises.readFile(htmlFile, "utf-8");
		html = clearExistingPatches(html);

		const injectHTML = resolveCss(config);
		html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, "");

		const jsHTML = resolveJs(config);

		html = html.replace(
			/(<\/html>)/,
			`<!-- !! vscode-style-SESSION-ID ${uuidSession} !! -->\n` +
				"<!-- !! vscode-style-START !! -->\n" +
				jsHTML +
				injectHTML +
				"<!-- !! vscode-style-END !! -->\n</html>"
		);
		try {
			await fs.promises.writeFile(htmlFile, html, "utf-8");
		} catch (e) {
			vscode.window.showInformationMessage(msg.admin);
			disabledRestart();
		}
		enabledRestart();
	}
	function clearExistingPatches(html) {
		html = html.replace(
			/<!-- !! vscode-style-START !! -->[\s\S]*?<!-- !! vscode-style-END !! -->\n*/,
			""
		);
		html = html.replace(/<!-- !! vscode-style-SESSION-ID [\w-]+ !! -->\n*/g, "");
		return html;
	}

	function patchIsProperlyConfigured(config) {
		return config && 
			(config.classes && config.classes instanceof Object) &&
			(config.js && config.js instanceof Array);
	}

	function resolveCss(config) {
		let res = "<style>";

		for (const [key, value] of Object.entries(config.classes)) {
			res += key + "{ " + value + " }"
		}

		return res += "</style>";
	}

	function resolveJs(config) {
		let res = "<script>";

		for (const value of config.js) {
			res += value
		}

		return res += "</script>";
	}


	function reloadWindow() {
		// reload vscode-window
		vscode.commands.executeCommand("workbench.action.reloadWindow");
	}
	function enabledRestart() {
		vscode.window
			.showInformationMessage(msg.enabled, { title: msg.restartIde })
			.then(reloadWindow);
	}
	function disabledRestart() {
		vscode.window
			.showInformationMessage(msg.disabled, { title: msg.restartIde })
			.then(reloadWindow);
	}

	const installVSCodeStyle = vscode.commands.registerCommand(
		"extension.installVSCodeStyle",
		cmdInstall
	);
	const uninstallVSCodeStyle = vscode.commands.registerCommand(
		"extension.uninstallVSCodeStyle",
		cmdUninstall
	);
	const updateVSCodeStyle = vscode.commands.registerCommand(
		"extension.updateVSCodeStyle",
		cmdReinstall
	);

	context.subscriptions.push(installVSCodeStyle);
	context.subscriptions.push(uninstallVSCodeStyle);
	context.subscriptions.push(updateVSCodeStyle);

	console.log("vscode-style is active!");
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;
