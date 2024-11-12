import * as vscode from 'vscode';

import { importLaunchFile } from './launchMgr'; 
import { exportLaunchJson } from './launchMgr';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('ats.importLaunchFile', importLaunchFile);
    let exportCommand = vscode.commands.registerCommand('ats.exportLaunchFile', exportLaunchJson);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
