import * as vscode from 'vscode';

import * as launchMgr from './launchMgr';
import * as regionMgr from './regionMgr';
import * as namespaceMgr from './namespaceMgr';

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

    //TODO
    /*        
    let eventActivator = vscode.workspace.onWillSaveTextDocument((event) => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document === event.document) {
            namespaceMgr.HandleOnSaveTextDocument(editor.document);
        }
    });    
    context.subscriptions.push(eventActivator);
    */
}

export function deactivate() {}
