import * as vscode from 'vscode';
import * as path from 'path';
import { ALObject } from './alObject';

export function isALObjectFile(file: vscode.Uri): Boolean {
    if (file.fsPath.toLowerCase().endsWith('.al')) {
        return true;
    }

    return false;
}
export function isALObjectDocument(document: vscode.TextDocument): Boolean {
    if (document.languageId === 'al') {
        return true;
    }

    return false;
}

export function IsPreviewALObject(document: vscode.TextDocument): Boolean {
    if (document.fileName.toLowerCase().endsWith('.dal')) {
        return true;
    }

    return false;
}

export function getCurrentObjectNamespace(): string {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
        if (isALObjectDocument(editor.document)) {
            return getObjectNamespace(editor.document);
        }
    }

    return "";
}

export function getObjectNamespace(document: vscode.TextDocument): string {
    if (isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document.getText(), document.fileName);
        return alObject.objectNamespace;
    }

    return "";
}

export function isFirstObjectLine(document: vscode.TextDocument, position: vscode.Position): boolean {
    let firstNonEmptyLinePosition = getFirstNonEmptyObjectLinePos(document);

    if (firstNonEmptyLinePosition >= 0) {
        return (position.line === firstNonEmptyLinePosition);
    }

    return false;
}

export function getFirstNonEmptyObjectLinePos(document: vscode.TextDocument): number {
    // Regex per trovare commenti di riga e multi-linea
    const singleLineCommentRegex = /\/\/.*/;
    const multiLineCommentStartRegex = /\/\*/;
    const multiLineCommentEndRegex = /\*\//;

    let inMultiLineComment = false;
    const lines = document.getText().split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (inMultiLineComment) {
            // Verifico se si tratta di una riga di fine commento multi-riga
            if (multiLineCommentEndRegex.test(line)) {
                // Fine commento multi-linea
                inMultiLineComment = false;
            }
            continue;  // Escludo la riga corrente
        }

        // Verifico se si tratta di una riga commentata
        if (singleLineCommentRegex.test(line)) {
            continue;  // Escludo la riga corrente
        }

        // Verifico se si tratta di una riga di inizio commento multi-riga
        if (multiLineCommentStartRegex.test(line)) {
            inMultiLineComment = true;
            continue;  // Escludo la riga corrente
        }

        // Verifico se la riga contiene dati
        if (line !== '') {
            return i;
        }
    }

    return -1; // Documento vuoto
}

export function getRelativePath(file: vscode.Uri, excludeSrcFolder: boolean): string {
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

    if (excludeSrcFolder) {
        // Rimuovi il prefisso "src/" se presente
        if (relativePath === "src") {
            relativePath = '';
        }
        else {
            if (relativePath.startsWith("src" + path.sep)) {
                relativePath = relativePath.substring(4);
            }
        }
    }

    return relativePath;
}

export function cleanObjectFileContent(objectContentText: string): string {
    var newObjectTxt = objectContentText;

    // Remove comments between /* and */
    var patternIgnoreRange = new RegExp('/\\*.*?\\*/', 'gs');
    newObjectTxt = newObjectTxt.replace(patternIgnoreRange, "");

    // Get all lines excluding commented and empty lines
    var lines = newObjectTxt.split('\n');
    var filteredlines = lines.filter(function (line) {
        return line.trim() !== '' && line.trimStart().indexOf('//') !== 0;
    });

    newObjectTxt = filteredlines.toString();

    return newObjectTxt;
}

export function IsValidALObjectType(objectType: string): boolean {
    switch (objectType.toLowerCase()) {
        case 'codeunit':
        case 'page':
        case 'pagecustomization':
        case 'pageextension':
        case 'reportextension':
        case 'profile':
        case 'query':
        case 'report':
        case 'requestpage':
        case 'table':
        case 'tableextension':
        case 'xmlport':
        case 'enum':
        case 'enumextension':
        case 'controladdin':
        case 'interface':
        case 'permissionset':
        case 'permissionsetextension':
        case 'entitlement':
            return true;
        default: return false;
    }
}

export function isValidObjectToRun(alObject: ALObject): Boolean {
    if (alObject) {
        if (Number(alObject.objectId) > 0) {
            const validObjectTypes: Set<string> = new Set(["table", "page", "report", "xmlport", "query"]);
            return (validObjectTypes.has(alObject.objectType.toLowerCase()));
        }
    }

    return false;
}

export function capitalizeObjectType(objectType: string): string {
    if (objectType) {
        if (objectType === 'tableextension') {
            return 'TableExtension';
        }
        if (objectType === 'pageextension') {
            return 'PageExtension';
        }
        if (objectType === 'reportextension') {
            return 'ReportExtension';
        }

        return objectType.charAt(0).toUpperCase() + objectType.slice(1).toLowerCase();
    }

    return '';
}

export function addQuotesIfNeeded(text: string): string {
    if (text.includes(" ")) {
        return `"${text}"`;
    }

    return text;
}

export function makeALObjectDescriptionText(alObject: ALObject) {
    if (alObject) {
        return `${capitalizeObjectType(alObject.objectType)} ${alObject.objectId} ${addQuotesIfNeeded(alObject.objectName)}`;
    }

    return '';
}

export async function showOpenALObjects() {
    const textDocuments = vscode.workspace.textDocuments;
    const activeEditor = vscode.window.activeTextEditor;
    const activeUri = activeEditor?.document.uri.toString();

    // Recupera i tab aperti
    const openEditors = vscode.window.tabGroups.all
        .flatMap(group => group.tabs)
        .filter(tab => tab.input && (tab.input as any).uri)
        .map(tab => vscode.Uri.parse((tab.input as any).uri).fsPath)
        .filter(filePath => {
            const ext = path.extname(filePath);
            return ext === '.al' || ext === '.dal'; // Filtra i file con estensione .al o .dal
        });

    const items: QuickPickItem[] = [];

    for (const editor of openEditors) {
        try {
            const doc = await vscode.workspace.openTextDocument(editor);

            if (isALObjectFile(doc.uri)) {
                let alObject: ALObject;
                alObject = new ALObject(doc.getText(), doc.fileName);
                let objectInfoText = makeALObjectDescriptionText(alObject);

                const isCurrentEditor = (doc.uri.toString() === activeUri);

                items.push({
                    label: isCurrentEditor ? `🌟 ${objectInfoText}` : objectInfoText,
                    description: isCurrentEditor ? 'current editor' : '',
                    detail: vscode.workspace.asRelativePath(doc.uri),
                    sortKey: objectSortKey(alObject, isCurrentEditor),
                    uri: doc.uri
                });
            }
        } catch (err) {
            console.log(`Unable to read file: ${editor}`, err);
        }
    }

    items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Show object list
    const picked = await vscode.window.showQuickPick(items.map(item => ({
        label: item.label,
        description: item.description,
        detail: item.detail,
        uri: item.uri,
    })), {
        placeHolder: 'Select a file to open',
        matchOnDescription: true,
        matchOnDetail: true,
    });

    if (picked) {
        // Open selected
        vscode.window.showTextDocument(picked.uri);
    }
}

function objectSortKey(alObject: ALObject, isCurrentEditor: boolean): string {
    let objPriority: number = 9999;

    if (alObject) {
        if (isCurrentEditor) {
            objPriority = 10;
        }
        else {
            switch (alObject.objectType) {
                case 'table':
                    objPriority = 20;
                    break;

                case 'tableextension':
                    objPriority = 21;
                    break;

                case 'codeunit':
                    objPriority = 30;
                    break;

                case 'page':
                    objPriority = 40;
                    break;

                case 'pageextension':
                    objPriority = 41;
                    break;

                case 'report':
                    objPriority = 50;
                    break;

                case 'reportextension':
                    objPriority = 51;
                    break;
            }
        }

        return `${objPriority.toString().padStart(4, '0')}_${alObject.objectType}_${alObject.objectName}`;
    }

    return `${objPriority.toString().padStart(4, '0')}`;
}

//#region Interfaces
interface QuickPickItem {
    label: string;
    description?: string;
    detail?: string;
    sortKey?: string;
    uri?: vscode.Uri;
    alObject?: ALObject;
}

//#endregion Interfaces