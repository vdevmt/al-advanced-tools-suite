import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';


export async function importLaunchFile(){
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace is open.");
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const launchJsonPath = path.join(workspacePath, '.vscode', 'launch.json');
    const launchJsonUri = vscode.Uri.file(launchJsonPath); // URI del file

    const selectedFileUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'JSON Files': ['json'] },
        openLabel: 'Select source launch.json file',
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

export async function exportLaunchJson() {
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

    // Chiede all'utente di selezionare la cartella di destinazione
    const targetFolderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Destination folder'
    });

    if (!targetFolderUri || targetFolderUri.length === 0) {
        vscode.window.showErrorMessage("No folder selected");
        return;
    }

    const targetFolderPath = targetFolderUri[0].fsPath;

    // Chiede all'utente di inserire il nome del file
    const fileName = await vscode.window.showInputBox({
        prompt: 'Enter the file name (including extension, e.g., launch.json)',
        value: 'launch.json'
    });

    if (!fileName) {
        vscode.window.showErrorMessage("No file name provided");
        return;
    }

    const targetFilePath = path.join(targetFolderPath, fileName);

    try {
        // Copy the contents of launch.json to the selected destination with the specified name
        fs.copyFileSync(launchJsonPath, targetFilePath);
        vscode.window.showInformationMessage(`launch.json successfully exported to: ${targetFilePath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error exporting launch.json: ${error}`);
        console.error("Error exporting the file:", error);
    }
}
