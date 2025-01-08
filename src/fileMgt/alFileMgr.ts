import * as vscode from 'vscode';
import * as path from 'path';
import { ALObject, ALObjectActions, ALObjectFields, ALObjectProcedures } from './alObject';

export function isALObjectFile(file: vscode.Uri, previewObjectAllowed: Boolean): Boolean {
    if (file.fsPath.toLowerCase().endsWith('.al')) {
        return true;
    }

    if (previewObjectAllowed) {
        if (file.fsPath.toLowerCase().endsWith('.dal')) {
            return true;
        }
    }

    return false;
}

export function isPreviewALObjectFile(file: vscode.Uri): Boolean {
    if (file.fsPath.toLowerCase().endsWith('.dal')) {
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
        alObject = new ALObject(document);
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
    const openEditors = vscode.window.tabGroups.all.flatMap(group => group.tabs);

    const items: QuickPickItem[] = [];

    for (const editor of openEditors) {
        try {
            const documentUri = (editor.input as any).uri;

            if (isALObjectFile(documentUri, true)) {
                const doc = await vscode.workspace.openTextDocument(documentUri);

                let alObject: ALObject;
                alObject = new ALObject(doc);
                let objectInfoText = makeALObjectDescriptionText(alObject);

                const isCurrentEditor = (doc.uri.toString() === activeUri);
                let iconName = isPreviewALObjectFile(documentUri) ? 'shield' : 'symbol-class';

                items.push({
                    label: `$(${iconName}) ${objectInfoText}`,
                    description: isCurrentEditor ? '$(eye)' : '',
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

//#region Object Properties
export function isProcedureDefinition(lineText: string, procedureInfo: { scope: string, name: string }): boolean {
    const regexExpr = /(local|internal)?\s*procedure\s+([a-zA-Z_][a-zA-Z0-9_]*)\(/i;

    const match = lineText.trim().match(regexExpr);
    if (match) {
        procedureInfo.scope = match[1] || 'global';
        procedureInfo.name = match[2];

        return true;
    }

    return false;
}

export function isTableFieldDefinition(lineText: string, fieldInfo: { id: number, name: string, type: string }): boolean {
    let regexExpr = /.*(field\((\d+); *"?([ a-zA-Z0-9._/&%\/()-]+)"?;(.*)\))/g;
    const match = lineText.trim().match(regexExpr);

    if (match) {
        try {
            regexExpr = /^field\((.*)\)$/i;

            let fieldDef = match[0].replace(regexExpr, '$1');  // Rimuove "field(" e ")"
            const fieldElements = fieldDef.split(';');

            fieldInfo.id = Number(fieldElements[0].trim()); // Primo gruppo: numero
            fieldInfo.name = fieldElements[1].trim(); // Secondo gruppo: Nome con o senza virgolette
            fieldInfo.type = fieldElements[2].trim(); // Terzo gruppo: Tipo

            return true;
        }
        catch {
            return false;
        }
    }

    return false;
}

export function isPageFieldDefinition(lineText: string, fieldInfo: { name: string, sourceExpr: string }): boolean {
    let regexExpr = /.*(field\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+(\[([1-9]\d*)\])?) *\))/g;
    const match = lineText.trim().match(regexExpr);

    if (match) {
        try {
            regexExpr = /^field\((.*)\)$/i;

            let fieldDef = match[0].replace(regexExpr, '$1');  // Rimuove "field(" e ")"
            const fieldElements = fieldDef.split(';');

            fieldInfo.name = fieldElements[0].trim();
            fieldInfo.sourceExpr = fieldElements[1].trim();

            return true;
        }
        catch {
            return false;
        }
    }

    return false;
}
export function isReportOrQueryFieldDefinition(lineText: string, fieldInfo: { name: string, sourceExpr: string }): boolean {
    let regexExpr = /.*(column\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+(\[([1-9]\d*)\])?) *\))/g;
    const match = lineText.trim().match(regexExpr);

    if (match) {
        try {
            regexExpr = /^column\((.*)\)$/i;

            let fieldDef = match[0].replace(regexExpr, '$1');  // Rimuove "field(" e ")"
            const fieldElements = fieldDef.split(';');

            fieldInfo.name = fieldElements[0].trim();
            fieldInfo.sourceExpr = fieldElements[1].trim();

            return true;
        }
        catch {
            return false;
        }
    }

    return false;
}

export function isActionAreaDefinition(lineText: string, actionAreaInfo: { name: string }): boolean {
    const regexExpr = /area\(\s*"?([^"\s]+)"?\s*\)/i;

    const match = lineText.trim().match(regexExpr);
    if (match) {
        actionAreaInfo.name = match[1] || 'actions';

        return true;
    }

    return false;
}
export function isActionDefinition(lineText: string, actionInfo: { name: string, sourceAction: string }): boolean {
    let regexExpr = /action\(\s*"?([^"\s]+)"?\s*\)/i;

    const match = lineText.trim().match(regexExpr);
    if (match) {
        actionInfo.name = match[1] || 'action';

        return true;
    }
    else {
        regexExpr = /actionref\(\s*"?([^"\s;]+)"?\s*;\s*"?([^"\s;]+)"?\s*\)/i;
        const match = lineText.trim().match(regexExpr);
        if (match) {
            actionInfo.name = match[1] || 'action';
            actionInfo.sourceAction = match[2] || '';

            return true;
        }
    }

    return false;
}

export function isCommentedLine(lineText: string): boolean {
    const regexExpr = /\/\/.*$/; // Commenti su singola riga (//)
    if (regexExpr.test(lineText.trim())) {
        return true;
    }
    return false;
}

export function isMultiLineCommentStart(lineText: string): boolean {
    const regexExpr = /\/\*/; // Inizio commento multi-linea (/*)
    if (regexExpr.test(lineText.trim())) {
        return true;
    }
    return false;
}
export function isMultiLineCommentEnd(lineText: string): boolean {
    const regexExpr = /\*\//;   // Fine commento multi-linea (*/)
    if (regexExpr.test(lineText.trim())) {
        return true;
    }
    return false;
}

export function isIntegrationEventDeclaration(lineText: string): boolean {
    const regexExpr = /^\s*\[IntegrationEvent\(/i;
    if (regexExpr.test(lineText.trim())) {
        return true;
    }
    return false;
}
export function isBusinessEventDeclaration(lineText: string): boolean {
    const regexExpr = /^\s*\[BusinessEvent\(/i;
    if (regexExpr.test(lineText.trim())) {
        return true;
    }
    return false;
}
export function isEventSubscriber(lineText: string, eventSubscrInfo: { objectType?: string, objectName?: string, eventName?: string, elementName?: string }): boolean {
    const regexExpr = /\[EventSubscriber\(\s*ObjectType::([^,]+),\s*([^:]+::"?[^,]+"?|[0-9]+),\s*'([^']+)',\s*'(.*?)',\s*(true|false),\s*(true|false)\s*\)\]/i;
    const match = lineText.trim().match(regexExpr);

    if (match) {
        eventSubscrInfo.objectType = match[1];
        if (eventSubscrInfo.objectType.toLowerCase() === 'table') {
            eventSubscrInfo.objectName = match[2].replace('Database::', '');
        }
        else {
            eventSubscrInfo.objectName = match[2].replace(`${eventSubscrInfo.objectType}::`, '');
        }

        eventSubscrInfo.eventName = match[3];
        eventSubscrInfo.elementName = match[4] || '';

        return true;
    }

    return false;
}

export async function showAllFields() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alObjectFields: ALObjectFields;
        alObjectFields = new ALObjectFields(alObject);
        if (alObjectFields.fields) {
            if (alObjectFields.elementsCount > 0) {
                const currentLine = editor.selection.active.line;

                let currentFieldStartLine: number;
                try {
                    const currentField = [...alObjectFields.fields]
                        .reverse()             // Inverte l'array
                        .find(item => item.startLine <= currentLine);  // Trova il primo che soddisfa la condizione
                    currentFieldStartLine = currentField.startLine;
                }
                catch {
                    currentFieldStartLine = 0;
                }

                const picked = await vscode.window.showQuickPick(alObjectFields.fields.map(item => ({
                    label: item.id > 0 ? `${item.id} $(${item.iconName}) ${item.name.replace('"', '')}` : `$(${item.iconName}) ${item.name.replace('"', '')}`,
                    description: (item.startLine === currentFieldStartLine) ? `${item.type} $(eye)` : item.type,
                    detail: '',
                    startLine: item.startLine
                })), {
                    placeHolder: 'Fields',
                    matchOnDescription: true,
                    matchOnDetail: false,
                });

                if (picked) {
                    const position = new vscode.Position(picked.startLine, 0);
                    const newSelection = new vscode.Selection(position, position);
                    editor.selection = newSelection;
                    editor.revealRange(new vscode.Range(position, position));
                }
            }
            else {
                vscode.window.showErrorMessage(`No fields found in ${alObject.objectType} ${alObject.objectName}`);
            }
        }
    }
}
export async function showAllProcedures() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alObjectProcedures: ALObjectProcedures;
        alObjectProcedures = new ALObjectProcedures(alObject);
        if (alObjectProcedures.procedures) {
            if (alObjectProcedures.elementsCount > 0) {
                const currentLine = editor.selection.active.line;

                let currentProcStartLine: number;
                try {
                    const currentProcedure = [...alObjectProcedures.procedures]
                        .reverse()             // Inverte l'array
                        .find(item => item.startLine <= currentLine);  // Trova il primo che soddisfa la condizione

                    currentProcStartLine = currentProcedure.startLine;
                }
                catch {
                    currentProcStartLine = 0;
                }

                const picked = await vscode.window.showQuickPick(alObjectProcedures.procedures.map(item => ({
                    label: `$(${item.iconName}) ${item.name}`,
                    description: (item.startLine === currentProcStartLine) ? `$(eye)` : '',
                    detail: (item.regionPath && item.sourceEvent) ? `Region: ${item.regionPath} | Event: ${item.sourceEvent}` :
                        (item.regionPath) ? `Region: ${item.regionPath}` :
                            (item.sourceEvent) ? `Event: ${item.sourceEvent}` : '',
                    startLine: item.startLine ? item.startLine : 0
                })), {
                    placeHolder: 'Procedure',
                    matchOnDescription: false,
                    matchOnDetail: true,
                });

                if (picked) {
                    const position = new vscode.Position(picked.startLine, 0);
                    const newSelection = new vscode.Selection(position, position);
                    editor.selection = newSelection;
                    editor.revealRange(new vscode.Range(position, position));
                }
            }
            else {
                vscode.window.showErrorMessage(`No procedure found in ${alObject.objectType} ${alObject.objectName}`);
            }
        }
    }
}
export async function showAllActions() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alObjectActions: ALObjectActions;
        alObjectActions = new ALObjectActions(alObject);
        if (alObjectActions.actions) {
            if (alObjectActions.elementsCount > 0) {
                const currentLine = editor.selection.active.line;

                let currentProcStartLine: number;
                try {
                    const currentProcedure = [...alObjectActions.actions]
                        .reverse()             // Inverte l'array
                        .find(item => item.startLine <= currentLine);  // Trova il primo che soddisfa la condizione

                    currentProcStartLine = currentProcedure.startLine;
                }
                catch {
                    currentProcStartLine = 0;
                }

                const picked = await vscode.window.showQuickPick(alObjectActions.actions.map(item => ({
                    label: `$(${item.iconName}) ${item.name}`,
                    description: (item.sourceAction && (item.startLine === currentProcStartLine)) ? `${item.sourceAction} $(eye)` :
                        item.sourceAction ? `${item.sourceAction}` :
                            (item.startLine === currentProcStartLine) ? `$(eye)` : '',
                    detail: item.area ? `Area: ${item.area}` : '',
                    startLine: item.startLine ? item.startLine : 0
                })), {
                    placeHolder: 'Actions',
                    matchOnDescription: true,
                    matchOnDetail: true,
                });

                if (picked) {
                    const position = new vscode.Position(picked.startLine, 0);
                    const newSelection = new vscode.Selection(position, position);
                    editor.selection = newSelection;
                    editor.revealRange(new vscode.Range(position, position));
                }
            }
            else {
                vscode.window.showErrorMessage(`No action found in ${alObject.objectType} ${alObject.objectName}`);
            }
        }
    }
}
//#endregion Object Properties

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
