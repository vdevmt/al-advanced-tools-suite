import * as vscode from 'vscode';
import * as path from 'path';


export async function setNamespaceByFilePath(){
    const editor = vscode.window.activeTextEditor;

    // Verifica la presenza di un editor attivo
    if (editor) {
        if (isALObject(editor.document.uri)) {
            const namespace = makeNamespaceByCurrentFilePath();
            if (namespace) {
                setObjectNamespace(editor.document,namespace);
            }
        }
    }
}

function isALObject(file: vscode.Uri): Boolean {
    if (file.fsPath.toLowerCase().endsWith('.al')) {         
        return true;
    }

    return false;
}

async function setObjectNamespace(document: vscode.TextDocument,namespace: string) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        if (namespace) {
            const firstLine = document.lineAt(0); // La prima riga del file
            const namespaceRegex = /^\s*namespace\s+[\w.]+/; // Regex per individuare una dichiarazione namespace

            await editor.edit(editBuilder => {
                if (namespaceRegex.test(firstLine.text)) {
                    // Sostituisce la dichiarazione esistente
                    const range = new vscode.Range(firstLine.range.start, firstLine.range.end);
                    editBuilder.replace(range, `namespace ${namespace};`);
                } else {
                    // Inserisce una nuova dichiarazione sulla prima riga
                    editBuilder.insert(firstLine.range.start, `namespace ${namespace};\n`);
                }
            });
        }
    }
}

function makeNamespaceByCurrentFilePath(): string| undefined  {
    const editor = vscode.window.activeTextEditor;    

    // Verifica la presenza di un editor attivo
    if (editor) {                
        let currentfile = editor.document.uri;

        if (isALObject(currentfile)) {
            return getNamespaceFromPath(currentfile);
        }
    }

    return undefined;
}

function getNamespaceFromPath(file: vscode.Uri): string {
    let rootNamespace = getDefaultRootNamespace();     

    // Verifico se esiste un workspace aperto
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace is open.");
        return "";
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    if (!workspacePath) {
        if (rootNamespace){
            return rootNamespace;
        }
        else {
            return "";
        }
    }

    let relativePath = path.relative(workspacePath, file.fsPath);
    relativePath = path.dirname(relativePath);  // Escludo il nome del file

    // Rimuovi il prefisso "src/" se presente
    if (relativePath.startsWith("src" + path.sep)) {
        relativePath = relativePath.substring(4);
    }

    let namespace = relativePath
        .replace(/\\/g, ".")
        .replace(/\//g, ".")
        .replace(/\.al$/, "");
    
    if (rootNamespace) {
        if (!namespace.startsWith(rootNamespace)){
            namespace = rootNamespace + '.' + namespace;
        }
    }
    
    return truncateNamespace(namespace,0);
}

function getDefaultRootNamespace(): string | undefined {
    // Leggi la configurazione del linguaggio AL
    const config = vscode.workspace.getConfiguration('al');
    // Ottieni il valore di rootNamespace
    return config.get<string>('rootNamespace');
}

function truncateNamespace(namespace: string, maxPositions:number): string {
    if (maxPositions <= 0) {
        maxPositions = 4;
    } 

    // Divido la stringa per "."
    const parts = namespace.split('.'); 

    // Ricostruisco la stringa con le sole prime n posizioni
    return parts.slice(0, maxPositions).join('.');
}

export class NamespaceCompletionProvider {
    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        if (isALObject(document.uri)) {
            if (isFirstObjectLine(document,position)){
                const line = document.lineAt(position.line).text;
                
                if (line.trim().startsWith('namespace')) {           
                    const items: vscode.CompletionItem[] = [];

                    let NamespaceValue = makeNamespaceByCurrentFilePath();

                    if (NamespaceValue) {                   
                        const config = vscode.workspace.getConfiguration('ATS');           
                        let useObjectFilePathAsNamespace = config.get<boolean>('UseObjectFilePathAsNamespace', false);           
            
                        if (useObjectFilePathAsNamespace){
                            addCompletionItem(items,NamespaceValue,NamespaceValue,'ATS: Namespace by current file path','1');
                        }
                    }

                    NamespaceValue = getDefaultRootNamespace();
                    if (NamespaceValue) {
                        addCompletionItem(items,NamespaceValue,NamespaceValue,'ATS: Default root namespace','2');
                    }

                    addDefaultCompletionItems(items);
                    return items;
                }
            }
        }
    }
}    

function addCompletionItem(items: vscode.CompletionItem[], label: string, insertText: string, detail: string,sortText: string){
    const completionItem = new vscode.CompletionItem(label);
    completionItem.insertText = insertText;
    completionItem.detail = detail;
    completionItem.kind = vscode.CompletionItemKind.Constant;
    completionItem.sortText = sortText;
    items.push(completionItem);
}

function addDefaultCompletionItems(items: vscode.CompletionItem[]) {
    const config = vscode.workspace.getConfiguration('ATS');           
    let DefaultNamespaces = config.get<string[]>('DefaultNamespaces');       
    
    if ((DefaultNamespaces) && (DefaultNamespaces.length > 0)) {
        for (let i=0; i<DefaultNamespaces.length; i++) {
            addCompletionItem(items,DefaultNamespaces[i],DefaultNamespaces[i],'ATS: Default namespace','3');
        }
    }    
}

function isFirstObjectLine(document: vscode.TextDocument, position: vscode.Position): boolean {
    let firstNonEmptyLinePosition = getFirstNonEmptyObjectLinePosition(document);

    if (firstNonEmptyLinePosition >= 0){
        return (position.line === firstNonEmptyLinePosition);
    }

    return false;
}

function getFirstNonEmptyObjectLinePosition(document: vscode.TextDocument):number {
    for (let i = 0; i < document.lineCount; i++) {
        const lineText = document.lineAt(i).text.trim();
        if (lineText !== '') {
            return i;
        }
    }

    return -1; // Documento vuoto
}
