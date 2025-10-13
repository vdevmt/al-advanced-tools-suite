import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as jsonc from 'jsonc-parser';
import * as alFileMgr from '../alObject/alObjectFileMgr';
import { ATSSettings } from '../settings/atsSettings';
import { ALObject } from '../alObject/alObject';
import { TelemetryClient } from '../telemetry/telemetry';

//#region Import/Export utilities
function getDefaultLaunchArchiveFolder(): string {
    const atsSettings = ATSSettings.GetConfigSettings(null);
    let defaultFolder = atsSettings[ATSSettings.DefaultLaunchArchiveFolder];

    return defaultFolder;
}

export async function importLaunchFile() {
    TelemetryClient.logCommand('importLaunchFile');

    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace is open.");
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const launchJsonPath = path.join(workspacePath, '.vscode', 'launch.json');

    // Path di origine di default
    const workspaceName = vscode.workspace.name?.replace(" (Workspace)", "");
    let defaultImportUri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}`);

    // Verifica presenza di una cartella di default
    let defaultFolder = getDefaultLaunchArchiveFolder();
    if (defaultFolder) {
        defaultImportUri = vscode.Uri.file(defaultFolder);
    }
    const importDialogTitle = `Select Launch.json file for ${workspaceName} workspace`;

    const selectedFileUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        canSelectFiles: true,
        canSelectFolders: false,
        title: importDialogTitle,
        defaultUri: defaultImportUri,
        filters: { 'JSON Files': ['json'] }
    });

    if (!selectedFileUri || selectedFileUri.length === 0) {
        vscode.window.showErrorMessage("No file selected");
        return;
    }

    const selectedFilePath = selectedFileUri[0].fsPath;

    try {
        // Leggi il file selezionato
        const fileContent = fs.readFileSync(selectedFilePath, 'utf-8');

        // Crea la cartella .vscode se non esiste
        if (!fs.existsSync(path.join(workspacePath, '.vscode'))) {
            fs.mkdirSync(path.join(workspacePath, '.vscode'));
        }
        // Scrivi il contenuto nel launch.json
        fs.writeFileSync(launchJsonPath, fileContent);
        vscode.window.showInformationMessage("Operation completed!!");

        // Apri il file launch.json
        vscode.workspace.openTextDocument(launchJsonPath).then(doc => vscode.window.showTextDocument(doc));
    } catch (error) {
        vscode.window.showErrorMessage(`Operation failed: ${error}`);
    }
}

export async function exportLaunchFile() {
    TelemetryClient.logCommand('exportLaunchFile');

    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace is open.");
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const launchJsonPath = path.join(workspacePath, '.vscode', 'launch.json');

    // Verifica se il file launch.json esiste
    if (!fs.existsSync(launchJsonPath)) {
        vscode.window.showErrorMessage("The launch.json file does not exist in the current workspace.");
        return;
    }

    // Destinazione di default
    const defaultDestFileName = vscode.workspace.name?.replace(" (Workspace)", "");
    let defaultDestFileUri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/${defaultDestFileName}.json`);

    // Verifica presenza di una cartella di default
    let defaultFolder = getDefaultLaunchArchiveFolder();
    if (defaultFolder) {
        defaultDestFileUri = vscode.Uri.file(`${defaultFolder}/${defaultDestFileName}.json`);
    }

    // Selezione file di destinazione
    const destinationFileName = await vscode.window.showSaveDialog({
        defaultUri: defaultDestFileUri,
        title: 'Save launch.json as..',
        filters: { 'Json files': ['json'] }
    },
    );

    if (!destinationFileName) {
        vscode.window.showErrorMessage("No file name provided");
        return;
    }

    try {
        // Copy the contents of launch.json to the selected destination with the specified name
        fs.copyFileSync(launchJsonPath, destinationFileName.fsPath);
        vscode.window.showInformationMessage('launch.json successfully exported');
    } catch (error) {
        vscode.window.showErrorMessage(`Error exporting launch.json: ${error}`);
        console.error("Error exporting the file:", error);
    }
}

export async function openLaunchFile() {
    TelemetryClient.logCommand('openLaunchFile');

    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace is open.");
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const launchJsonPath = path.join(workspacePath, '.vscode', 'launch.json');

    if (launchJsonPath) {
        vscode.workspace.openTextDocument(launchJsonPath).then(doc => vscode.window.showTextDocument(doc));
    }
}

//#endregion Import/Export utilities

//#region Run Business Central
export async function runBusinessCentral() {
    selectAndRunBusinessCentral(false);
}

export function changeStartupObjectAndRunBusinessCentral() {
    const editor = vscode.window.activeTextEditor;

    if (alFileMgr.isALObjectDocument(editor.document)) {
        let alObject: ALObject;
        alObject = new ALObject(editor.document, true);
        if (alObject) {
            if (!alFileMgr.isValidObjectToRun(alObject)) {
                vscode.window.showErrorMessage(`The object ${alObject.objectType} ${alObject.objectId} is not a valid object to run`);
                return;
            }

            selectAndRunBusinessCentral(true);
            return;
        }
    }

    vscode.window.showErrorMessage(`The current file is not a valid object to run`);

}

export async function selectAndRunBusinessCentral(changeStartupObject: boolean) {
    TelemetryClient.logCommand('selectAndRunBusinessCentral');

    var bcClientURL = "";
    let useDefaultSettings = true;

    const editor = vscode.window.activeTextEditor;
    if (editor) {
        if (alFileMgr.isALObjectDocument(editor.document)) {
            let alObject: ALObject;
            alObject = new ALObject(editor.document, true);

            if (alFileMgr.isValidObjectToRun(alObject)) {
                bcClientURL = await selectBusinessCentralURL(null, alObject, changeStartupObject);
                useDefaultSettings = false;
            }
        }
    }

    if (useDefaultSettings) {
        bcClientURL = await selectBusinessCentralURL(null, null, false);
    }

    if (bcClientURL) {
        vscode.env.openExternal(vscode.Uri.parse(bcClientURL));
    } else {
        vscode.window.showErrorMessage('URL not defined for this configuration');
    }
}


export function getWorkspaceConfigurations(resourceUri: vscode.Uri): vscode.WorkspaceConfiguration {
    const configKey = 'launch';

    const workspaceConfigurations: vscode.WorkspaceConfiguration = resourceUri ?
        vscode.workspace.getConfiguration(configKey, resourceUri) :
        (vscode.window.activeTextEditor && (!alFileMgr.IsPreviewALObject(vscode.window.activeTextEditor.document))) ?
            vscode.workspace.getConfiguration(configKey, vscode.window.activeTextEditor.document.uri) :
            vscode.workspace.getConfiguration(configKey, vscode.workspace.workspaceFolders[0].uri);

    return workspaceConfigurations.configurations;
}

export async function selectBusinessCentralURL(resourceUri: vscode.Uri, alObject: ALObject, changeStartupObject: boolean): Promise<string> {
    const workspaceConfigurations = getWorkspaceConfigurations(resourceUri);

    if (workspaceConfigurations) {
        if ((workspaceConfigurations.length === 1) && (!alObject)) {
            return makeBcClientURL(workspaceConfigurations[0], true, null);
        } else {
            const items: QuickPickItem[] = [];

            workspaceConfigurations.forEach((config: vscode.WorkspaceConfiguration) => {

                if (!changeStartupObject) {
                    // Configurazione originale
                    items.push({
                        label: config.name,
                        description: 'Default configuration',
                        detail: makeBcClientURL(config, true, null),
                        config
                    });
                }

                if (alObject) {
                    // Configurazione con oggetto corrente                    
                    const currObjectConfig = {
                        label: `${config.name}`,
                        description: 'Current object',
                        detail: makeBcClientURL(config, true, alObject),
                        config
                    };

                    items.push(currObjectConfig);
                }
            });

            const selectedItem = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a Business Central configuration'
            });

            if (!selectedItem) {
                vscode.window.showErrorMessage('No configuration selected');
                return undefined;
            }

            if (changeStartupObject) {
                setNewStartupObject(selectedItem.config.name, alObject);
            }

            return selectedItem.detail;
        }
    }

    // Nessuna configurazione disponibile
    vscode.window.showErrorMessage('No configurations available');
    return undefined;
}

export async function selectCofiguration(resourceUri: vscode.Uri): Promise<vscode.WorkspaceConfiguration> {
    const workspaceConfigurations = getWorkspaceConfigurations(resourceUri);

    if (workspaceConfigurations) {
        if (workspaceConfigurations.length > 1) {
            const items: QuickPickItem[] = workspaceConfigurations.map((config: vscode.WorkspaceConfiguration) => ({
                label: config.name,
                detail: makeBcClientURL(config, true, null),
                config
            }));

            const selectedItem = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a Business Central configuration'
            });

            if (!selectedItem) {
                vscode.window.showErrorMessage('No configuration selected');
                return undefined;
            }

            return selectedItem.config;
        }
        else {
            return workspaceConfigurations[0];
        }
    }

    // Nessuna configurazione disponibile
    vscode.window.showErrorMessage('No configurations available');
    return undefined;
}

export function makeBcClientURL(config: vscode.WorkspaceConfiguration, useForwardingRules: boolean, alObjectToRun: ALObject): string {
    let clientUrl = config.server;

    if (useForwardingRules) {
        const atsSettings = ATSSettings.GetConfigSettings(null);
        let forwardingRules = atsSettings[ATSSettings.URLForwardingRules];
        if (forwardingRules) {
            clientUrl = handleURLForwardingRules(clientUrl, forwardingRules);
        }
    }

    if (!clientUrl.endsWith("/")) {
        clientUrl = `${clientUrl}/`;
    }

    if (config.tenant) {
        clientUrl = `${clientUrl}?tenant=${config.tenant.trim()}`;
    }
    else {
        clientUrl = `${clientUrl}?tenant=default`;
    }

    if (config.startupCompany) {
        clientUrl = `${clientUrl}&company=${encodeURI(config.startupCompany.trim())}`;
    }

    if (alObjectToRun) {
        if (alFileMgr.isValidObjectToRun(alObjectToRun)) {
            clientUrl = `${clientUrl}&${alObjectToRun.objectType}=${alObjectToRun.objectId}`;
        }
    }
    else {
        if (config.startupObjectId) {
            if (config.startupObjectId !== 0) {
                clientUrl = `${clientUrl}&${config.startupObjectType}=${config.startupObjectId}`;
            }
        }
    }

    return clientUrl;
}

function handleURLForwardingRules(clientURL: string, forwardingRules: { [key: string]: string }): string {
    let newClientURL = clientURL;

    // Ordino i valori in base alla lunghezza della stringa in maniera decrescente
    const sortedValues = Object.keys(forwardingRules).sort((a, b) => {
        const lengthA = forwardingRules[a].length;
        const lengthB = forwardingRules[b].length;
        return lengthB - lengthA; // Ordine decrescente
    });

    // Sostituisci la prima occorrenza di ogni placeholder
    for (const key of sortedValues) {
        const value = forwardingRules[key];
        const placeholder = new RegExp(`\\b${key}\\b`, 'i'); // RegExp per trovare "key" come parola intera (case-insensitive)
        if (placeholder.test(newClientURL)) {
            newClientURL = newClientURL.replace(placeholder, value);
            return newClientURL;
        }
    }

    return newClientURL;
}

function setNewStartupObject(configName: string, alObject: ALObject) {
    if (alObject && configName) {
        if (!alFileMgr.isValidObjectToRun(alObject)) {
            vscode.window.showErrorMessage(`The object ${alObject.objectType} ${alObject.objectId} is not a valid object to run`);
        }
        else {
            // Search launch.json in current workspace
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage("No workspace is open.");
                return;
            }

            const launchPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json');

            if (!fs.existsSync(launchPath)) {
                vscode.window.showErrorMessage("launch.json not found in the .vscode directory.");
                return;
            }

            // Read launch.json file
            let fileContent: string;
            try {
                fileContent = fs.readFileSync(launchPath, 'utf8');
            } catch (error) {
                vscode.window.showErrorMessage("Failed to read launch.json.");
                return;
            }

            let jsonErrors: any[] = [];
            const launchData = jsonc.parse(fileContent, jsonErrors, { allowTrailingComma: true });

            if (jsonErrors.length > 0) {
                vscode.window.showErrorMessage("Failed to parse launch.json due to syntax errors.");
                return;
            }

            // Search the configuration
            const configurations = launchData?.configurations;

            if (!Array.isArray(configurations)) {
                vscode.window.showErrorMessage("No configurations found in launch.json.");
                return;
            }

            const targetConfigIndex = configurations.findIndex((config: any) => config.name === configName);
            if (isNaN(targetConfigIndex) || targetConfigIndex < 0) {
                vscode.window.showErrorMessage(`Configuration "${configName}" not found.`);
                return;
            }

            // Store new values in variables
            const startupObjectTypeValue = alObject.objectType;
            const startupObjectIdValue = Number(alObject.objectId);

            // Edit configuration
            const targetConfig = configurations[targetConfigIndex];

            // startupObjectType
            if (!targetConfig.hasOwnProperty('startupObjectType')) {
                vscode.window.showErrorMessage(`Configuration "${configName}" does not contain "startupObjectType" key. Please, add it.`);
                return;
            }
            targetConfig.startupObjectType = startupObjectTypeValue;

            // startupObjectId
            if (!targetConfig.hasOwnProperty('startupObjectId')) {
                vscode.window.showErrorMessage(`Configuration "${configName}" does not contain "startupObjectId" key. Please, add it.`);
                return;
            }
            targetConfig.startupObjectId = startupObjectIdValue;

            let edits = [];

            // Apply changes
            edits = edits.concat(
                jsonc.modify(
                    fileContent,
                    ['configurations', targetConfigIndex, 'startupObjectType'],
                    targetConfig['startupObjectType'],
                    { formattingOptions: { tabSize: 2, insertSpaces: true } }
                ),
                jsonc.modify(
                    fileContent,
                    ['configurations', targetConfigIndex, 'startupObjectId'],
                    targetConfig['startupObjectId'],
                    { formattingOptions: { tabSize: 2, insertSpaces: true } }
                )
            );

            // Save new file content
            try {
                const updatedContent = jsonc.applyEdits(fileContent, edits);
                fs.writeFileSync(launchPath, updatedContent, 'utf8');
                vscode.window.showInformationMessage(`Configuration "${configName}" updated successfully.`);
            } catch (error) {
                vscode.window.showErrorMessage("Failed to save changes to launch.json.");
            }
        }
    }
}

//#endregion Run Business Central

//#region Interfaces
interface QuickPickItem {
    label: string;
    detail?: string;
    description?: string;
    config?: vscode.WorkspaceConfiguration;
}
//#endregion Interfaces