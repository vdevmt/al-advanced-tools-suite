import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as appInfo from '../tools/appInfo';
import * as alFileMgr from './alObjectFileMgr';
import { ALObject } from './alObject';
import { ATSSettings } from '../settings/atsSettings';
import { TelemetryClient } from '../telemetry/telemetry';


//#region Symbols List
export async function findAllSymbols(): Promise<vscode.SymbolInformation[]> {
    const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
        'vscode.executeWorkspaceSymbolProvider',
        'Sales Line' // stringa di ricerca (obbligatoria)
    );

    if (!symbols || symbols.length === 0) {
        return [];
    }

    const document = await vscode.workspace.openTextDocument(symbols[0].location.uri);
    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {

    }

    return symbols;
}
//#endregion Symbols List


//#region Import/Export utilities
function getDefaultSymbolsArchiveFolder(uri: vscode.Uri): string {
    const atsSettings = ATSSettings.GetConfigSettings(uri);
    let defaultFolder = atsSettings[ATSSettings.DefaultSymbolsArchiveFolder];

    return defaultFolder;
}
export async function importAlSymbols() {
    TelemetryClient.logCommand('importAlSymbols');

    try {

        // Ricerca Path principale del workspace corrente
        const workspaceFolder = await appInfo.pickWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        const workspacePath = workspaceFolder.uri.fsPath;
        const workspaceName = vscode.workspace.name?.replace(" (Workspace)", "");
        const importDialogTitle = `Select AL Symbols for ${workspaceName} workspace`;

        // Selezione modalità di importazione
        const copyMode = await vscode.window.showQuickPick(
            ["Copy all symbols in folder", "Select files manually"],
            { placeHolder: "Do you want to copy all files from a folder, or select specific ones?" }
        );

        if (!copyMode) {
            vscode.window.showInformationMessage("Operation cancelled.");
            return;
        }
        const copyByFolder = (copyMode === "Copy all symbols in folder");
        let sourceFiles: string[] = [];

        let defaultImportUri = vscode.Uri.file(`${workspaceFolder.uri.fsPath}`);
        let defaultFolder = getDefaultSymbolsArchiveFolder(workspaceFolder.uri);
        if (defaultFolder) {
            defaultImportUri = vscode.Uri.file(defaultFolder);
        }

        if (copyByFolder) {
            // Selezione cartella di origine
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: defaultImportUri,
                title: importDialogTitle
            });

            if (!folderUri || folderUri.length === 0) {
                vscode.window.showInformationMessage("Operation cancelled.");
                return;
            }

            const sourceFolder = folderUri[0].fsPath;
            console.log(`Selected source folder: ${sourceFolder}`);

            try {
                sourceFiles = fs.readdirSync(sourceFolder, { withFileTypes: true })
                    .filter(dirent =>
                        dirent.isFile() &&
                        typeof dirent.name === 'string' &&
                        dirent.name.toLowerCase().endsWith('.app')
                    )
                    .map(dirent => path.join(sourceFolder, dirent.name));
            } catch (err) {
                console.error('Error reading selected folder:', err);
            }
        } else {
            // Selezione manuale di uno o più file .app
            const fileUris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: true,
                defaultUri: defaultImportUri,
                title: importDialogTitle,
                filters: { "Business Central App Files": ["app"] }
            });

            if (!fileUris || fileUris.length === 0) {
                vscode.window.showInformationMessage("Operation cancelled.");
                return;
            }

            sourceFiles = fileUris.map(uri => uri.fsPath);
            console.log(`Selected files: ${sourceFiles.join(", ")}`);
        }

        // Verifico presenza della cartella di default per i Symbols
        const destFolder = path.join(workspacePath, ".alpackages");

        // Creazione cartella destinazione se non esiste
        if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
            console.log(`Created folder: ${destFolder}`);
        }

        // Eliminazione dei simboli esistenti (se richiesto)
        const clearExistingSymbolsChoice = await vscode.window.showInformationMessage(
            "Do you want to remove all existing symbols before proceeding?",
            { modal: true },
            "Yes", "No"
        );

        if (!clearExistingSymbolsChoice) {
            vscode.window.showInformationMessage("Operation cancelled.");
            return;
        }

        const clearExistingSymbols = clearExistingSymbolsChoice === "Yes";

        if (clearExistingSymbols) {
            const existing = fs.readdirSync(destFolder)
                .filter(f => f.toLowerCase().endsWith(".app"));
            for (const oldFile of existing) {
                fs.unlinkSync(path.join(destFolder, oldFile));
                console.log(`Removed existing file: ${oldFile}`);
            }

            vscode.window.showInformationMessage("All existing symbols have been removed.");
        }

        // Copia file
        const pattern = /^([^_]+)_([^_]+)_([\d\.]+)(\.app)?$/i;
        let msSymbolsCleaned = false;
        let copiedCount = 0;

        for (const sourcePath of sourceFiles) {
            const fileName = path.basename(sourcePath);
            const match = fileName.match(pattern);
            if (match) {
                const Publisher = match[1];
                const AppName = match[2];
                const Version = match[3];

                console.log(`Processing: ${fileName}`);

                if (Publisher === "Microsoft" && !msSymbolsCleaned) {
                    // Rimuove tutti i file Microsoft
                    const toDelete = fs.readdirSync(destFolder)
                        .filter(f => f.startsWith("Microsoft_") && f.toLowerCase().endsWith(".app"));
                    for (const oldFile of toDelete) {
                        fs.unlinkSync(path.join(destFolder, oldFile));
                        console.log(`Removed Microsoft file: ${oldFile}`);
                    }
                    msSymbolsCleaned = true;
                } else {
                    // Rimuove vecchie versioni dello stesso AppName per altri publisher
                    const existing = fs.readdirSync(destFolder)
                        .filter(f => pattern.test(f))
                        .filter(f => {
                            const m = f.match(pattern);
                            return m && m[1] === Publisher && m[2] === AppName;
                        });

                    for (const oldFile of existing) {
                        const m = oldFile.match(pattern);
                        if (m && m[3] !== Version) {
                            fs.unlinkSync(path.join(destFolder, oldFile));
                            console.log(`Removed old version: ${oldFile}`);
                        }
                    }
                }

                // Copia il file
                const destPath = path.join(destFolder, fileName);
                fs.copyFileSync(sourcePath, destPath);
                copiedCount++;
                console.log(`Copied: ${fileName} to ${destFolder}`);
            }
        }

        // Messaggio di conferma + richiesta di riavvio del workspace corrente
        const reloadChoice = await vscode.window.showInformationMessage(
            `Update completed.\nDo you want to reload the workspace?`,
            {
                modal: true,
                detail: `${copiedCount} file(s) copied.`
            },
            "Yes", "No"
        );

        if (reloadChoice === "Yes") {
            await vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    } catch (err: any) {
        vscode.window.showErrorMessage(`Error updating AL packages: ${err.message}`);
    }
}
//#endregion Import/Export utilities



