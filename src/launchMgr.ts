import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

function getDefaultLaunchArchiveFolder(): string
{
    const config = vscode.workspace.getConfiguration('ATS');
    let defaultFolder = config.get<string>('DefaultLaunchArchiveFolder', '');

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

export async function runBusinessCentral(){
    const stripJsonComments = await import('strip-json-comments');
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace is open.");
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const launchJsonPath = path.join(workspacePath, '.vscode', 'launch.json');

    // Leggi il file launch.json
    fs.readFile(launchJsonPath, 'utf8', async (err, data) => {
        if (err) {
            vscode.window.showErrorMessage('Error reading the launch.json file');
            return;
        }
        
        try {
            // Conversione dati in formato Json corretto
            let normalizedJsonData = await normalizeALLaunchJson(data);

            // Lettura file json                    
            const jsonData = JSON.parse(normalizedJsonData);
            const configurations: LaunchConfig[] = jsonData.configurations;

            // Crea una lista di opzioni basata sul nome delle configurazioni
            const items = configurations.map(config => ({
                label: config.name,
                url: config.server
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a Business Central configuration'
            });
            
            if (selected && selected.url) {
                const uri = vscode.Uri.parse(selected.url);
                vscode.env.openExternal(uri);
            } else {
                vscode.window.showErrorMessage('URL not defined for this configuration');
            }

        } catch (e) {
            vscode.window.showErrorMessage('Error parsing launch.json');
        }
    });
}

async function normalizeALLaunchJson(launchContent: string): Promise<string> {
    // Importazione dinamica del modulo `strip-json-comments`
    const stripJsonComments = (await import('strip-json-comments')).default;

    // Eliminazione commenti presenti nel file json
    let normalizedJsonData = stripJsonComments(launchContent);

    // Aggiunge virgolette a numeri e boolean
    normalizedJsonData = normalizedJsonData.replace(/(\s*:\s*)(\b\d+\b|\btrue\b|\bfalse\b)(\s*[,\n\r}])/g, '$1"$2"$3');

    // Eliminazione virgole non consentite prima di una parentesi di chiusura '}' o ']'   
    normalizedJsonData = normalizedJsonData.replace(/,\s*(\}|\])\s*/g, '$1');

    // Eliminazione righe vuote
    normalizedJsonData = normalizedJsonData.replace(/^\s*[\r\n]/gm, '');

    return normalizedJsonData;    
}

interface LaunchConfig {
    name: string;
    server?: string; 
}