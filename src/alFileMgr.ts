import * as vscode from 'vscode';
import * as path from 'path';


export function isALObjectFile(file: vscode.Uri): Boolean {
    if (file.fsPath.toLowerCase().endsWith('.al')) {         
        return true;
    }

    return false;
}
export function isALObjectDocument(document: vscode.TextDocument): Boolean {
    if (document.languageId === 'al'){
        return true;
    }

    return false;
}

export function getCurrentObjectNamespace(): string {
    const editor = vscode.window.activeTextEditor;

    // Verifica la presenza di un editor attivo
    if (editor) {
        if (isALObjectDocument(editor.document)) {
            return getObjectNamespace(editor.document);
        }
    }

    return "";
}

export function getObjectNamespace(document: vscode.TextDocument): string {
    let namespace = "";
    let firstObjectLinePos = getFirstNonEmptyObjectLinePos(document);

    if (firstObjectLinePos >= 0){
        const firstLine = document.lineAt(firstObjectLinePos);
        const namespaceRegex = /^\s*namespace\s+[\w.]+/; // Regex per individuare una dichiarazione namespace

        if (namespaceRegex.test(firstLine.text)) {
            namespace = firstLine.text.substring(10);
        }

        if (namespace.endsWith(";")){
            namespace = namespace.slice(0,-1);
        }
    }

    return namespace;
}

export function isFirstObjectLine(document: vscode.TextDocument, position: vscode.Position): boolean {
    let firstNonEmptyLinePosition = getFirstNonEmptyObjectLinePos(document);

    if (firstNonEmptyLinePosition >= 0){
        return (position.line === firstNonEmptyLinePosition);
    }

    return false;
}

export function getFirstNonEmptyObjectLinePos(document: vscode.TextDocument): number {
    for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text.trim();
        if (lineText !== '') {
            return i;
        }
    }

    return -1; // Documento vuoto
}

export function getRelativePath(file: vscode.Uri): string {
    let relativePath = file.fsPath;

    // Verifico se esiste un workspace aperto
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (workspaceFolders) {
        const workspacePath = workspaceFolders[0].uri.fsPath;
        if (workspacePath) {
            relativePath = path.relative(workspacePath, file.fsPath);
        }
    }

    relativePath = path.dirname(relativePath);  // Escludo il nome del file

    // Rimuovi il prefisso "src/" se presente
    if (relativePath.startsWith("src" + path.sep)) {
        relativePath = relativePath.substring(4);
    }

    return relativePath;
}