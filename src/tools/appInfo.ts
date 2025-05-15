import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as externalTools from './externalTools';


function getAppJsonFilePath(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspacePath = workspaceFolders[0].uri.fsPath;

    const filePath = path.join(workspacePath, 'app.json');
    if (!fs.existsSync(filePath)) {
        vscode.window.showErrorMessage("app.json not found in the workspace directory.");
        return undefined;
    }

    return filePath;
}

export function appName(): string {
    // Search app.json file in current workspace
    const filePath = getAppJsonFilePath();

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
export function appVersion(): string {
    // Search app.json file in current workspace
    const filePath = getAppJsonFilePath();

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
    if (await increaseAppVersion()) {
        externalTools.execAlPackage(true);
    }
}

async function increaseAppVersion(): Promise<Boolean> {
    // Search app.json file in current workspace
    const filePath = getAppJsonFilePath();

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
        { placeHolder: `Set the new version number (current: ${currentVersion}):` }
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