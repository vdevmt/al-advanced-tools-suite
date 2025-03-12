import * as vscode from 'vscode';
import * as alFileMgr from '../alObject/alObjectFileMgr';
import * as namespaceMgr from '../alObject/alObjectNamespaceMgr';

var trackedUris: Set<vscode.Uri> = new Set();

//#region Diagnostics
export const DIAGNOSTIC_CODE = {
    NAMESPACE: {
        UNEXPECTED: "ATS100",
        MISSING: "ATS101",
        TOOLONG: "ATS102"
    }
};

export function diagnosticRulesEnabled(): Boolean {
    if (namespaceMgr.namespaceDiagnosticEnabled()) {
        return true;
    }

    return false;
}

export function CreateDiagnostic(range: vscode.Range, code: string, message: string): vscode.Diagnostic {
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


export async function subscribeToDocumentChanges(context: vscode.ExtensionContext, atsDiagnostics: vscode.DiagnosticCollection) {
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

        // Aggiorna warnings quando il documento viene chiuso
        context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((document) => {
            if (document) {
                refreshDiagnostics(document, atsDiagnostics);
            }
        }));

        // Elimina warnings dopo eliminazione del file
        context.subscriptions.push(vscode.workspace.onDidDeleteFiles((e) => {
            e.files.forEach(file => {
                atsDiagnostics.delete(file);
                trackedUris.delete(file);
            })
        }));

        // Aggiorna warnings dopo rename del file
        vscode.workspace.onDidRenameFiles((event) => {
            for (const file of event.files) {
                atsDiagnostics.delete(file.oldUri);
                trackedUris.delete(file.oldUri);
                refreshDiagnosticsByUri(file.newUri, atsDiagnostics);
            }
        });
    }
}

async function refreshDiagnosticsByUri(uri: vscode.Uri, atsDiagnostics: vscode.DiagnosticCollection) {
    const document = await vscode.workspace.openTextDocument(uri);
    if (document) {
        refreshDiagnostics(document, atsDiagnostics);
    }
}

async function refreshDiagnostics(document: vscode.TextDocument, atsDiagnostics: vscode.DiagnosticCollection) {
    atsDiagnostics.delete(document.uri);
    trackedUris.delete(document.uri);

    if (alFileMgr.isALObjectDocument(document)) {
        if (!namespaceMgr.ValidateObjectNamespace(document, atsDiagnostics)) {
            trackedUris.add(document.uri);
        }
    }

    cleanOrphanedDiagnostics(atsDiagnostics);
}

export async function ValidateAllFiles(atsDiagnostics: vscode.DiagnosticCollection) {
    if (diagnosticRulesEnabled()) {
        // Trova tutti i file AL nel workspace corrente
        const files = await vscode.workspace.findFiles('**/*.al');
        for (const file of files) {
            atsDiagnostics.delete(file);
            trackedUris.delete(file);

            // Verifica dichiarazione namespace
            const document = await vscode.workspace.openTextDocument(file);
            if (!namespaceMgr.ValidateObjectNamespace(document, atsDiagnostics)) {
                trackedUris.add(file);
            }
        }
    }
}

async function cleanOrphanedDiagnostics(atsDiagnostics: vscode.DiagnosticCollection) {
    for (const uri of trackedUris) {
        try {
            // Controlla se il file esiste
            let fileStat = await vscode.workspace.fs.stat(uri);
            if (!fileStat) {
                atsDiagnostics.delete(uri);
                trackedUris.delete(uri);
            }
        } catch (error) {
            atsDiagnostics.delete(uri);
            trackedUris.delete(uri);
        }
    }
}
//#endregion Diagnostics
