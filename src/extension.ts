import * as vscode from 'vscode';
import * as launchMgr from './fileMgt/launchMgr';
import * as regionMgr from './regions/regionMgr';
import * as namespaceMgr from './namespaces/namespaceMgr';
import * as diagnosticMgr from './diagnostics/diagnosticMgr';

let updateTimeout: NodeJS.Timeout | undefined;

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
    if (regionMgr.regionPathStatusBarEnabled()) {
        const regionStatusBar = regionMgr.createRegionsStatusBarItem();
        context.subscriptions.push(regionStatusBar);

        // Update status bar on editor change
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateRegionsStatusBar));
        context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateRegionsStatusBar));

        // Update status bar on document save
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(updateRegionsStatusBar));

        // Clear status bar cache on document close
        context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((event) => {
            regionMgr.clearRegionsCache(event.fileName);
        }));

        function updateRegionsStatusBar() {
            regionMgr.updateRegionsStatusBar(regionStatusBar, true);
        }

        context.subscriptions.push(vscode.commands.registerCommand('ats.goToRegionStartLine', (line: number, regionPath: string) => {
            regionMgr.goToRegionStartLine(line, regionPath);
        }));
    }
    //#endregion Region Status Bar
}

export function deactivate() { }
