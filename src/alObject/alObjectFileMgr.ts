import * as vscode from 'vscode';
import * as path from 'path';
import * as regExpr from '../regExpressions';
import * as alRegionMgr from '../regions/regionMgr';
import { ALObject, ALObjectDataItems, ALObjectFields, ALTableFieldGroups, ALTableKeys, ALObjectRegions, ALObjectProcedures, ALObjectActions } from './alObject';

//#region AL Object file tools
export function isALObjectFile(file: vscode.Uri, previewObjectAllowed: boolean): boolean {
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

export function isPreviewALObjectFile(file: vscode.Uri): boolean {
    if (file.fsPath.toLowerCase().endsWith('.dal')) {
        return true;
    }

    return false;
}

export function isALObjectDocument(document: vscode.TextDocument): boolean {
    if (document.languageId === 'al') {
        return true;
    }

    return false;
}

export function IsPreviewALObject(document: vscode.TextDocument): boolean {
    if (document.fileName.toLowerCase().endsWith('.dal')) {
        return true;
    }

    return false;
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
//#endregion AL Object file tools

//#region Namespace tools
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
//#endregion Namespace tools

//#region Object Name tools
export function makeALObjectDescriptionText(alObject: ALObject) {
    if (alObject) {
        return `${alObject.objectTypeCamelCase()} ${alObject.objectId} ${addQuotesIfNeeded(alObject.objectName)}`;
    }

    return '';
}

export function addQuotesIfNeeded(text: string): string {
    if (text) {
        if (!text.startsWith('"')) {
            const specialChars = /[ #&%\\\/()$;,]/;

            // Verifica se il testo contiene spazi o caratteri speciali
            if (/\s/.test(text) || specialChars.test(text)) {
                return `"${text}"`;
            }
        }
    }

    return text;
}
//#endregion Object Name tools

//#region Object Structure Mgt.
function extractCodeSection(sectionName: string, ojectFileContent: string, removeComments: boolean, sectionInfo: { startLine: number, content: string }): boolean {
    const sectionRegExpr = new RegExp(`${sectionName}\\s*\\{`, 'i');
    const keysSectionMatch = ojectFileContent.match(sectionRegExpr);
    if (keysSectionMatch) {
        // Partiamo dal punto di inizio della sezione individuata
        let start = keysSectionMatch.index!;
        let openBraces = 0;  // Contatore delle parentesi graffe
        let end = start;
        let sectionText = '';

        // Determinazione del nr di riga nel documento
        let objectLines: string[] = ojectFileContent.split('\n');
        objectLines = objectLines.map(line => line.trim().toLowerCase());

        const searchText = keysSectionMatch[0].split('\n')[0].replace('\r', '');  // Rimuove il carriage return \r
        sectionInfo.startLine = objectLines.indexOf(searchText.toLowerCase());
        sectionInfo.content = extractTillToCurrElementEnd(ojectFileContent, keysSectionMatch.index, removeComments);

        return true;
    }

    return false;
}

function extractTillToCurrElementEnd(objectText: string, startPosition: number, removeComments: boolean): string {
    let fullDefinition = '';

    // Scorri il contenuto partendo dalla sezione individuata
    let endPosition = startPosition;
    let openBraces = 0;  // Contatore delle parentesi graffe
    while (endPosition < objectText.length) {
        const char = objectText[endPosition];

        if (char === '{') {
            openBraces++;
        } else if (char === '}') {
            openBraces--;
            if (openBraces === 0) {
                fullDefinition += char;
                break;  // Se il contatore è zero, la fine della sezione è stata individuata
            }
        }

        fullDefinition += char;
        endPosition++;
    }

    if (fullDefinition && removeComments) {
        fullDefinition = removeCommentedLines(fullDefinition);
    }

    return fullDefinition;
}

function extractElementDefinitionFromObjectTextArray(objectLines: string[], startIndex: number, includeChilds: boolean): string {
    let result: string[] = [];
    let inElementDef: boolean;

    for (let i = startIndex; i < objectLines.length; i++) {
        result.push(objectLines[i]);
        if (objectLines[i].includes("{")) {
            if (inElementDef) {
                if (!includeChilds) {
                    break;
                }
            }
            else {
                inElementDef = true;
            }
        }
        if (objectLines[i].includes("}")) {
            break;
        }
    }

    return result.join('\n');
}

//#region Table
//#region Fields
export function findTableFields(alObject: ALObject, alTableFields: ALObjectFields) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isTable() || alObject.isTableExt()) {
                // Ricerca sezione delle chiavi
                let sectionInfo: { startLine: number, content: string } = { startLine: -1, content: '' };
                if (extractCodeSection('fields', alObject.objectContentText, true, sectionInfo)) {
                    let primaryKeyFields: string[] = [];
                    if (alObject.isTable()) {
                        let alTableKeys: ALTableKeys;
                        alTableKeys = new ALTableKeys(alObject);
                        if (alTableKeys && (alTableKeys.elementsCount > 0)) {
                            primaryKeyFields = alTableKeys.keys[0].fieldsList
                                .split(',')
                                .map(field => field.trim().toLowerCase().replace(/^"|"$/g, ''));
                        }
                    }

                    let objectLines: string[] = alObject.objectContentText.split('\n');
                    objectLines = objectLines.map(line => line.trim().toLowerCase());

                    let match: RegExpExecArray | null;
                    while ((match = regExpr.tableFieldDefinition.exec(sectionInfo.content)) !== null) {
                        const fieldName = match[2].trim();
                        if (fieldName) {
                            const fieldID = Number(match[1].trim());
                            const fieldType = match[3].trim();

                            let normalizedFieldName = fieldName.replace(/^"|"$/g, '').toLowerCase();
                            let pkIndex = primaryKeyFields.indexOf(normalizedFieldName);
                            pkIndex = pkIndex >= 0 ? pkIndex + 1 : 0;

                            // Ricerca proprietà 
                            const fieldBody = match[4].trim();
                            const properties: { [key: string]: string } = {};
                            findAllProperties(fieldBody, properties);

                            // Cerco la posizione dell'oggetto trovato
                            const searchText = match[0].split('\n')[0].replace('\r', '');  // Rimuove il carriage return \r
                            let linePosition = objectLines.indexOf(searchText.toLowerCase());

                            alTableFields.fields.push({
                                id: fieldID,
                                name: fieldName,
                                type: fieldType,
                                pkIndex: pkIndex,
                                properties: properties,
                                iconName: (pkIndex > 0) ? 'key' : 'symbol-field',
                                startLine: linePosition
                            });
                        }
                    }
                }
            }
        }
    }
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
//#endregion Fields

//#region Keys
export function findTableKeys(alObject: ALObject, alTableKeys: ALTableKeys) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isTable() || alObject.isTableExt()) {

                // Ricerca sezione delle chiavi
                let sectionInfo: { startLine: number, content: string } = { startLine: -1, content: '' };
                if (extractCodeSection('keys', alObject.objectContentText, true, sectionInfo)) {
                    let objectLines: string[] = alObject.objectContentText.split('\n');
                    objectLines = objectLines.map(line => line.trim().toLowerCase());
                    let primaryKeyFound: boolean;

                    let match: RegExpExecArray | null;
                    while ((match = regExpr.tableKeyDefinition.exec(sectionInfo.content)) !== null) {
                        const keyName = match[1].trim();
                        if (keyName) {
                            let isPrimaryKey = false;
                            if (alObject.isTable()) {
                                isPrimaryKey = primaryKeyFound ? false : true;
                                primaryKeyFound = true;
                            }

                            // Dettaglio Campi
                            const fields = match[2].trim();

                            // Cerco la posizione dell'oggetto trovato
                            const searchText = match[0].split('\n')[0].replace('\r', '');  // Rimuove il carriage return \r
                            let linePosition = objectLines.indexOf(searchText.toLowerCase());

                            // Ricerca proprietà 
                            const keyBody = match[3].trim();
                            const properties: { [key: string]: string } = {};
                            findAllProperties(keyBody, properties);

                            alTableKeys.keys.push({
                                name: keyName,
                                fieldsList: fields,
                                properties: properties,
                                isPrimaryKey: isPrimaryKey,
                                iconName: isPrimaryKey ? 'key' : 'list-ordered',
                                startLine: linePosition,
                                endLine: 0
                            });
                        }
                    }
                }
            }
        }
    }
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
//#endregion Keys

//#region Field Groups
export function findTableFieldGroups(alObject: ALObject, alTableFieldGroups: ALTableFieldGroups) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isTable() || alObject.isTableExt()) {
                // Ricerca sezione delle chiavi
                let sectionInfo: { startLine: number, content: string } = { startLine: -1, content: '' };
                if (extractCodeSection('fieldgroups', alObject.objectContentText, true, sectionInfo)) {
                    let objectLines: string[] = alObject.objectContentText.split('\n');
                    objectLines = objectLines.map(line => line.trim().toLowerCase());

                    let match: RegExpExecArray | null;
                    while ((match = regExpr.tableFieldGroupDefinition.exec(sectionInfo.content)) !== null) {
                        const groupName = match[1].trim();
                        if (groupName) {
                            // Dettaglio Campi
                            const fields = match[2].trim();

                            // Cerco la posizione dell'oggetto trovato
                            const searchText = match[0].split('\n')[0].replace('\r', '');  // Rimuove il carriage return \r
                            let linePosition = objectLines.indexOf(searchText.toLowerCase());

                            alTableFieldGroups.fieldgroups.push({
                                name: groupName,
                                fieldsList: fields,
                                iconName: 'group-by-ref-type',
                                startLine: linePosition,
                                endLine: 0
                            });
                        }
                    }
                }
            }
        }
    }
}
//#endregion Field Groups

//#endregion Table

//#region Page
//#region Fields
export function findPageFields(alObject: ALObject, alPageFields: ALObjectFields) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isPage() || alObject.isPageExt()) {
                // Ricerca sezione delle chiavi
                let sectionInfo: { startLine: number, content: string } = { startLine: -1, content: '' };
                if (extractCodeSection('layout', alObject.objectContentText, true, sectionInfo)) {
                    let objectLines: string[] = alObject.objectContentText.split('\n');
                    objectLines = objectLines.map(line => line.trim().toLowerCase());

                    let match: RegExpExecArray | null;
                    while ((match = regExpr.pageFieldDefinition.exec(sectionInfo.content)) !== null) {
                        const fieldName = match[1].trim();
                        if (fieldName) {
                            const sourceExpr = match[2].trim();

                            // Ricerca proprietà 
                            const fieldBody = match[3].trim();
                            const properties: { [key: string]: string } = {};
                            findAllProperties(fieldBody, properties);

                            // Cerco la posizione dell'oggetto trovato
                            const searchText = match[0].split('\n')[0].replace('\r', '');  // Rimuove il carriage return \r
                            let linePosition = objectLines.indexOf(searchText.toLowerCase());

                            alPageFields.fields.push({
                                name: fieldName,
                                type: sourceExpr,
                                sourceExpr: sourceExpr,
                                properties: properties,
                                iconName: 'symbol-field',
                                startLine: linePosition
                            });
                        }
                    }
                }
            }
        }
    }
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
//#endregion Fields

//#region Actions
export function findPageActions(alObject: ALObject, alPageActions: ALObjectActions) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isPage() || alObject.isPageExt) {
                let sectionInfo: { startLine: number, content: string } = { startLine: -1, content: '' };
                if (extractCodeSection('actions', alObject.objectContentText, false, sectionInfo)) {
                    const lines = sectionInfo.content.split('\n');

                    let insideMultiLineComment: boolean;
                    let actionAreaInfo: { name: string } = { name: '' };
                    let actionGroupStack: { name: string, level: number }[] = [];
                    let currentLevel = -1;

                    lines.forEach((lineText, linePos) => {
                        lineText = cleanObjectLineText(lineText);
                        const lineNumber = sectionInfo.startLine + linePos;

                        // Verifica inizio-fine commento multi-riga
                        if (isMultiLineCommentStart(lineText)) {
                            insideMultiLineComment = true;
                        }
                        if (isMultiLineCommentEnd(lineText)) {
                            insideMultiLineComment = false;
                        }

                        // Verifico se si tratta di una riga commentata
                        const commentedLine = (insideMultiLineComment || isCommentedLine(lineText));
                        if (!commentedLine) {
                            if (isActionAreaDefinition(lineText, actionAreaInfo)) {
                                alPageActions.actions.push({
                                    kind: 'area',
                                    name: actionAreaInfo.name,
                                    level: 0,
                                    sourceAction: '',
                                    area: '',
                                    isAction: false,
                                    iconName: 'location',
                                    startLine: lineNumber
                                });

                                currentLevel = 0;
                            }

                            if (currentLevel >= 0) {
                                let actionGroupInfo: { name: string } = { name: '' };
                                if (isActionGroupDefinition(lineText, actionGroupInfo)) {
                                    actionGroupStack.push({ name: actionGroupInfo.name, level: currentLevel });

                                    const actionGroupBody = extractElementDefinitionFromObjectTextArray(lines, linePos, false);
                                    const properties: { [key: string]: string } = {};
                                    findAllProperties(actionGroupBody, properties);

                                    alPageActions.actions.push({
                                        kind: 'group',
                                        name: actionGroupInfo.name,
                                        level: currentLevel,
                                        sourceAction: '',
                                        area: actionAreaInfo.name,
                                        isAction: false,
                                        properties: properties,
                                        iconName: 'array',
                                        startLine: lineNumber
                                    });
                                }

                                let actionInfo: { name: string, sourceAction: string } = { name: '', sourceAction: '' };
                                if (isActionDefinition(lineText, actionInfo)) {
                                    const lastGroupName = actionGroupStack
                                        .slice() // Copia l'array
                                        .reverse() // Inverte l'ordine degli elementi
                                        .find(item => item.level === (currentLevel - 1));

                                    // Ricerca proprietà 
                                    const actionBody = extractElementDefinitionFromObjectTextArray(lines, linePos, false);
                                    const properties: { [key: string]: string } = {};
                                    findAllProperties(actionBody, properties);

                                    alPageActions.actions.push({
                                        kind: 'action',
                                        name: actionInfo.name,
                                        level: currentLevel,
                                        sourceAction: actionInfo.sourceAction,
                                        area: actionAreaInfo.name,
                                        actionGroupRef: lastGroupName ? lastGroupName.name : '',
                                        isAction: true,
                                        properties: properties,
                                        iconName: 'symbol-event',
                                        startLine: lineNumber
                                    });
                                }
                            }

                            if (lineText.includes("{")) {
                                currentLevel++;
                            }
                            if (lineText.includes("}")) {
                                currentLevel--;

                                if (actionGroupStack && (actionGroupStack.length > 0)) {
                                    // Elimino tutti i gruppi di livello maggiore
                                    actionGroupStack = actionGroupStack.filter(item => item.level <= currentLevel);
                                }
                            }
                        }
                    });

                    if (alPageActions.actions) {
                        if (alPageActions.actions.length > 0) {
                            // Order by StartLine
                            alPageActions.actions.sort((a, b) => a.startLine - b.startLine);
                        }
                    }
                }
            }
        }
    }
}

export function isActionAreaDefinition(lineText: string, actionAreaInfo: { name: string }): boolean {
    let match = lineText.trim().match(regExpr.pageActionArea);
    if (match) {
        actionAreaInfo.name = match[1] || 'actions';

        return true;
    }

    match = lineText.trim().match(regExpr.pageActionAnchor);
    if (match) {
        actionAreaInfo.name = match[2] || 'actions';

        return true;
    }

    return false;
}

export function isActionGroupDefinition(lineText: string, actionGroupInfo: { name: string }): boolean {
    const match = lineText.trim().match(regExpr.pageActionGroup);
    if (match) {
        actionGroupInfo.name = match[1] || 'group';
        actionGroupInfo.name = actionGroupInfo.name.replace('&', '');

        return true;
    }

    return false;
}

export function isActionDefinition(lineText: string, actionInfo: { name: string, sourceAction: string }): boolean {
    let match = lineText.trim().match(regExpr.pageAction);
    if (match) {
        actionInfo.name = match[1] || 'action';
        actionInfo.name = actionInfo.name.replace('&', '');
        return true;
    }
    else {
        match = lineText.trim().match(regExpr.pageActionRef);
        if (match) {
            actionInfo.name = match[1] || 'action';
            actionInfo.name = actionInfo.name.replace('&', '');

            actionInfo.sourceAction = match[2] || '';
            actionInfo.sourceAction = actionInfo.sourceAction.replace('&', '');
            return true;
        }
    }

    return false;
}
//#endregion Actions
//#endregion Page

//#region Report
//#region Data Items
export function findReportDataitems(alObject: ALObject, alReportDataitems: ALObjectDataItems) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isReport() || alObject.isReportExt()) {
                let sectionInfo: { startLine: number, content: string } = { startLine: -1, content: '' };
                if (extractCodeSection('dataset', alObject.objectContentText, false, sectionInfo)) {
                    const datasetTxtLines = sectionInfo.content.split('\n');
                    let insideMultiLineComment: boolean;
                    let currentLevel = -1;

                    const stack: {
                        name: string;
                        sourceExpression: string;
                        fullText: string;
                        level: number;
                        startLine: number
                    }[] = [];

                    datasetTxtLines.forEach((lineText, linePos) => {
                        lineText = cleanObjectLineText(lineText);
                        const lineNumber = linePos;

                        // Verifica inizio-fine commento multi-riga
                        if (isMultiLineCommentStart(lineText)) {
                            insideMultiLineComment = true;
                        }
                        if (isMultiLineCommentEnd(lineText)) {
                            insideMultiLineComment = false;
                        }

                        // Verifico se si tratta di una riga commentata
                        const commentedLine = (insideMultiLineComment || isCommentedLine(lineText));
                        if (!commentedLine) {
                            if (lineText.includes("{")) {
                                currentLevel++;
                            }
                            if (lineText.includes("}")) {
                                currentLevel--;
                                if (currentLevel >= 0) {
                                    if (stack.length > 0) {
                                        if (stack[stack.length - 1].level === currentLevel) {

                                            const lastEntry = stack.pop();
                                            if (lastEntry) {
                                                // Ricerca proprietà
                                                const properties: { [key: string]: string } = {};

                                                if (lastEntry.fullText) {
                                                    lastEntry.fullText += '}';

                                                    let elementDefinition = regExpr.reportDataitemDefinition.exec(lastEntry.fullText);
                                                    if (elementDefinition) {
                                                        let elementDefinitionText = elementDefinition[0];
                                                        findAllProperties(elementDefinitionText, properties);
                                                    }
                                                }
                                                // Aggiungo il l'elemento alla lista
                                                alReportDataitems.dataItems.push({
                                                    name: lastEntry.name,
                                                    sourceExpression: lastEntry.sourceExpression,
                                                    level: lastEntry.level,
                                                    startLine: lastEntry.startLine,
                                                    endLine: sectionInfo.startLine + lineNumber,
                                                    properties: properties,
                                                    iconName: 'symbol-class'
                                                });
                                            }
                                        }
                                    }
                                }
                            }

                            if (currentLevel >= 0) {
                                let dataItemInfo: { name: string, sourceExpr: string } = { name: '', sourceExpr: '' };
                                if (isReportDataItemDefinition(lineText, dataItemInfo)) {
                                    stack.push({
                                        name: dataItemInfo.name,
                                        sourceExpression: dataItemInfo.sourceExpr,
                                        level: currentLevel,
                                        startLine: sectionInfo.startLine + lineNumber,
                                        fullText: lineText
                                    });
                                }
                                else {
                                    if (stack.length > 0) {
                                        let lastDataitem = stack.pop();
                                        lastDataitem.fullText += lineText;
                                        stack.push(lastDataitem);
                                    }
                                }
                            }
                        }
                    });

                    if (alReportDataitems.dataItems) {
                        if (alReportDataitems.dataItems.length > 0) {
                            // Order by StartLine
                            alReportDataitems.dataItems.sort((a, b) => a.startLine - b.startLine);
                        }
                    }
                }
            }
        }
    }
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
//#endregion Data Items

//#region Columns
export function findReportColumns(alObject: ALObject, alReportColumns: ALObjectFields) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isReport() || alObject.isReportExt()) {
                let alReportDataitems: ALObjectDataItems;
                alReportDataitems = new ALObjectDataItems(alObject);

                // Ricerca sezione delle chiavi
                let sectionInfo: { startLine: number, content: string } = { startLine: -1, content: '' };
                if (extractCodeSection('dataset', alObject.objectContentText, true, sectionInfo)) {
                    let objectLines: string[] = alObject.objectContentText.split('\n');
                    objectLines = objectLines.map(line => line.trim().toLowerCase());

                    let match: RegExpExecArray | null;
                    while ((match = regExpr.reportColumnDefinition.exec(sectionInfo.content)) !== null) {
                        const fieldName = match[1].trim();
                        if (fieldName) {
                            const sourceExpr = match[2].trim();

                            // Ricerca proprietà 
                            const fieldBody = match[3].trim();
                            const properties: { [key: string]: string } = {};
                            findAllProperties(fieldBody, properties);

                            // Cerco la posizione dell'oggetto trovato
                            const searchText = match[0].split('\n')[0].replace('\r', '');  // Rimuove il carriage return \r
                            let linePosition = objectLines.indexOf(searchText.toLowerCase());

                            // Ricerca dataitem di riferimento
                            const refDataItem = alReportDataitems.dataItems
                                .filter((di) => linePosition >= di.startLine && linePosition <= di.endLine)  // Filtra i dataitem che contengono la linePosition
                                .sort((a, b) => b.startLine - a.startLine)  // Ordina per startLine in ordine decrescente
                                .shift();  // Prende il primo, che avrà lo startLine più alto

                            alReportColumns.fields.push({
                                name: fieldName,
                                type: sourceExpr,
                                sourceExpr: sourceExpr,
                                properties: properties,
                                iconName: 'symbol-field',
                                dataItem: refDataItem ? refDataItem.name : '',
                                startLine: linePosition
                            });
                        }
                    }
                }
            }
        }
    }
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
//#endregion Columns

//#region Request Page
export function findRequestPageActions(alObject: ALObject, alPageActions: ALObjectActions) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isReport() || alObject.isReportExt) {
                let sectionInfo: { startLine: number, content: string } = { startLine: -1, content: '' };
                if (extractCodeSection('actions', alObject.objectContentText, false, sectionInfo)) {
                    const lines = sectionInfo.content.split('\n');

                    let insideMultiLineComment: boolean;
                    let actionAreaInfo: { name: string } = { name: '' };
                    let actionGroupStack: { name: string, level: number }[] = [];
                    let currentLevel = -1;

                    lines.forEach((lineText, linePos) => {
                        lineText = cleanObjectLineText(lineText);
                        const lineNumber = sectionInfo.startLine + linePos;

                        // Verifica inizio-fine commento multi-riga
                        if (isMultiLineCommentStart(lineText)) {
                            insideMultiLineComment = true;
                        }
                        if (isMultiLineCommentEnd(lineText)) {
                            insideMultiLineComment = false;
                        }

                        // Verifico se si tratta di una riga commentata
                        const commentedLine = (insideMultiLineComment || isCommentedLine(lineText));
                        if (!commentedLine) {
                            if (isActionAreaDefinition(lineText, actionAreaInfo)) {
                                alPageActions.actions.push({
                                    kind: 'area',
                                    name: actionAreaInfo.name,
                                    level: 0,
                                    sourceAction: '',
                                    area: '',
                                    isAction: false,
                                    iconName: 'location',
                                    startLine: lineNumber
                                });

                                currentLevel = 0;
                            }

                            if (currentLevel >= 0) {
                                let actionGroupInfo: { name: string } = { name: '' };
                                if (isActionGroupDefinition(lineText, actionGroupInfo)) {
                                    actionGroupStack.push({ name: actionGroupInfo.name, level: currentLevel });

                                    const actionGroupBody = extractElementDefinitionFromObjectTextArray(lines, linePos, false);
                                    const properties: { [key: string]: string } = {};
                                    findAllProperties(actionGroupBody, properties);

                                    alPageActions.actions.push({
                                        kind: 'group',
                                        name: actionGroupInfo.name,
                                        level: currentLevel,
                                        sourceAction: '',
                                        area: actionAreaInfo.name,
                                        isAction: false,
                                        properties: properties,
                                        iconName: 'array',
                                        startLine: lineNumber
                                    });
                                }

                                let actionInfo: { name: string, sourceAction: string } = { name: '', sourceAction: '' };
                                if (isActionDefinition(lineText, actionInfo)) {
                                    const lastGroupName = actionGroupStack
                                        .slice() // Copia l'array
                                        .reverse() // Inverte l'ordine degli elementi
                                        .find(item => item.level === (currentLevel - 1));

                                    // Ricerca proprietà 
                                    const actionBody = extractElementDefinitionFromObjectTextArray(lines, linePos, false);
                                    const properties: { [key: string]: string } = {};
                                    findAllProperties(actionBody, properties);

                                    alPageActions.actions.push({
                                        kind: 'action',
                                        name: actionInfo.name,
                                        level: currentLevel === 0 ? 1 : currentLevel,
                                        sourceAction: actionInfo.sourceAction,
                                        area: actionAreaInfo.name,
                                        actionGroupRef: lastGroupName ? lastGroupName.name : '',
                                        isAction: true,
                                        properties: properties,
                                        iconName: 'symbol-event',
                                        startLine: lineNumber
                                    });
                                }
                            }

                            if (lineText.includes("{")) {
                                currentLevel++;
                            }
                            if (lineText.includes("}")) {
                                currentLevel--;

                                if (actionGroupStack && (actionGroupStack.length > 0)) {
                                    // Elimino tutti i gruppi di livello maggiore
                                    actionGroupStack = actionGroupStack.filter(item => item.level <= currentLevel);
                                }
                            }
                        }
                    });

                    if (alPageActions.actions) {
                        if (alPageActions.actions.length > 0) {
                            // Order by StartLine
                            alPageActions.actions.sort((a, b) => a.startLine - b.startLine);
                        }
                    }
                }
            }
        }
    }
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
//#endregion Request Page
//#endregion Report

//#region Query
//#region Data Items
export function findQueryDataitems(alObject: ALObject, alQueryDataitems: ALObjectDataItems) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isQuery()) {
                let sectionInfo: { startLine: number, content: string } = { startLine: -1, content: '' };
                if (extractCodeSection('elements', alObject.objectContentText, false, sectionInfo)) {
                    const datasetTxtLines = sectionInfo.content.split('\n');
                    let insideMultiLineComment: boolean;
                    let currentLevel = -1;

                    const stack: {
                        name: string;
                        sourceExpression: string;
                        fullText: string;
                        level: number;
                        startLine: number
                    }[] = [];

                    datasetTxtLines.forEach((lineText, linePos) => {
                        lineText = cleanObjectLineText(lineText);
                        const lineNumber = linePos;

                        // Verifica inizio-fine commento multi-riga
                        if (isMultiLineCommentStart(lineText)) {
                            insideMultiLineComment = true;
                        }
                        if (isMultiLineCommentEnd(lineText)) {
                            insideMultiLineComment = false;
                        }

                        // Verifico se si tratta di una riga commentata
                        const commentedLine = (insideMultiLineComment || isCommentedLine(lineText));
                        if (!commentedLine) {
                            if (lineText.includes("{")) {
                                currentLevel++;
                            }
                            if (lineText.includes("}")) {
                                currentLevel--;
                                if (currentLevel >= 0) {
                                    if (stack.length > 0) {
                                        if (stack[stack.length - 1].level === currentLevel) {

                                            const lastEntry = stack.pop();
                                            if (lastEntry) {
                                                // Ricerca proprietà
                                                const properties: { [key: string]: string } = {};

                                                if (lastEntry.fullText) {
                                                    lastEntry.fullText += '}';

                                                    let elementDefinition = regExpr.queryDataitemDefinition.exec(lastEntry.fullText);
                                                    if (elementDefinition) {
                                                        let elementDefinitionText = elementDefinition[0];
                                                        findAllProperties(elementDefinitionText, properties);
                                                    }
                                                }
                                                // Aggiungo il l'elemento alla lista
                                                alQueryDataitems.dataItems.push({
                                                    name: lastEntry.name,
                                                    sourceExpression: lastEntry.sourceExpression,
                                                    level: lastEntry.level,
                                                    startLine: lastEntry.startLine,
                                                    endLine: sectionInfo.startLine + lineNumber,
                                                    properties: properties,
                                                    iconName: 'symbol-class'
                                                });
                                            }
                                        }
                                    }
                                }
                            }

                            if (currentLevel >= 0) {
                                let dataItemInfo: { name: string, sourceExpr: string } = { name: '', sourceExpr: '' };
                                if (isQueryDataItemDefinition(lineText, dataItemInfo)) {
                                    stack.push({
                                        name: dataItemInfo.name,
                                        sourceExpression: dataItemInfo.sourceExpr,
                                        level: currentLevel,
                                        startLine: sectionInfo.startLine + lineNumber,
                                        fullText: lineText
                                    });
                                }
                                else {
                                    if (stack.length > 0) {
                                        let lastDataitem = stack.pop();
                                        lastDataitem.fullText += lineText;
                                        stack.push(lastDataitem);
                                    }
                                }
                            }
                        }
                    });

                    if (alQueryDataitems.dataItems) {
                        if (alQueryDataitems.dataItems.length > 0) {
                            // Order by StartLine
                            alQueryDataitems.dataItems.sort((a, b) => a.startLine - b.startLine);
                        }
                    }
                }
            }
        }
    }
}
export function isQueryDataItemDefinition(lineText: string, dataItemInfo: { name: string, sourceExpr: string }): boolean {
    const match = lineText.trim().match(regExpr.queryDataItem);
    if (match) {
        dataItemInfo.name = match[1] || '';
        dataItemInfo.sourceExpr = match[2] || '';

        return true;
    }

    return false;
}
//#endregion Data Items

//#region Columns
export function findQueryColumns(alObject: ALObject, alQueryColumns: ALObjectFields) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isQuery()) {
                let alQueryDataitems: ALObjectDataItems;
                alQueryDataitems = new ALObjectDataItems(alObject);

                // Ricerca sezione delle chiavi
                let sectionInfo: { startLine: number, content: string } = { startLine: -1, content: '' };
                if (extractCodeSection('elements', alObject.objectContentText, true, sectionInfo)) {
                    let objectLines: string[] = alObject.objectContentText.split('\n');
                    objectLines = objectLines.map(line => line.trim().toLowerCase());

                    let match: RegExpExecArray | null;
                    while ((match = regExpr.queryColumnDefinition.exec(sectionInfo.content)) !== null) {
                        const fieldName = match[2].trim();
                        if (fieldName) {
                            const sourceExpr = match[3].trim();

                            // Ricerca proprietà 
                            const fieldBody = match[4].trim();
                            const properties: { [key: string]: string } = {};
                            findAllProperties(fieldBody, properties);

                            // Cerco la posizione dell'oggetto trovato
                            const searchText = match[0].split('\n')[0].replace('\r', '');  // Rimuove il carriage return \r
                            let linePosition = objectLines.indexOf(searchText.toLowerCase());

                            // Ricerca dataitem di riferimento
                            const refDataItem = alQueryDataitems.dataItems
                                .filter((di) => linePosition >= di.startLine && linePosition <= di.endLine)  // Filtra i dataitem che contengono la linePosition
                                .sort((a, b) => b.startLine - a.startLine)  // Ordina per startLine in ordine decrescente
                                .shift();  // Prende il primo, che avrà lo startLine più alto

                            alQueryColumns.fields.push({
                                name: fieldName,
                                type: sourceExpr,
                                sourceExpr: sourceExpr,
                                properties: properties,
                                iconName: (properties['method']) ? 'symbol-operator' : 'symbol-field',
                                dataItem: refDataItem ? refDataItem.name : '',
                                startLine: linePosition
                            });
                        }
                    }
                }
            }
        }
    }
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
//#endregion Columns

//#endregion Query

//#region Fields
export function findObjectFields(alObject: ALObject, alObjectFields: ALObjectFields) {
    let validObjectType = alObject.isTable() || alObject.isTableExt() ||
        alObject.isPage() || alObject.isPageExt() ||
        alObject.isReport() || alObject.isReportExt() ||
        alObject.isQuery();

    if (validObjectType) {
        let primaryKeyFields: string[] = [];
        if (alObject.isTable()) {
            let alTableKeys: ALTableKeys;
            alTableKeys = new ALTableKeys(alObject);
            if (alTableKeys && alTableKeys.keys) {
                primaryKeyFields = alTableKeys.keys[0].fieldsList
                    .split(',')
                    .map(field => field.trim().toLowerCase().replace(/^"|"$/g, ''));
            }
        }

        if (alObject.objectContentText) {
            const lines = alObject.objectContentText.split('\n');
            let insideMultiLineComment: boolean;
            let dataitemName: string = '';

            lines.forEach((lineText, linePos) => {
                lineText = cleanObjectLineText(lineText);
                const lineNumber = linePos;

                // Verifica inizio-fine commento multi-riga
                if (isMultiLineCommentStart(lineText)) {
                    insideMultiLineComment = true;
                }
                if (isMultiLineCommentEnd(lineText)) {
                    insideMultiLineComment = false;
                }

                // Verifico se si tratta di una riga commentata
                const commentedLine = (insideMultiLineComment || isCommentedLine(lineText));
                if (!commentedLine) {
                    if (alObject.isTable() || alObject.isTableExt()) {
                        let tableField: { id: number, name: string, type: string };
                        tableField = { id: 0, name: '', type: '' };

                        if (isTableFieldDefinition(lineText, tableField)) {
                            let normalizedFieldName = tableField.name.replace(/^"|"$/g, '').toLowerCase();
                            let pkIndex = primaryKeyFields.indexOf(normalizedFieldName);
                            pkIndex = pkIndex >= 0 ? pkIndex + 1 : 0;

                            alObjectFields.fields.push({
                                id: tableField.id,
                                name: tableField.name,
                                type: tableField.type,
                                pkIndex: pkIndex,
                                iconName: (pkIndex > 0) ? 'key' : 'symbol-field',
                                startLine: lineNumber
                            });

                            return;
                        }
                    }

                    if (alObject.isPage() || alObject.isPageExt()) {
                        let pageField: { name: string, sourceExpr: string };
                        pageField = { name: '', sourceExpr: '' };
                        if (isPageFieldDefinition(lineText, pageField)) {
                            alObjectFields.fields.push({
                                id: 0,
                                name: pageField.name,
                                type: pageField.sourceExpr,
                                sourceExpr: pageField.sourceExpr,
                                iconName: 'symbol-field',
                                startLine: lineNumber
                            });

                            return;
                        }
                    }

                    if (alObject.isReport() || alObject.isReportExt()) {
                        let dataItemInfo: { name: string, sourceExpr: string };
                        dataItemInfo = { name: '', sourceExpr: '' };
                        if (isReportDataItemDefinition(lineText, dataItemInfo)) {
                            dataitemName = `DataItem: ${dataItemInfo.name} (${dataItemInfo.sourceExpr})`;

                            return;
                        }

                        let reportField: { name: string, sourceExpr: string };
                        reportField = { name: '', sourceExpr: '' };
                        if (isReportColumnDefinition(lineText, reportField)) {
                            alObjectFields.fields.push({
                                id: 0,
                                name: reportField.name,
                                type: reportField.sourceExpr,
                                sourceExpr: reportField.sourceExpr,
                                dataItem: dataitemName,
                                iconName: 'symbol-field',
                                startLine: lineNumber
                            });

                            return;
                        }
                        else {
                            if (isReportReqPageFieldDefinition(lineText, reportField)) {
                                alObjectFields.fields.push({
                                    id: 0,
                                    name: reportField.name,
                                    type: reportField.sourceExpr,
                                    sourceExpr: reportField.sourceExpr,
                                    dataItem: 'requestpage',
                                    iconName: 'symbol-field',
                                    startLine: lineNumber
                                });

                                return;
                            }
                        }
                    }
                    if (alObject.isQuery) {
                        let dataItemInfo: { name: string, sourceExpr: string };
                        dataItemInfo = { name: '', sourceExpr: '' };
                        if (isQueryDataItemDefinition(lineText, dataItemInfo)) {
                            dataitemName = `DataItem: ${dataItemInfo.name} (${dataItemInfo.sourceExpr})`;

                            return;
                        }

                        let reportField: { name: string, sourceExpr: string };
                        reportField = { name: '', sourceExpr: '' };
                        if (isQueryColumnDefinition(lineText, reportField)) {
                            alObjectFields.fields.push({
                                id: 0,
                                name: reportField.name,
                                type: reportField.sourceExpr,
                                sourceExpr: reportField.sourceExpr,
                                iconName: 'symbol-field',
                                dataItem: dataitemName,
                                startLine: lineNumber
                            });

                            return;
                        }
                    }
                }
            });

            if (alObjectFields.fields) {
                if (alObjectFields.fields.length > 0) {
                    // Order by StartLine
                    alObjectFields.fields.sort((a, b) => a.startLine - b.startLine);
                }
            }
        }
    }
}
//#endregion Fields

//#region Dataitems
export function findObjectDataItems(alObject: ALObject, alObjectDataItems: ALObjectDataItems) {
    let validObjectType = alObject.isReport() || alObject.isReportExt() || alObject.isQuery();
    let insideDataset: boolean;
    if (validObjectType) {
        const lines = alObject.objectContentText.split('\n');
        let insideMultiLineComment: boolean;
        let currentLevel = -1;
        const stack: {
            name: string;
            sourceExpression: string;
            level: number;
            startLine: number
        }[] = [];

        lines.forEach((lineText, linePos) => {
            lineText = cleanObjectLineText(lineText);
            const lineNumber = linePos;

            // Verifica inizio-fine commento multi-riga
            if (isMultiLineCommentStart(lineText)) {
                insideMultiLineComment = true;
            }
            if (isMultiLineCommentEnd(lineText)) {
                insideMultiLineComment = false;
            }

            // Verifico se la riga è commentata
            const commentedLine = (insideMultiLineComment || isCommentedLine(lineText));
            if (!commentedLine) {
                // Verifico di trovarmi nella sezione Dataset
                if (alObject.isReport() || alObject.isReportExt()) {
                    if (lineText.trim().toLowerCase() === 'dataset') {
                        insideDataset = true;
                    }
                }
                if (alObject.isQuery()) {
                    if (lineText.trim().toLowerCase() === 'elements') {
                        insideDataset = true;
                    }
                }

                if (insideDataset) {
                    if (lineText.includes("{")) {
                        currentLevel++;
                    }
                    if (lineText.includes("}")) {
                        currentLevel--;
                        if (currentLevel < 0) {
                            insideDataset = false;
                            return;
                        }

                        if (stack.length > 0) {
                            if (stack[stack.length - 1].level === currentLevel) {

                                const lastEntry = stack.pop();
                                if (lastEntry) {
                                    alObjectDataItems.dataItems.push({
                                        name: lastEntry.name,
                                        sourceExpression: lastEntry.sourceExpression,
                                        level: lastEntry.level,
                                        startLine: lastEntry.startLine,
                                        endLine: lineNumber,
                                        iconName: 'symbol-class'
                                    });
                                }
                            }
                        }
                    }

                    let dataItemInfo: { name: string, sourceExpr: string } = { name: '', sourceExpr: '' };
                    if (isReportDataItemDefinition(lineText, dataItemInfo)) {
                        stack.push({
                            name: dataItemInfo.name,
                            sourceExpression: dataItemInfo.sourceExpr,
                            level: currentLevel,
                            startLine: lineNumber
                        });
                    }
                }
            }
        });

        if (alObjectDataItems.dataItems) {
            if (alObjectDataItems.dataItems.length > 0) {
                // Order by StartLine
                alObjectDataItems.dataItems.sort((a, b) => a.startLine - b.startLine);
            }
        }
    }
}
//#endregion Dataitems

//#region Procedures
export function findObjectProcedures(alObject: ALObject, alObjectProcedures: ALObjectProcedures) {
    if (alObject) {
        if (alObject.objectContentText) {
            const lines = alObject.objectContentText.split('\n');
            let insideMultiLineComment: boolean;
            let insideIntOrBusEventDecl: boolean;
            let insideEventSubscription: boolean;
            let eventSubscrName: string = '';

            let alObjectRegions: ALObjectRegions;
            alObjectRegions = new ALObjectRegions(alObject);

            lines.forEach((lineText, linePos) => {
                lineText = cleanObjectLineText(lineText);
                const lineNumber = linePos;

                // Verifica inizio-fine commento multi-riga
                if (isMultiLineCommentStart(lineText)) {
                    insideMultiLineComment = true;
                }
                if (isMultiLineCommentEnd(lineText)) {
                    insideMultiLineComment = false;
                }

                // Verifico se si tratta di una riga commentata
                const commentedLine = (insideMultiLineComment || isCommentedLine(lineText));
                if (!commentedLine) {
                    if (isIntegrationEventDeclaration(lineText) || isBusinessEventDeclaration(lineText)) {
                        insideIntOrBusEventDecl = true;
                    }
                    else {
                        let eventSubscrInfo: { objectType?: string, objectName?: string, eventName?: string, elementName?: string } = {};
                        if (isEventSubscriber(lineText, eventSubscrInfo)) {
                            insideEventSubscription = true;
                            eventSubscrName = eventSubscrInfo.elementName ? `${eventSubscrInfo.objectType} ${eventSubscrInfo.objectName}: ${eventSubscrInfo.eventName}_${eventSubscrInfo.elementName}` :
                                `${eventSubscrInfo.objectType} ${eventSubscrInfo.objectName}: ${eventSubscrInfo.eventName} `;
                        }
                        else {
                            let procedureInfo: { scope: string, name: string };
                            procedureInfo = { scope: '', name: '' };
                            if (isProcedureDefinition(alObject, lineText, procedureInfo)) {
                                let symbol = insideIntOrBusEventDecl ? 'symbol-event' :
                                    insideEventSubscription ? 'plug' :
                                        procedureInfo.scope === 'trigger' ? 'server-process' :
                                            procedureInfo.scope === 'global' ? 'symbol-function' :
                                                procedureInfo.scope === 'local' ? 'shield' :
                                                    procedureInfo.scope === 'internal' ? 'symbol-variable' :
                                                        'symbol-function';

                                if (procedureInfo.name) {
                                    const lineRegionPath = alRegionMgr.findOpenRegionsPathByDocLine(alObjectRegions, lineNumber);
                                    alObjectProcedures.procedures.push({
                                        scope: procedureInfo.scope,
                                        name: procedureInfo.name,
                                        sourceEvent: insideEventSubscription ? eventSubscrName : '',
                                        iconName: symbol,
                                        regionPath: lineRegionPath,
                                        startLine: lineNumber
                                    });
                                    insideIntOrBusEventDecl = false;
                                    insideEventSubscription = false;
                                }
                            }
                            else {
                                if ((insideIntOrBusEventDecl || insideEventSubscription) && (!lineText.trim().startsWith('['))) {
                                    insideIntOrBusEventDecl = false;
                                    insideEventSubscription = false;
                                }
                            }
                        }
                    }
                }
            });

            if (alObjectProcedures.procedures) {
                if (alObjectProcedures.procedures.length > 0) {
                    // Order by StartLine
                    alObjectProcedures.procedures.sort((a, b) => a.startLine - b.startLine);
                }
            }
        }
    }
}
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
//#endregion Procedures

//#region Integration Events
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
//#endregion Integration Events

//#region Element Properties
function findAllProperties(elementDefinitionText: string, properties: { [key: string]: string }) {
    const propertiesRegex = regExpr.objectProperties;

    let propMatch: RegExpExecArray | null;
    while ((propMatch = propertiesRegex.exec(elementDefinitionText)) !== null) {
        let name = propMatch[1].trim().toLowerCase();
        let value = propMatch[2].trim();

        // Prendo solo il valore tra apici (es Caption = 'Caption', locked=true;)
        const match = value.match(/^'([^']+)'/);
        if (match) {
            value = match[1];
        }

        properties[name] = value;
    }
}
//#endregion Element Properties

//#region Regions
export function findObjectRegions(alObject: ALObject, alObjectRegions: ALObjectRegions) {
    if (alObject) {
        if (alObject.objectContentText) {
            const lines = alObject.objectContentText.split('\n');
            const stack: { name: string; startLine: number }[] = [];
            let insideMultiLineComment: boolean;

            lines.forEach((lineText, linePos) => {
                lineText = cleanObjectLineText(lineText);
                const lineNumber = linePos;

                // Verifica inizio-fine commento multi-riga
                if (isMultiLineCommentStart(lineText)) {
                    insideMultiLineComment = true;
                }
                if (isMultiLineCommentEnd(lineText)) {
                    insideMultiLineComment = false;
                }

                // Verifico se si tratta di una riga commentata
                const commentedLine = (insideMultiLineComment || isCommentedLine(lineText));
                if (!commentedLine) {
                    if (alRegionMgr.isRegionStartLine(lineText)) {
                        let name = alRegionMgr.getRegionName(lineText);
                        stack.push({ name, startLine: lineNumber });
                        return;
                    }

                    if (alRegionMgr.isRegionEndLine(lineText)) {
                        if (stack.length > 0) {

                            const lastRegion = stack.pop();
                            if (lastRegion) {
                                const level = stack.length;

                                alObjectRegions.regions.push({
                                    name: lastRegion.name,
                                    startLine: lastRegion.startLine,
                                    endLine: lineNumber,
                                    iconName: 'symbol-number',
                                    level: level
                                });
                            }
                        }
                    }
                }
            });

            if (alObjectRegions.regions.length > 0) {
                // Order by StartLine
                alObjectRegions.regions.sort((a, b) => a.startLine - b.startLine);
            }
        }
    }
}
//#endregion Regions


//#region Comments on Code
function removeCommentedLines(objectFileContent: string): string {
    const uncommentedContent = objectFileContent
        .replace(/\/\/.*/g, '') // Commenti di riga
        .replace(/\/\*[\s\S]*?\*\//g, ''); // Commenti multi-riga

    return uncommentedContent;
}

export function cleanObjectLineText(lineText: string): string {
    let newString = lineText;
    if (isCommentedLine(newString)) {
        newString = '';
    }

    if (newString) {
        // Verifico la presenza di caratteri racchiusi tra /*  e */
        if (newString.includes('/*')) {
            newString = newString.replace(/\/\*.*?\*\//g, '').trim();
        }
    }

    if (newString) {
        if (newString.includes('//')) {
            // Verifico la presenza di commenti di riga //
            newString = newString.split('//')[0].trim();
        }
    }

    return newString.trim();
}

export function isCommentedLine(lineText: string): boolean {
    if (lineText) {
        if (regExpr.singleLineComment.test(lineText.trim())) {
            return true;
        }
    }

    return false;
}

export function isMultiLineCommentStart(lineText: string): boolean {
    if (lineText) {
        if (regExpr.multiLineCommentStart.test(lineText.trim())) {
            return true;
        }
    }

    return false;
}
export function isMultiLineCommentEnd(lineText: string): boolean {
    if (lineText) {
        if (regExpr.multiLineCommentEnd.test(lineText.trim())) {
            return true;
        }
    }

    return false;
}
//#endregion Comments on Code
//#endregion Object Structure Mgt.