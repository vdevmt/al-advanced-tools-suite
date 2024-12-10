import * as vscode from 'vscode';
import * as launchMgr from './fileMgt/launchMgr';
import * as regionMgr from './regions/regionMgr';
import * as regionCache from './regions/cache';
import * as namespaceMgr from './namespaces/namespaceMgr';
import * as diagnosticMgr from './diagnostics/diagnosticMgr';

let updateTimeout: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
    // launch.json tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.importLaunchFile', launchMgr.importLaunchFile));   
    context.subscriptions.push(vscode.commands.registerCommand('ats.exportLaunchFile', launchMgr.exportLaunchFile));
    context.subscriptions.push(vscode.commands.registerCommand('ats.runBusinessCentral', launchMgr.runBusinessCentral));

    // Region tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.createRegionBySelection', regionMgr.createRegionBySelection));

    // Namespace tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.setNamespaceByFilePath', namespaceMgr.setNamespaceByFilePath));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('al', new namespaceMgr.NamespaceCompletionProvider()," "));

    // Diagnostic Rules
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('atsDiagnostics');
    context.subscriptions.push(diagnosticCollection);

    diagnosticMgr.subscribeToDocumentChanges(context,diagnosticCollection);

    // Scansiona tutti i file AL nel workspace all'avvio
    diagnosticMgr.ValidateAllFiles(diagnosticCollection);


    // Barra di stato (Region Path)
    const regionStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    regionStatusBar.text = '';
    regionStatusBar.tooltip = 'Region Path (ATS)';
    regionStatusBar.show();

    context.subscriptions.push(regionStatusBar);

    // Aggiorna la barra quando cambiano il file o la selezione
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(InitRegionStatusBar));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(InitRegionStatusBar));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(InitRegionStatusBar));

    // Aggiorna la cache quando il documento viene modificato
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
        const document = event.document;
        const reason = event.reason;
        const changes = event.contentChanges;

        regionCache.updateRegionCacheForChanges(document, [...changes]);
    }));

    function InitRegionStatusBar() {
        updateRegionStatusBar(true);
    }

    async function updateRegionStatusBar(rebuildCache: boolean) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            regionStatusBar.text = '';
            regionStatusBar.tooltip = 'Region Path (ATS)';
            return;
        }
    
        const document = editor.document;
        const currentLine = editor.selection.active.line;

        // Ottieni il percorso delle regioni per la riga corrente
        const path = await regionCache.getRegionPathFromCache(document, currentLine, rebuildCache);  
        regionStatusBar.text = `${regionMgr.truncateRegionPath(path,60)}`;
        regionStatusBar.tooltip = `Region Path (ATS): ${path}`;

        // Registra un comando per ogni regione
        const regionLine =  regionMgr.findRegionStartLine(document, path);
        regionStatusBar.command = {
            command: 'ats.goToRegionStartLine',
            arguments: [regionLine],
            title: `ATS: Go to Region start position`            
        };

        regionStatusBar.show();        
    } 

    context.subscriptions.push(vscode.commands.registerCommand('ats.goToRegionStartLine', (line: number) => {
        regionMgr.goToRegionStartLine(line);
    }));
}

export function deactivate() {}
