import * as vscode from 'vscode';
import * as launchMgr from './fileMgt/launchMgr';
import * as regionMgr from './regions/regionMgr';
import * as regionStatusBar from './regions/regionStatusBar';
import * as namespaceMgr from './namespaces/namespaceMgr';
import * as diagnosticMgr from './diagnostics/diagnosticMgr';

let debounceTimeout = null;

export function activate(context: vscode.ExtensionContext) {
    //#region launch.json tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.importLaunchFile', launchMgr.importLaunchFile));
    context.subscriptions.push(vscode.commands.registerCommand('ats.exportLaunchFile', launchMgr.exportLaunchFile));
    context.subscriptions.push(vscode.commands.registerCommand('ats.openLaunchFile', launchMgr.openLaunchFile));
    //#endregion launch.json tools

    //#region Run Business Central
    context.subscriptions.push(vscode.commands.registerCommand('ats.runBusinessCentral', launchMgr.runBusinessCentral));
    //#endregion Run Business Central

    //#region Region tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.createRegionBySelection', regionMgr.createRegionBySelection));
    //#endregion Region tools

    //#region Namespace tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.setNamespaceByFilePath', namespaceMgr.setNamespaceByFilePath));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('al', new namespaceMgr.NamespaceCompletionProvider(), " "));
    //#endregion Namespace tools

    //#region Diagnostic Rules
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('atsDiagnostics');
    context.subscriptions.push(diagnosticCollection);

    diagnosticMgr.subscribeToDocumentChanges(context, diagnosticCollection);

    // Scansiona tutti i file AL nel workspace all'avvio
    diagnosticMgr.ValidateAllFiles(diagnosticCollection);
    //#endregion Diagnostic Rules

    //#region Region Status Bar
    if (regionStatusBar.regionPathStatusBarEnabled()) {
        const regionStatusBarItem = regionStatusBar.createRegionsStatusBarItem();
        context.subscriptions.push(regionStatusBarItem);

        // Update status bar on editor change
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(refreshRegionsStatusBar));
        context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateRegionsStatusBarText));

        // Update status bar on document change
        context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(refreshRegionsStatusBarOnChange));

        // Update status bar on document save
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(refreshRegionsStatusBar));

        // Clear status bar cache on document close
        context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((event) => {
            regionStatusBar.clearRegionsCache(event.fileName);
        }));

        function updateRegionsStatusBarText() {
            regionStatusBar.updateRegionsStatusBar(regionStatusBarItem, false);
        }
        function refreshRegionsStatusBar() {
            regionStatusBar.updateRegionsStatusBar(regionStatusBarItem, true);
        }
        function refreshRegionsStatusBarOnChange() {
            // Cancella il timeout precedente, se presente
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }

            // Imposta un nuovo timeout per l'aggiornamento della status bar
            debounceTimeout = setTimeout(() => {
                refreshRegionsStatusBar();
            }, 300); // 300ms di attesa prima di invocare updateRegionsStatusBar               
        }

        context.subscriptions.push(vscode.commands.registerCommand('ats.goToRegionStartLine', (line: number, regionPath: string) => {
            regionStatusBar.goToRegionStartLine(line, regionPath);
        }));
    }
    //#endregion Region Status Bar
}

export function deactivate() { }
