import * as vscode from 'vscode';
import * as alFileMgr from './alFileMgr';
import {ATSSettings} from './settings/atsSettings';
import {ALSettings} from './settings/alSettings';

export async function setNamespaceByFilePath(){
    const editor = vscode.window.activeTextEditor;

    // Verifica la presenza di un editor attivo
    if (editor) {
        if (alFileMgr.isALObject(editor.document.uri)) {
            const namespace = makeNamespaceByCurrentFilePath();
            if (namespace) {
                setObjectNamespace(editor.document,namespace);
            }
        }
    }
}

async function setObjectNamespace(document: vscode.TextDocument,namespace: string) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        if (namespace) {
            let currentNamespace = alFileMgr.getObjectNamespace(document);
            if (currentNamespace !== namespace) {
                
                let firstLinePos = alFileMgr.getFirstNonEmptyObjectLinePos(document);
                if (firstLinePos < 0) {
                    firstLinePos = 0;
                }

                const firstLine = document.lineAt(firstLinePos); // La prima riga del file

                await editor.edit(editBuilder => {
                    if (currentNamespace){
                        // Sostituisce la dichiarazione esistente
                        const range = new vscode.Range(firstLine.range.start, firstLine.range.end);
                        editBuilder.replace(range, `namespace ${namespace};`);
                    }
                    else{
                        // Inserisce una nuova dichiarazione sulla prima riga
                        editBuilder.insert(firstLine.range.start, `namespace ${namespace};\n`);
                    }
                });
            }
        }
    }
}

function makeNamespaceByCurrentFilePath(): string | undefined {
    const editor = vscode.window.activeTextEditor;    
    let namespace = "";

    // Verifica la presenza di un editor attivo
    if (editor) {                
        let currentfile = editor.document.uri;

        if (alFileMgr.isALObject(currentfile)) {
            namespace = getNamespaceFromPath(currentfile);            
        }
    }

    return namespace;
}

function getNamespaceFromPath(file: vscode.Uri): string {
    let rootNamespace = getDefaultRootNamespace();     
    let relativePath = alFileMgr.getRelativePath(file);

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
    const alSettings = ALSettings.GetConfigSettings(null);
    return alSettings[ALSettings.rootNamespace];    
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


function collectDefaultNamespaces(): atsNameSpace[]{
    let defaultNamespaces: atsNameSpace[] = [];
    let atsNamespace: atsNameSpace = {};

    const atsSettings = ATSSettings.GetConfigSettings(null);
    let useObjectFilePathAsNamespace = atsSettings[ATSSettings.UseObjectFilePathAsNamespace];

    if (useObjectFilePathAsNamespace){
        atsNamespace = {};
        atsNamespace.value = makeNamespaceByCurrentFilePath(); 
        if (atsNamespace.value){
            atsNamespace.description = 'ATS: Namespace by current file path';
            atsNamespace.priority = 1;
            defaultNamespaces.push(atsNamespace);
        }
    }    

    atsNamespace = {};
    atsNamespace.value = getDefaultRootNamespace();
    if (atsNamespace.value){
        atsNamespace.description = 'ATS: Default root namespace';
        atsNamespace.priority = 2;
        defaultNamespaces.push(atsNamespace);        
    }

    let DefaultNamespaces = atsSettings[ATSSettings.DefaultNamespaces];
    
    if ((DefaultNamespaces) && (DefaultNamespaces.length > 0)) {
        for (let i=0; i<DefaultNamespaces.length; i++) {
            atsNamespace = {};
            atsNamespace.value = DefaultNamespaces[i];
            if (atsNamespace.value){
                atsNamespace.description = 'ATS: Default namespace';
                atsNamespace.priority = 3;
                defaultNamespaces.push(atsNamespace);        
            }
        }
    }        

    return defaultNamespaces;
}

export class NamespaceCompletionProvider {
    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        if (alFileMgr.isALObject(document.uri)) {
            if (alFileMgr.isFirstObjectLine(document,position)){
                const line = document.lineAt(position.line).text;
                
                if (line.trim().startsWith('namespace')) {           
                    const items: vscode.CompletionItem[] = [];

                    let defaultNamespaces = collectDefaultNamespaces();
                    if ((defaultNamespaces) && (defaultNamespaces.length > 0)) {
                        for (let i=0; i<defaultNamespaces.length; i++) {
                            addNamespaceToCompletionItems(defaultNamespaces[i],items);
                        }
                    }

                    return items;
                }
            }
        }
    }
}    

function addNamespaceToCompletionItems(namespace: atsNameSpace,items: vscode.CompletionItem[],){
    const completionItem = new vscode.CompletionItem(namespace.value);
    completionItem.insertText = namespace.value;
    completionItem.detail = namespace.description;
    completionItem.kind = vscode.CompletionItemKind.Constant;
    completionItem.sortText = namespace.priority.toString().padStart(5, '0');;
    items.push(completionItem);
}

interface atsNameSpace {
    value?: string;
    description?: string; 
    priority?: number; 
}
