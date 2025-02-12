import * as vscode from 'vscode';
import * as launchMgr from './launch/launchMgr';
import * as alObjectExplorer from './alObject/alObjectExplorer';
import * as regionMgr from './regions/regionMgr';
import * as regionStatusBar from './regions/regionStatusBar';
import * as objectInfoStatusBar from './alObject/alObjectInfoStatusBar';
import * as namespaceMgr from './namespaces/namespaceMgr';
import * as diagnosticMgr from './diagnostics/diagnosticMgr';

let regionPathSBDebounceTimeout = null;

export function activate(context: vscode.ExtensionContext) {
    //#region launch.json tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.importLaunchFile', launchMgr.importLaunchFile));
    context.subscriptions.push(vscode.commands.registerCommand('ats.exportLaunchFile', launchMgr.exportLaunchFile));
    context.subscriptions.push(vscode.commands.registerCommand('ats.openLaunchFile', launchMgr.openLaunchFile));
    //#endregion launch.json tools

    //#region AL Objects Explorer
    context.subscriptions.push(vscode.commands.registerCommand('ats.ALObjectExplorer', alObjectExplorer.execALObjectExplorer));
    context.subscriptions.push(vscode.commands.registerCommand('ats.showOpenALObjects', alObjectExplorer.showOpenALObjects));
    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllFields', alObjectExplorer.showAllFields));
    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllTableKeys', alObjectExplorer.showAllTableKeys));
    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllTableFieldGroups', alObjectExplorer.showAllTableFieldGroups));
    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllTriggers', alObjectExplorer.showAllTriggers));
    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllProcedures', alObjectExplorer.showAllProcedures));
    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllActions', alObjectExplorer.showAllActions));
    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllDataItems', alObjectExplorer.showAllDataItems));
    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllRegions', alObjectExplorer.showAllRegions));
    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllGlobalVariables', alObjectExplorer.showAllGlobalVariables));
    //#endregion AL Objects Explorer

    //#region Run Business Central       
    context.subscriptions.push(vscode.commands.registerCommand('ats.runBusinessCentral', launchMgr.runBusinessCentral));
    context.subscriptions.push(vscode.commands.registerCommand('ats.changerStartupObjectAndRunBusinessCentral', launchMgr.changerStartupObjectAndRunBusinessCentral));
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

    //#region AL Object Info Status Bar
    const objectInfoStatusBarItem = objectInfoStatusBar.createObjectInfoStatusBarItem();
    if (objectInfoStatusBarItem) {
        context.subscriptions.push(objectInfoStatusBarItem);

        // Update status bar on editor change
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(refreshObjectInfoStatusBar));

        // Update status bar on document save
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(refreshObjectInfoStatusBar));

        // Update status bar on document close
        context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(refreshObjectInfoStatusBar));
    }

    function refreshObjectInfoStatusBar() {
        objectInfoStatusBar.updateObjectInfoStatusBar(objectInfoStatusBarItem);
    }
    //#endregion AL Object Info Status Bar

    //#region Region Status Bar
    const regionStatusBarItem = regionStatusBar.createRegionsStatusBarItem();
    if (regionStatusBarItem) {
        context.subscriptions.push(regionStatusBarItem);

        // Update status bar on editor change
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(refreshRegionsStatusBar));
        context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateRegionsStatusBarText));

        // Update status bar on document save
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(refreshRegionsStatusBar));

        // Clear status bar cache on document close
        context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((event) => {
            regionStatusBar.clearRegionsCache(event.fileName);
        }));
    }

    function updateRegionsStatusBarText() {
        regionStatusBar.updateRegionsStatusBar(regionStatusBarItem, false);
    }
    function refreshRegionsStatusBar() {
        regionStatusBar.updateRegionsStatusBar(regionStatusBarItem, true);
    }
    //#endregion Region Status Bar

    // Update ATS status bar items on document change
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(refreshStatusBarItemsOnChange));

    function refreshStatusBarItemsOnChange() {
        if (regionStatusBarItem) {
            // Cancella il timeout precedente, se presente
            if (regionPathSBDebounceTimeout) {
                clearTimeout(regionPathSBDebounceTimeout);
            }

            // Imposta un nuovo timeout per l'aggiornamento della status bar
            regionPathSBDebounceTimeout = setTimeout(() => {
                refreshRegionsStatusBar();
            }, 3000); // 3000ms di attesa prima di invocare l'aggiornamento del controllo su status bar               
        }
    }
}

export function deactivate() { }
