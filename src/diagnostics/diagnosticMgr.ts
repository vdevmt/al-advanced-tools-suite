import * as vscode from 'vscode';
import * as alFileMgr from '../fileMgt/alFileMgr';
import * as namespaceMgr from '../namespaces/namespaceMgr';

export const DIAGNOSTIC_CODE = {
    NAMESPACE: {
        UNEXPECTED: "ATS100",
        MISSING: "ATS101",
        TOOLONG: "ATS102"
    }
};

export function diagnosticRulesEnabled():Boolean {
    if (namespaceMgr.namespaceDiagnosticEnabled()){
        return true;
    }

    return false;
}

export function CreateDiagnostic(range: vscode.Range, code:string, message:string): vscode.Diagnostic {
    let severity: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Warning;

    switch (code) {
        case DIAGNOSTIC_CODE.NAMESPACE.MISSING:
            severity = vscode.DiagnosticSeverity.Error;
            break;        
    }

	const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = "ATS";
	diagnostic.code = code;

	return diagnostic;
}


export function subscribeToDocumentChanges(context: vscode.ExtensionContext, atsDiagnostics: vscode.DiagnosticCollection) {
    if (diagnosticRulesEnabled()) {
        if (vscode.window.activeTextEditor) {
            refreshDiagnostics(vscode.window.activeTextEditor.document, atsDiagnostics);
        }

        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    refreshDiagnostics(editor.document, atsDiagnostics);
                }
            })
        );   
        
        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, atsDiagnostics))
        );

        // context.subscriptions.push(
        //     vscode.workspace.onDidCloseTextDocument(doc => atsDiagnostics.delete(doc.uri))
        // );    
        }
}    

function refreshDiagnostics(document: vscode.TextDocument, atsDiagnostics: vscode.DiagnosticCollection) {
	const diagnostics: vscode.Diagnostic[] = [];

    if (alFileMgr.isALObjectDocument(document)) {
        namespaceMgr.ValidateObjectNamespace(document, atsDiagnostics);
    }

	atsDiagnostics.set(document.uri, diagnostics);    
}

export async function ValidateAllFiles(collection: vscode.DiagnosticCollection) {
    if (diagnosticRulesEnabled()) {
        // Trova tutti i file AL nel workspace corrente
        const files = await vscode.workspace.findFiles('**/*.al'); 
        for (const file of files) {
            // Verifica dichiarazione namespace
            const document = await vscode.workspace.openTextDocument(file);
            namespaceMgr.ValidateObjectNamespace(document, collection);
        }
    }
}