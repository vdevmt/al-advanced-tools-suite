import * as vscode from 'vscode';
import * as alFileMgr from './alFileMgr';
import {CreateDiagnostic, DIAGNOSTIC_CODE } from './diagnosticMgr';
import {ATSSettings} from './settings/atsSettings';
import {ALSettings} from './settings/alSettings';

export async function setNamespaceByFilePath(){
    const editor = vscode.window.activeTextEditor;

    // Verifica la presenza di un editor attivo
    if (editor) {
        if (alFileMgr.isALObjectDocument(editor.document)) {
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
                const document = editor.document;
                const text = document.getText();

                // Regex per trovare un namespace con o senza punto e virgola
                const namespaceRegex = /namespace\s+([A-Za-z0-9_.]+)\s*;?/i;

                // Verifica se esiste un namespace
                const match = namespaceRegex.exec(text);

                editor.edit(editBuilder => {
                    if (match) {
                        // Sostituisci il namespace esistente
                        const start = document.positionAt(match.index);
                        const end = document.positionAt(match.index + match[0].length);
                        const range = new vscode.Range(start, end);
            
                        editBuilder.replace(range, `namespace ${namespace};`);
                    } else {
                        // Aggiungi il namespace all'inizio del file
                        const position = document.positionAt(0);
                        editBuilder.insert(position, `namespace ${namespace};\n\n`);
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
        if (alFileMgr.isALObjectDocument(editor.document)) {
            namespace = getNamespaceFromPath(editor.document.uri);            
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

    const atsSettings = ATSSettings.GetConfigSettings(null);
    const MaxNamespaceSize = atsSettings[ATSSettings.MaxNamespaceSize];
    return truncateNamespace(namespace,MaxNamespaceSize);
}

function getDefaultRootNamespace(): string | undefined {
    const alSettings = ALSettings.GetConfigSettings(null);
    return alSettings[ALSettings.rootNamespace];    
}

function truncateNamespace(namespace: string, maxPositions:number): string {   
    if (maxPositions <= 0) {
        maxPositions = 5;
    } 

    // Divido la stringa per "."
    const parts = namespace.split('.'); 

    // Ricostruisco la stringa con le sole prime n posizioni
    return parts.slice(0, maxPositions).join('.');
}


function collectDefaultNamespaces(currDocument: vscode.TextDocument): atsNameSpace[]{
    let defaultNamespaces: atsNameSpace[] = [];
    let atsNamespace: atsNameSpace = {};

    const atsSettings = ATSSettings.GetConfigSettings(null);
    let useObjectFilePathAsNamespace = atsSettings[ATSSettings.UseObjectFilePathAsNamespace];

    if (useObjectFilePathAsNamespace){
        atsNamespace = {};
        atsNamespace.value = getNamespaceFromPath(currDocument.uri);            
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
        if (alFileMgr.isALObjectDocument(document)) {
            if (alFileMgr.isFirstObjectLine(document,position)){
                const line = document.lineAt(position.line).text;
                
                if (line.trim().startsWith('namespace')) {           
                    const items: vscode.CompletionItem[] = [];

                    let defaultNamespaces = collectDefaultNamespaces(document);
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


function collectExpectedNamespacesForDoc(currDocument: vscode.TextDocument) : string[] {
    let expectedNamespaces: string[] = [];
    let defaultNamespaces = collectDefaultNamespaces(currDocument);

    if ((defaultNamespaces) && (defaultNamespaces.length > 0)) {
        for (let i=0; i<defaultNamespaces.length; i++) {
            expectedNamespaces.push(defaultNamespaces[i].value);
        }
    }

    return expectedNamespaces;
}

export function namespaceDiagnosticEnabled():Boolean {
    const atsSettings = ATSSettings.GetConfigSettings(null);

    if (atsSettings){ 
        return atsSettings[ATSSettings.EnableNamespaceDiagnostics];
    }
    else {
        return false;
    }
}

export async function ValidateObjectNamespace(document: vscode.TextDocument, collection: vscode.DiagnosticCollection ) {
    if (namespaceDiagnosticEnabled()){
        if (alFileMgr.isALObjectDocument(document)) {
            const atsSettings = ATSSettings.GetConfigSettings(null);
            const diagnostics: vscode.Diagnostic[] = [];

            // Verifico se per l'oggetto è stato dichiarato un Namespace
            const objectNamespace = alFileMgr.getObjectNamespace(document);        
            const nsDeclarationLineNo = alFileMgr.getFirstNonEmptyObjectLinePos(document);

            if (objectNamespace){
                // Ricerca Namespace abilitati per il progetto corrente
                const expectedNamespaces = collectExpectedNamespacesForDoc(document);

                if ((expectedNamespaces) && (expectedNamespaces.length > 0)) {
                    // Verifico se il Namespace dell'oggetto è incluso tra i valori abilitati
                    const found = expectedNamespaces.find(item => item.toLowerCase() === objectNamespace.toLowerCase());
                    if (!found) {
                        // Attivazione warning per Namespace non previsto
                        const range = new vscode.Range(nsDeclarationLineNo, 10, 0, 10 + objectNamespace.length);
                        const message = `The namespace "${objectNamespace}" is not valid. Use one of the following: ${expectedNamespaces.join(', ')}.`;
                        const diagnostic = CreateDiagnostic(range,DIAGNOSTIC_CODE.NAMESPACE.UNEXPECTED,message);
                        diagnostics.push(diagnostic);
                    }
                    
                    const maxNamespaceSize = atsSettings[ATSSettings.MaxNamespaceSize];
                    const nsParts = objectNamespace.split('.'); 
                    if (nsParts.length > maxNamespaceSize) {
                        // Attivazione warning per Namespace non previsto
                        const range = new vscode.Range(nsDeclarationLineNo, 10, 0, 10 + objectNamespace.length);
                        const message = `The namespace "${objectNamespace}" is not valid because it exceeds the maximum namespace size allowed for this project (max elements = ${maxNamespaceSize}).`;
                        const diagnostic = CreateDiagnostic(range,DIAGNOSTIC_CODE.NAMESPACE.TOOLONG,message);
                        diagnostics.push(diagnostic);
                    }
                }    
            }
            else{
                // Attivazione warning per Namespace non dichiarato
                if (atsSettings[ATSSettings.NamespaceMandatory]) {
                    const range = new vscode.Range(nsDeclarationLineNo, 0, 0, 0);
                    const message = `Missing namespace declaration.`;
                    const diagnostic = CreateDiagnostic(range,DIAGNOSTIC_CODE.NAMESPACE.MISSING,message);
                    diagnostics.push(diagnostic);
                }                
            }

            collection.set(document.uri, diagnostics);
        }        
    }
}

interface atsNameSpace {
    value?: string;
    description?: string; 
    priority?: number; 
}
