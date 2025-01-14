import * as vscode from 'vscode';
import * as path from 'path';
import * as regExpr from '../regExpressions';
import { ALObject } from './alObject';

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

export function addQuotesIfNeeded(text: string): string {
    if (text.includes(" ")) {
        return `"${text}"`;
    }

    return text;
}

export function makeALObjectDescriptionText(alObject: ALObject) {
    if (alObject) {
        return `${alObject.objectTypeCamelCase()} ${alObject.objectId} ${addQuotesIfNeeded(alObject.objectName)}`;
    }

    return '';
}

//#region Object Properties
export function isProcedureDefinition(alObject: ALObject, lineText: string, procedureInfo: { scope: string, name: string }): boolean {
    const match = lineText.trim().match(regExpr.procedure);
    if (match) {
        procedureInfo.scope = match[1] || 'global';
        procedureInfo.name = match[2];

        return true;
    }
    else {
        switch (true) {
            case (alObject.isTable() || alObject.isTableExt()):
                {
                    const match = lineText.trim().match(regExpr.tableTrigger);
                    if (match) {
                        procedureInfo.scope = 'trigger';
                        procedureInfo.name = match[1];

                        return true;
                    }
                    break;
                }
            case (alObject.isPage() || alObject.isPageExt()):
                {
                    const match = lineText.trim().match(regExpr.pageTrigger);
                    if (match) {
                        procedureInfo.scope = 'trigger';
                        procedureInfo.name = match[1];

                        return true;
                    }
                    break;
                }
            case (alObject.isReport()):
                {
                    const match = lineText.trim().match(regExpr.reportTrigger);
                    if (match) {
                        procedureInfo.scope = 'trigger';
                        procedureInfo.name = match[1];

                        return true;
                    }
                    break;
                }
            case (alObject.isCodeunit()):
                {
                    const match = lineText.trim().match(regExpr.codeunitTrigger);
                    if (match) {
                        procedureInfo.scope = 'trigger';
                        procedureInfo.name = match[1];

                        return true;
                    }
                    break;
                }
            case (alObject.isQuery()):
                {
                    const match = lineText.trim().match(regExpr.queryTrigger);
                    if (match) {
                        procedureInfo.scope = 'trigger';
                        procedureInfo.name = match[1];

                        return true;
                    }
                    break;
                }
        }
    }

    return false;
}

export function isTableFieldDefinition(lineText: string, fieldInfo: { id: number, name: string, type: string }): boolean {
    const match = lineText.trim().match(regExpr.tableField);
    if (match) {
        fieldInfo.id = Number(match[1].trim()); // Primo gruppo: numero
        fieldInfo.name = match[2].trim(); // Secondo gruppo: Nome con o senza virgolette
        fieldInfo.type = match[3].trim(); // Terzo gruppo: Tipo

        return true;
    }

    return false;
}

export function isTableKeyDefinition(lineText: string, keyInfo: { name: string, fieldsList: string }): boolean {
    const match = lineText.trim().match(regExpr.tableKey);
    if (match) {
        keyInfo.name = match[1] || '';
        keyInfo.fieldsList = match[2] || '';

        return true;
    }

    return false;
}

export function isPageFieldDefinition(lineText: string, fieldInfo: { name: string, sourceExpr: string }): boolean {
    const match = lineText.trim().match(regExpr.pageField);
    if (match) {
        fieldInfo.name = match[1] || 'Field';
        fieldInfo.sourceExpr = match[2] || '';

        return true;
    }

    return false;
}

export function isReportColumnDefinition(lineText: string, fieldInfo: { name: string, sourceExpr: string }): boolean {
    const match = lineText.trim().match(regExpr.reportColumn);
    if (match) {
        fieldInfo.name = match[1] || 'Column';
        fieldInfo.sourceExpr = match[2] || '';

        return true;
    }

    return false;
}
export function isReportReqPageFieldDefinition(lineText: string, fieldInfo: { name: string, sourceExpr: string }): boolean {
    const match = lineText.trim().match(regExpr.reportReqPageField);
    if (match) {
        fieldInfo.name = match[1] || 'Field';
        fieldInfo.sourceExpr = match[2] || '';

        return true;
    }

    return false;
}

export function isReportDataItemDefinition(lineText: string, dataItemInfo: { name: string, sourceExpr: string }): boolean {
    const match = lineText.trim().match(regExpr.reportDataItem);
    if (match) {
        dataItemInfo.name = match[1] || '';
        dataItemInfo.sourceExpr = match[2] || '';

        return true;
    }

    return false;
}

export function isQueryColumnDefinition(lineText: string, fieldInfo: { name: string, sourceExpr: string }): boolean {
    const match = lineText.trim().match(regExpr.queryColumn);
    if (match) {
        fieldInfo.name = match[2] || 'Column';
        fieldInfo.sourceExpr = match[3] || '';

        return true;
    }

    return false;
}

export function isActionAreaDefinition(lineText: string, actionAreaInfo: { name: string }): boolean {
    const match = lineText.trim().match(regExpr.pageActionArea);
    if (match) {
        actionAreaInfo.name = match[1] || 'actions';

        return true;
    }

    return false;
}
export function isActionDefinition(lineText: string, actionInfo: { name: string, sourceAction: string }): boolean {
    const match = lineText.trim().match(regExpr.pageAction);
    if (match) {
        actionInfo.name = match[1] || 'action';

        return true;
    }
    else {
        const match = lineText.trim().match(regExpr.pageActionRef);
        if (match) {
            actionInfo.name = match[1] || 'action';
            actionInfo.sourceAction = match[2] || '';

            return true;
        }
    }

    return false;
}

export function isCommentedLine(lineText: string): boolean {
    if (regExpr.singleLineComment.test(lineText.trim())) {
        return true;
    }
    return false;
}

export function isMultiLineCommentStart(lineText: string): boolean {
    if (regExpr.multiLineCommentStart.test(lineText.trim())) {
        return true;
    }
    return false;
}
export function isMultiLineCommentEnd(lineText: string): boolean {
    if (regExpr.multiLineCommentEnd.test(lineText.trim())) {
        return true;
    }
    return false;
}

export function isIntegrationEventDeclaration(lineText: string): boolean {
    if (regExpr.integrationEventDef.test(lineText.trim())) {
        return true;
    }
    return false;
}
export function isBusinessEventDeclaration(lineText: string): boolean {
    if (regExpr.businessEventDef.test(lineText.trim())) {
        return true;
    }
    return false;
}
export function isEventSubscriber(lineText: string, eventSubscrInfo: { objectType?: string, objectName?: string, eventName?: string, elementName?: string }): boolean {
    const match = lineText.trim().match(regExpr.eventSubscriber);

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
//#endregion Object Properties

//#region Interfaces
export interface QuickPickItem {
    label: string;
    description?: string;
    detail?: string;
    sortKey?: string;
    uri?: vscode.Uri;
    alObject?: ALObject;
    iconName?: string;
    level?: number;
    startLine?: number;
    endLine?: number;
}
//#endregion Interfaces
