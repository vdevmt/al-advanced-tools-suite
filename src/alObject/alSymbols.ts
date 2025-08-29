import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export async function importAlSymbols(): Promise<void> {
    try {

        // Ricerca Path principale del workspace corrente
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage("No workspace is open.");
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
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

        if (copyByFolder) {
            // Selezione cartella di origine
            const folderUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: importDialogTitle
            });

            if (!folderUri || folderUri.length === 0) {
                vscode.window.showInformationMessage("Operation cancelled.");
                return;
            }

            const sourceFolder = folderUri[0].fsPath;
            console.log(`Selected source folder: ${sourceFolder}`);

            sourceFiles = fs.readdirSync(sourceFolder, { withFileTypes: true })
                .filter(dirent => dirent.isFile() && dirent.name.toLowerCase().endsWith(".app"))
                .map(dirent => path.join(sourceFolder, dirent.name));

        } else {
            // Selezione manuale di uno o più file .app
            const fileUris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: true,
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
            `Update completed.\nDo you want to reload the workspace now?`,
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
