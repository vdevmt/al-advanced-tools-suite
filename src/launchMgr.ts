import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {ATSSettings} from './settings/atsSettings';
import {LaunchSettings} from './settings/launchSettings';

function getDefaultLaunchArchiveFolder(): string
{
    const atsSettings = ATSSettings.GetConfigSettings(null);
    let defaultFolder = atsSettings[ATSSettings.DefaultLaunchArchiveFolder];    

    return defaultFolder;
}

export async function importLaunchFile(){
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
    if (defaultFolder){
        defaultImportUri = vscode.Uri.file(defaultFolder);
    }
    const importDialogTitle = `Select Launch.json file for ${workspaceName} workspace`;

    const selectedFileUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        canSelectFiles: true,
        canSelectFolders: false,
        title: importDialogTitle,
        defaultUri: defaultImportUri,
        filters: { 'JSON Files': ['json'] },
        openLabel: 'Select file',
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
    if (defaultFolder){
        defaultDestFileUri = vscode.Uri.file(`${defaultFolder}/${defaultDestFileName}.json`);
    }
        
    // Selezione file di destinazione
    const destinationFileName = await vscode.window.showSaveDialog({
        defaultUri : defaultDestFileUri,
        title: 'Save launch.json as..',
        filters : {'Json files':['json']}},
    );

    if (!destinationFileName ) {
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

export async function runBusinessCentral() {
    const configuration = await selectCofiguration(null);
    if (configuration) {
        let atsLaunchSettings = LaunchSettings.LoadConfinguration(configuration,true);
        if (atsLaunchSettings){
            let bcClientURL = atsLaunchSettings[LaunchSettings.URL];

            if (bcClientURL) {
                vscode.env.openExternal(vscode.Uri.parse(bcClientURL));
            } else {
                vscode.window.showErrorMessage('URL not defined for this configuration');
            }    
        }
    }
}

export function getWorkspaceConfigurations(resourceUri: vscode.Uri): vscode.WorkspaceConfiguration {
    const configKey = 'launch';
    
    const workspaceConfigurations: vscode.WorkspaceConfiguration = resourceUri ?
    vscode.workspace.getConfiguration(configKey, resourceUri) :
    vscode.window.activeTextEditor ?
        vscode.workspace.getConfiguration(configKey, vscode.window.activeTextEditor.document.uri) :
        vscode.workspace.getConfiguration(configKey, vscode.workspace.workspaceFolders[0].uri);

    return workspaceConfigurations.configurations;        
}

export async function selectCofiguration(resourceUri: vscode.Uri): Promise<vscode.WorkspaceConfiguration> {
    const workspaceConfigurations = getWorkspaceConfigurations(resourceUri);

    if (workspaceConfigurations) {
        if (workspaceConfigurations.length > 1){
            const items: QuickPickItem[] = workspaceConfigurations.map((config: vscode.WorkspaceConfiguration) => ({
                label: config.name,
                detail: makeClientURL(config,true),
                config 
            }));
                        
            const selectedItem = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a Business Central configuration'                
            });

            if (!selectedItem){
                vscode.window.showErrorMessage('No configuration selected');
                return undefined;
            }

            return selectedItem.config;
        }
        else{
            return workspaceConfigurations[0];
        }
    }

    // Nessuna configurazione disponibile
    vscode.window.showErrorMessage('No configurations available');
    return undefined;    
}

export function makeClientURL(config: vscode.WorkspaceConfiguration, useForwardingRules: boolean): string{
    let clientUrl = config.server;

    if (useForwardingRules){
        const atsSettings = ATSSettings.GetConfigSettings(null);
        let forwardingRules = atsSettings[ATSSettings.URLForwardingRules];    
        if (forwardingRules){
            clientUrl = handleURLForwardingRules(clientUrl,forwardingRules);
        }
    }

    if (!clientUrl.endsWith("/")){
        clientUrl = `${clientUrl}/`;
    }

    if (config.tenant){
        clientUrl = `${clientUrl}?tenant=${config.tenant}`;
    }
    else{
        clientUrl = `${clientUrl}?tenant=default`;
    }

    if (config.startupObjectId){
        if (config.startupObjectId !== 0){
            clientUrl = `${clientUrl}&${config.startupObjectType}=${config.startupObjectId}`;
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

interface QuickPickItem {
    label: string;
    config: vscode.WorkspaceConfiguration;
}