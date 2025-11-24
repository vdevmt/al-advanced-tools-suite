import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as externalTools from './externalTools';
import { TelemetryClient } from '../telemetry/telemetry';

export function getWorkspaceFolder(uri: vscode.Uri): vscode.WorkspaceFolder {
    if (uri) {
        return vscode.workspace.getWorkspaceFolder(uri);
    }

    const editor = vscode.window.activeTextEditor;
    if (editor) {
        return vscode.workspace.getWorkspaceFolder(editor.document.uri);
    }

    if (vscode.workspace.workspaceFolders) {
        return vscode.workspace.workspaceFolders[0];
    }

    return undefined;
}

export async function pickWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("No workspace folder is open.");
        return undefined;
    }

    // Solo una folder → la restituiamo direttamente
    if (workspaceFolders.length === 1) {
        return workspaceFolders[0];
    }

    // Più folder → QuickPick
    const items = workspaceFolders.map(folder => ({
        label: appName(folder) || folder.name,
        description: folder.uri.fsPath,
        folder
    }));

    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: "Select the workspace folder",
        canPickMany: false
    });

    if (!selection) {
        // Utente ha annullato
        vscode.window.showErrorMessage("No workspace selected.");
        return undefined;
    }

    return selection.folder;
}

function getAppJsonFilePath(workspaceFolder: vscode.WorkspaceFolder): string | undefined {
    if (!workspaceFolder) {
        workspaceFolder = getWorkspaceFolder(undefined);
    }

    if (!workspaceFolder) {
        vscode.window.showErrorMessage("No workspace is open.");
        return undefined;
    }

    const workspacePath = workspaceFolder.uri.fsPath;
    const filePath = path.join(workspacePath, 'app.json');

    if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage(`app.json not found in: ${workspacePath}`);
        return undefined;
    }

    return filePath;
}



export function appName(workspaceFolder: vscode.WorkspaceFolder): string {
    // Search app.json file in current workspace
    const filePath = getAppJsonFilePath(workspaceFolder);

    // Read content of file
    let fileContent: string;
    try {
        fileContent = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        vscode.window.showErrorMessage("Failed to read app.json file.");
        return undefined;
    }

    // Find current version
    let appInfo: any;
    try {
        appInfo = JSON.parse(fileContent);
    } catch (error) {
        vscode.window.showErrorMessage('Invalid JSON format in app.json file.');
        return undefined;
    }

    const appName = appInfo.name;
    if (!appName) {
        vscode.window.showErrorMessage('Unable to retrieve the current app name.');
        return undefined;
    }

    return appName;
}

export function appVersion(workspaceFolder: vscode.WorkspaceFolder): string {
    // Search app.json file in current workspace
    const filePath = getAppJsonFilePath(workspaceFolder);

    // Read content of file
    let fileContent: string;
    try {
        fileContent = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        vscode.window.showErrorMessage("Failed to read app.json file.");
        return undefined;
    }

    // Find current version
    let appInfo: any;
    try {
        appInfo = JSON.parse(fileContent);
    } catch (error) {
        vscode.window.showErrorMessage('Invalid JSON format in app.json file.');
        return undefined;
    }

    const appName = appInfo.version;
    if (!appName) {
        vscode.window.showErrorMessage('Unable to retrieve the current app version.');
        return undefined;
    }

    return appName;
}


export async function packageNewVersion() {
    TelemetryClient.logCommand('packageNewVersion');

    const workspaceFolder = await pickWorkspaceFolder();
    if (workspaceFolder) {
        if (await increaseAppVersion(workspaceFolder)) {
            externalTools.execAlPackage(true);
        }
    }
}

async function increaseAppVersion(workspaceFolder: vscode.WorkspaceFolder): Promise<Boolean> {
    // Search app.json file in current workspace
    const filePath = getAppJsonFilePath(workspaceFolder);

    // Read content of file
    let fileContent: string;
    try {
        fileContent = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        vscode.window.showErrorMessage("Failed to read app.json file.");
        return false;
    }

    // Find current version
    let appInfo: any;
    try {
        appInfo = JSON.parse(fileContent);
    } catch (error) {
        vscode.window.showErrorMessage('Invalid JSON format in app.json file.');
        return;
    }

    const currentVersion = appInfo.version;
    if (!currentVersion || !/^\d+\.\d+\.\d+\.\d+$/.test(currentVersion)) {
        vscode.window.showErrorMessage('Invalid or missing version attribute in app.json.');
        return false;
    }

    const versionParts = currentVersion.split('.').map(Number);
    const newRevisionVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2]}.${versionParts[3] + 1}`;
    const newBuildVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}.0`;
    const newMinorVersion = `${versionParts[0]}.${versionParts[1] + 1}.0.0`;
    const newMajorVersion = `${versionParts[0] + 1}.0.0.0`;

    const items: vscode.QuickPickItem[] = [];
    items.push({ label: `New Revision release`, description: newRevisionVersion });
    items.push({ label: `New Build release`, description: newBuildVersion });
    items.push({ label: `New Minor release`, description: newMinorVersion });
    items.push({ label: `New Major release`, description: newMajorVersion });
    items.push({ label: `Set manual version number`, description: '<Manual>' });

    const selectedOption = await vscode.window.showQuickPick(items,
        { placeHolder: `[${appInfo.name}] Set the new version number (current: ${currentVersion}):` }
    );

    if (!selectedOption) {
        vscode.window.showInformationMessage('Version update canceled.');
        return;
    }

    let newVersion = selectedOption.description;
    if (newVersion === '<Manual>') {
        const versionRegex = /^\d+\.\d+\.\d+\.\d+$/;
        newVersion = await vscode.window.showInputBox({
            prompt: `Type the new version number (current: ${currentVersion}):`,
            placeHolder: currentVersion,
            value: currentVersion,
            validateInput: (value) => {
                return versionRegex.test(value) ? null : 'Invalid app version format';
            }
        });
    }

    if (newVersion) {
        if (newVersion !== currentVersion) {
            // Update the version in JSON content
            appInfo.version = newVersion;
            try {
                fs.writeFileSync(filePath, JSON.stringify(appInfo, null, 4), 'utf8');
                vscode.window.showInformationMessage(`Version updated to ${newVersion}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to write app.json file: ${error}`);
            }
        }

        return true;
    }
    else {
        vscode.window.showInformationMessage('Version update canceled.');
        return false;
    }
}