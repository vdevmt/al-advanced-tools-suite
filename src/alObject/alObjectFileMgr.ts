import * as vscode from 'vscode';
import * as path from 'path';
import * as regExpr from '../regExpressions';
import * as alRegionMgr from './alObjectRegionMgr';
import * as typeHelper from '../typeHelper';
import { ALObject, ALObjectDataItems, ALObjectFields, ALTableFieldGroups, ALTableKeys, ALObjectRegions, ALObjectProcedures, ALObjectActions, ALObjectTriggers, ALObjectVariables } from './alObject';

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
        alObject = new ALObject(document, false);
        return alObject.objectNamespace;
    }

    return "";
}
//#endregion Namespace tools

//#region Object Name tools
export function makeALObjectDescriptionText(alObject: ALObject) {
    if (alObject) {
        return `${alObject.objectType} ${alObject.objectId} ${typeHelper.addQuotesIfNeeded(alObject.objectName)}`;
    }

    return '';
}

//#endregion Object Name tools

//#region Object Structure Mgt.
function extractCodeSection(sectionName: string, ojectFileContent: string, removeComments: boolean, sectionsInfo: { startLine: number, content: string }[]): boolean {
    let objectLines: string[] = ojectFileContent.split('\n');
    objectLines = objectLines.map(line => line.trim().toLowerCase());

    const sectionRegExpr = new RegExp(`${sectionName}\\s*\\{`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = sectionRegExpr.exec(ojectFileContent)) !== null) {
        const searchText = match[0].split('\n')[0].replace('\r', '');  // Rimuove il carriage return \r

        const startLine = objectLines.indexOf(searchText.toLowerCase());
        if (startLine) {
            objectLines[startLine] = 'Found: ' + objectLines[startLine];
        }
        sectionsInfo.push({
            startLine: startLine,
            content: extractTillToCurrElementEnd(ojectFileContent, match.index, removeComments)
        });
    }

    return (sectionsInfo.length > 0);
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

export function extractElementDefinitionFromObjectText(objectText: string, startIndex: number, includeChilds: boolean): string {
    let result: string = '';
    let inElementDef: boolean;

    for (let i = startIndex; i < objectText.length; i++) {
        result += objectText[i];
        if (objectText[i] === "{") {
            if (inElementDef) {
                if (!includeChilds) {
                    break;
                }
            }
            else {
                inElementDef = true;
            }
        }
        else {
            if (objectText[i] === "}") {
                break;
            }
            else {
                if (objectText[i] === "#") {
                    result = result;
                }
                if (inElementDef && (!includeChilds)) {
                    // Nel caso di Codeunit, ad esempio, non esistono sezioni di dettaglio aperte con {
                    // quindi mi fermo in presenza di una procedure o altro
                    const resultNormalized = result.replace(/\r?\n|\r/g, " ").trim();
                    const childStartRegex = /\s*(procedure|local procedure|internal procedure|protected procedure|begin|#region|\[)\s*$/i;
                    if (childStartRegex.test(resultNormalized)) {
                        break;
                    }
                }
            }
        }
    }

    return result;
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

    return removeCommentedLines(result.join('\n'));
}

//#region Table
//#region Fields
export function findTableFields(alObject: ALObject, alTableFields: ALObjectFields) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isTable() || alObject.isTableExt()) {
                // Ricerca sezione fields
                let codeSectionsInfo: { startLine: number, content: string }[] = [];
                if (extractCodeSection('fields', alObject.objectContentText, true, codeSectionsInfo)) {
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
                    while ((match = regExpr.tableFieldDefinition.exec(codeSectionsInfo[0].content)) !== null) {
                        const fieldName = match[2].trim();
                        if (fieldName) {
                            const fieldID = Number(match[1].trim());
                            const fieldType = match[3].trim();

                            let normalizedFieldName = fieldName.replace(/^"|"$/g, '').toLowerCase();
                            let pkIndex = primaryKeyFields.indexOf(normalizedFieldName);
                            pkIndex = pkIndex >= 0 ? pkIndex + 1 : 0;

                            // Ricerca proprietà 
                            const fieldBody = removeCommentedLines(match[4].trim());
                            const properties: { [key: string]: string } = {};
                            findSymbolProperties(fieldBody, properties);

                            // Cerco la posizione dell'oggetto trovato
                            const searchText = match[0].split('\n')[0].replace('\r', '');  // Rimuove il carriage return \r
                            let linePosition = objectLines.indexOf(searchText.toLowerCase());

                            alTableFields.fields.push({
                                id: fieldID,
                                name: fieldName,
                                section: 'fields',
                                isfield: true,
                                type: fieldType,
                                externalFieldExt: false,
                                pkIndex: pkIndex,
                                properties: properties,
                                iconName: (pkIndex > 0) ? 'key' : 'symbol-field',
                                level: 0,
                                startLine: linePosition
                            });
                        }
                    }

                    if (alObject.isTableExt()) {
                        while ((match = regExpr.tableExtFieldDefinition.exec(codeSectionsInfo[0].content)) !== null) {
                            const fieldName = match[1].trim();
                            if (fieldName) {
                                let normalizedFieldName = fieldName.replace(/^"|"$/g, '').toLowerCase();

                                // Ricerca proprietà 
                                const fieldBody = removeCommentedLines(match[2].trim());
                                const properties: { [key: string]: string } = {};
                                findSymbolProperties(fieldBody, properties);

                                // Cerco la posizione dell'oggetto trovato
                                const searchText = match[0].split('\n')[0].replace('\r', '');  // Rimuove il carriage return \r
                                let linePosition = objectLines.indexOf(searchText.toLowerCase());

                                alTableFields.fields.push({
                                    id: 0,
                                    name: fieldName,
                                    section: 'fields',
                                    isfield: true,
                                    type: '',
                                    externalFieldExt: true,
                                    pkIndex: 0,
                                    properties: properties,
                                    iconName: 'symbol-module',
                                    level: 0,
                                    startLine: linePosition
                                });
                            }
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
export function isTableExternalFieldDefinition(objectLines: string[], currPosition: number, fieldInfo: { id: number, name: string, type: string }): boolean {
    if (objectLines[currPosition] && objectLines[currPosition + 1]) {
        const currLineText = cleanObjectLineText(objectLines[currPosition].trim());
        const nextLineText = cleanObjectLineText(objectLines[currPosition + 1].trim());

        if (currLineText.endsWith('{') || nextLineText.startsWith('{')) {

            const match = currLineText.match(regExpr.tableExtField);
            if (match) {
                fieldInfo.name = match[1].trim();
                return true;
            }
        }
    }

    return false;
}
//#endregion Fields

//#region Keys
export function findTableKeys(alObject: ALObject, alTableKeys: ALTableKeys) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isTable() || alObject.isTableExt()) {

                // Ricerca sezione keys
                let codeSectionsInfo: { startLine: number, content: string }[] = [];
                if (extractCodeSection('keys', alObject.objectContentText, true, codeSectionsInfo)) {
                    let objectLines: string[] = alObject.objectContentText.split('\n');
                    objectLines = objectLines.map(line => line.trim().toLowerCase());
                    let primaryKeyFound: boolean;

                    let match: RegExpExecArray | null;
                    while ((match = regExpr.tableKeyDefinition.exec(codeSectionsInfo[0].content)) !== null) {
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
                            findSymbolProperties(keyBody, properties);

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
                // Ricerca sezione fieldgroups
                let codeSectionsInfo: { startLine: number, content: string }[] = [];
                if (extractCodeSection('fieldgroups', alObject.objectContentText, true, codeSectionsInfo)) {
                    let objectLines: string[] = alObject.objectContentText.split('\n');
                    objectLines = objectLines.map(line => line.trim().toLowerCase());

                    let match: RegExpExecArray | null;
                    while ((match = regExpr.tableFieldGroupDefinition.exec(codeSectionsInfo[0].content)) !== null) {
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

//#region Triggers
export function findTableTriggers(alObject: ALObject, alObjectTriggers: ALObjectTriggers) {
    if (alObject) {
        if (alObject.isTable() || alObject.isTableExt()) {
            if (alObject.objectContentText) {
                const lines = alObject.objectContentText.split('\n');
                let insideMultiLineComment: boolean;
                let currFieldName: string;
                let insideExtField: boolean;

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
                        if (currFieldName) {
                            if (lineText.includes("}")) {
                                currFieldName = '';
                                insideExtField = false;
                            }
                            if (currFieldName) {
                                let triggerInfo: { name: string, scope: string } = { name: '', scope: '' };
                                if (isFieldTriggerDefinition(alObject, lineText, triggerInfo)) {
                                    if (triggerInfo.name) {
                                        alObjectTriggers.triggers.push({
                                            scope: '',
                                            name: `${currFieldName} - ${triggerInfo.name}`,
                                            sortIndex: lineNumber,
                                            groupIndex: insideExtField ? 10 : 20,
                                            groupName: insideExtField ? 'Extended Fields' : 'Fields',
                                            iconName: 'server-process',
                                            startLine: lineNumber
                                        });
                                    }
                                }
                            }
                        }
                        else {
                            let fieldInfo: { id: number, name: string, type: string } = { id: 0, name: '', type: '' };
                            if (isTableFieldDefinition(lineText, fieldInfo)) {
                                currFieldName = fieldInfo.name;
                                insideExtField = false;
                            }
                            else {
                                if (alObject.isTableExt()) {
                                    if (isTableExternalFieldDefinition(lines, linePos, fieldInfo)) {
                                        currFieldName = fieldInfo.name;
                                        insideExtField = true;
                                    }
                                }
                            }

                            let triggerInfo: { name: string } = { name: '' };
                            if (isTableTriggerDefinition(lineText, triggerInfo)) {
                                if (triggerInfo.name) {
                                    alObjectTriggers.triggers.push({
                                        scope: '',
                                        name: triggerInfo.name,
                                        sortIndex: lineNumber,
                                        groupIndex: 0,
                                        groupName: 'Table',
                                        iconName: 'server-process',
                                        startLine: lineNumber
                                    });
                                }
                            }

                        }
                    }
                });

                if (alObjectTriggers.triggers) {
                    if (alObjectTriggers.triggers.length > 0) {
                        // Order by StartLine
                        alObjectTriggers.triggers.sort((a, b) => a.sortIndex - b.sortIndex);
                    }
                }

            }
        }
    }
}

export function isTableTriggerDefinition(lineText: string, triggerInfo: { name: string }): boolean {
    const match = lineText.trim().match(regExpr.tableTrigger);
    if (match) {
        triggerInfo.name = match[1];

        return true;
    }

    return false;
}
//#endregion Triggers

//#endregion Table

//#region Page
//#region Fields
export function findPageFields(alObject: ALObject, alPageFields: ALObjectFields) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isPage() || alObject.isPageExt()) {
                // Ricerca sezione layout
                let codeSectionsInfo: { startLine: number, content: string }[] = [];
                if (extractCodeSection('layout', alObject.objectContentText, false, codeSectionsInfo)) {
                    const lines = codeSectionsInfo[0].content.split('\n');

                    let insideMultiLineComment: boolean;
                    let currentLevel = -1;

                    lines.forEach((lineText, linePos) => {
                        lineText = cleanObjectLineText(lineText);
                        const lineNumber = codeSectionsInfo[0].startLine + linePos;

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
                            if (currentLevel >= 0) {
                                let fieldAreaInfo: { name: string } = { name: '' };
                                if (isPageFieldAreaDefinition(lineText, fieldAreaInfo)) {
                                    currentLevel = -1;
                                }

                                let fieldGroupInfo: { type: string, name: string, extAnchor: boolean } = { type: '', name: '', extAnchor: false };
                                if (isPageFieldGroupDefinition(lineText, fieldGroupInfo)) {
                                    if (currentLevel === 0) {
                                        const fieldGroupBody = extractElementDefinitionFromObjectTextArray(lines, linePos, false);
                                        const properties: { [key: string]: string } = {};
                                        findSymbolProperties(fieldGroupBody, properties);

                                        alPageFields.fields.push({
                                            name: fieldGroupInfo.name,
                                            type: fieldGroupInfo.type,
                                            section: 'layout',
                                            sourceExpr: '',
                                            isfield: false,
                                            properties: properties,
                                            iconName: fieldGroupInfo.extAnchor ? 'plug' : 'symbol-variable',
                                            level: currentLevel,
                                            startLine: lineNumber
                                        });
                                    }
                                }

                                let fieldInfo: { name: string; sourceExpr: string } = { name: '', sourceExpr: '' };
                                if (isPageFieldDefinition(lineText, fieldInfo)) {
                                    // Ricerca proprietà 
                                    const fieldBody = extractElementDefinitionFromObjectTextArray(lines, linePos, false);
                                    const properties: { [key: string]: string } = {};
                                    findSymbolProperties(fieldBody, properties);

                                    alPageFields.fields.push({
                                        name: fieldInfo.name,
                                        section: 'layout',
                                        isfield: true,
                                        externalFieldExt: false,
                                        type: fieldInfo.sourceExpr,
                                        sourceExpr: fieldInfo.sourceExpr,
                                        properties: properties,
                                        iconName: 'symbol-field',
                                        level: currentLevel > 0 ? 1 : 0,
                                        startLine: lineNumber,
                                    });
                                }
                                else {
                                    if (alObject.isPageExt()) {
                                        if (isPageExternalFieldDefinition(lines, linePos, fieldInfo)) {
                                            // Ricerca proprietà 
                                            const fieldBody = extractElementDefinitionFromObjectTextArray(lines, linePos, false);
                                            const properties: { [key: string]: string } = {};
                                            findSymbolProperties(fieldBody, properties);

                                            alPageFields.fields.push({
                                                name: fieldInfo.name,
                                                section: 'layout',
                                                isfield: true,
                                                externalFieldExt: true,
                                                type: fieldInfo.sourceExpr,
                                                sourceExpr: fieldInfo.sourceExpr,
                                                properties: properties,
                                                iconName: 'symbol-field',
                                                level: currentLevel > 0 ? 1 : 0,
                                                startLine: lineNumber,
                                            });
                                        }
                                    }
                                }
                            }

                            if (lineText.includes("{")) {
                                currentLevel++;
                            }
                            if (lineText.includes("}")) {
                                currentLevel--;
                            }
                        }
                    });

                    if (alPageFields.fields) {
                        if (alPageFields.fields.length > 0) {
                            // Order by StartLine
                            alPageFields.fields.sort((a, b) => a.startLine - b.startLine);
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
export function isPageExternalFieldDefinition(objectLines: string[], currPosition: number, fieldInfo: { name: string, sourceExpr: string }): boolean {
    if (objectLines[currPosition] && objectLines[currPosition + 1]) {
        const currLineText = cleanObjectLineText(objectLines[currPosition].trim());
        const nextLineText = cleanObjectLineText(objectLines[currPosition + 1].trim());

        if (currLineText.endsWith('{') || nextLineText.startsWith('{')) {

            const match = currLineText.match(regExpr.pageExtField);
            if (match) {
                fieldInfo.name = match[1].trim();
                return true;
            }
        }
    }

    return false;
}

export function isPageFieldAreaDefinition(lineText: string, fieldAreaInfo: { name: string }): boolean {
    const match = lineText.trim().match(regExpr.pageFieldArea);
    if (match) {
        fieldAreaInfo.name = match[1];
        fieldAreaInfo.name = fieldAreaInfo.name.replace('&', '');

        return true;
    }

    return false;
}
export function isPageFieldGroupDefinition(lineText: string, fieldGroupInfo: { type: string, name: string, extAnchor: boolean }): boolean {
    let match = lineText.trim().match(regExpr.pageFieldGroup);
    if (match) {
        fieldGroupInfo.type = normalizeElementTypeString(match[1]);
        fieldGroupInfo.name = match[2];
        fieldGroupInfo.name = fieldGroupInfo.name.replace('&', '');
        fieldGroupInfo.extAnchor = false;

        return true;
    }

    match = lineText.trim().match(regExpr.pageFieldAnchor);
    if (match) {
        fieldGroupInfo.type = normalizeElementTypeString(match[1]);
        fieldGroupInfo.name = match[2];
        fieldGroupInfo.name = fieldGroupInfo.name.replace('&', '');
        fieldGroupInfo.extAnchor = true;

        if (fieldGroupInfo.name.toLowerCase() === 'factboxes') {
            return false;
        }

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
                let codeSectionsInfo: { startLine: number, content: string }[] = [];
                if (extractCodeSection('actions', alObject.objectContentText, false, codeSectionsInfo)) {
                    for (const section of codeSectionsInfo) {
                        const lines = section.content.split('\n');

                        let insideMultiLineComment: boolean;
                        let actionAreaInfo: { name: string, extAnchor: boolean } = { name: '', extAnchor: false };
                        let actionGroupStack: { name: string, level: number }[] = [];
                        let currentLevel = -1;

                        lines.forEach((lineText, linePos) => {
                            lineText = cleanObjectLineText(lineText);
                            const lineNumber = section.startLine + linePos;

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
                                        iconName: actionAreaInfo.extAnchor ? 'plug' : 'location',
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
                                        findSymbolProperties(actionGroupBody, properties);

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
                                        findSymbolProperties(actionBody, properties);

                                        alPageActions.actions.push({
                                            kind: 'action',
                                            name: actionInfo.name,
                                            level: currentLevel,
                                            sourceAction: actionInfo.sourceAction,
                                            area: actionAreaInfo.name,
                                            actionGroupRef: lastGroupName ? lastGroupName.name : '',
                                            isAction: true,
                                            properties: properties,
                                            iconName: 'github-action',
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
}

export function isActionAreaDefinition(lineText: string, actionAreaInfo: { name: string, extAnchor: boolean }): boolean {
    let match = lineText.trim().match(regExpr.pageActionArea);
    if (match) {
        actionAreaInfo.name = match[1] || 'actions';
        actionAreaInfo.extAnchor = false;

        return true;
    }

    match = lineText.trim().match(regExpr.pageActionAnchor);
    if (match) {
        actionAreaInfo.name = match[2] || 'actions';
        actionAreaInfo.extAnchor = true;

        return true;
    }

    return false;
}

export function isPageCueGroupDefinition(lineText: string, cueGroupInfo: { name: string }): boolean {
    const match = lineText.trim().match(regExpr.pageCueGroup);
    if (match) {
        cueGroupInfo.name = match[1] || 'Cuegroup';
        cueGroupInfo.name = cueGroupInfo.name.replace('&', '');

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

//#region Triggers
export function findPageTriggers(alObject: ALObject, alObjectTriggers: ALObjectTriggers) {
    if (alObject) {
        if (alObject.isPage() || alObject.isPageExt()) {
            if (alObject.objectContentText) {
                const lines = alObject.objectContentText.split('\n');
                let insideMultiLineComment: boolean;
                let currFieldName: string;
                let insideExtField: boolean;

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
                        if (currFieldName) {
                            if (lineText.includes("}")) {
                                currFieldName = '';
                                insideExtField = false;
                            }
                            if (currFieldName) {
                                let triggerInfo: { name: string, scope: string } = { name: '', scope: '' };
                                if (isFieldTriggerDefinition(alObject, lineText, triggerInfo)) {
                                    if (triggerInfo.name) {
                                        alObjectTriggers.triggers.push({
                                            scope: '',
                                            name: `${currFieldName} - ${triggerInfo.name}`,
                                            sortIndex: lineNumber,
                                            groupIndex: insideExtField ? 10 : 20,
                                            groupName: insideExtField ? 'Extended Fields' : 'Fields',
                                            iconName: 'server-process',
                                            startLine: lineNumber
                                        });
                                    }
                                }
                            }
                        }
                        else {
                            let fieldInfo: { name: string; sourceExpr: string } = { name: '', sourceExpr: '' };
                            if (isPageFieldDefinition(lineText, fieldInfo)) {
                                currFieldName = fieldInfo.name;
                                insideExtField = false;
                            }
                            else {
                                if (alObject.isPageExt()) {
                                    if (isPageExternalFieldDefinition(lines, linePos, fieldInfo)) {
                                        currFieldName = fieldInfo.name;
                                        insideExtField = true;
                                    }
                                }
                            }
                            let triggerInfo: { name: string } = { name: '' };
                            if (isPageTriggerDefinition(lineText, triggerInfo)) {
                                if (triggerInfo.name) {
                                    alObjectTriggers.triggers.push({
                                        scope: '',
                                        name: triggerInfo.name,
                                        sortIndex: lineNumber,
                                        groupIndex: 0,
                                        groupName: 'Page',
                                        iconName: 'server-process',
                                        startLine: lineNumber
                                    });
                                }
                            }
                        }
                    }
                });

                if (alObjectTriggers.triggers) {
                    if (alObjectTriggers.triggers.length > 0) {
                        // Order by StartLine
                        alObjectTriggers.triggers.sort((a, b) => a.sortIndex - b.sortIndex);
                    }
                }
            }
        }
    }
}
export function isPageTriggerDefinition(lineText: string, triggerInfo: { name: string }): boolean {
    const match = lineText.trim().match(regExpr.pageTrigger);
    if (match) {
        triggerInfo.name = match[1];
        return true;
    }

    return false;
}
//#endregion Triggers

//#endregion Page

//#region Report
//#region Data Items
export function findReportDataitems(alObject: ALObject, alReportDataitems: ALObjectDataItems) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isReport() || alObject.isReportExt()) {
                let codeSectionsInfo: { startLine: number, content: string }[] = [];
                if (extractCodeSection('dataset', alObject.objectContentText, false, codeSectionsInfo)) {
                    const datasetTxtLines = codeSectionsInfo[0].content.split('\n');
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
                                                        findSymbolProperties(elementDefinitionText, properties);
                                                    }
                                                }
                                                // Aggiungo il l'elemento alla lista
                                                alReportDataitems.dataItems.push({
                                                    name: lastEntry.name,
                                                    sourceExpression: lastEntry.sourceExpression,
                                                    level: lastEntry.level,
                                                    startLine: lastEntry.startLine,
                                                    endLine: codeSectionsInfo[0].startLine + lineNumber,
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
                                        startLine: codeSectionsInfo[0].startLine + lineNumber,
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

//#region Fields
export function findReportColumns(alObject: ALObject, alReportColumns: ALObjectFields) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isReport() || alObject.isReportExt()) {
                let alReportDataitems: ALObjectDataItems;
                alReportDataitems = new ALObjectDataItems(alObject);

                // Ricerca sezione dataset
                let codeSectionsInfo: { startLine: number, content: string }[] = [];
                if (extractCodeSection('dataset', alObject.objectContentText, true, codeSectionsInfo)) {
                    let objectLines: string[] = alObject.objectContentText.split('\n');
                    objectLines = objectLines.map(line => line.trim().toLowerCase());

                    let match: RegExpExecArray | null;
                    while ((match = regExpr.reportColumnDefinition.exec(codeSectionsInfo[0].content)) !== null) {
                        const fieldName = match[1].trim();
                        if (fieldName) {
                            const sourceExpr = match[2].trim();

                            // Ricerca proprietà 
                            const fieldBody = match[3].trim();
                            const properties: { [key: string]: string } = {};
                            findSymbolProperties(fieldBody, properties);

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
                                section: 'dataset',
                                sourceExpr: sourceExpr,
                                properties: properties,
                                isfield: true,
                                iconName: 'symbol-field',
                                dataItem: refDataItem ? refDataItem.name : '',
                                level: 0,
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
//#endregion Fields

//#region Request Page
export function findRequestPageFields(alObject: ALObject, alReqPageFields: ALObjectFields) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isReport() || alObject.isReportExt()) {
                // Ricerca sezione requestpage
                let reqPageSectionsInfo: { startLine: number, content: string }[] = [];
                if (extractCodeSection('requestpage', alObject.objectContentText, false, reqPageSectionsInfo)) {
                    let codeSectionsInfo: { startLine: number, content: string }[] = [];
                    if (extractCodeSection('layout', reqPageSectionsInfo[0].content, false, codeSectionsInfo)) {
                        codeSectionsInfo[0].startLine += reqPageSectionsInfo[0].startLine;
                        const lines = codeSectionsInfo[0].content.split('\n');

                        let insideMultiLineComment: boolean;
                        let currentLevel = -1;

                        lines.forEach((lineText, linePos) => {
                            lineText = cleanObjectLineText(lineText);
                            const lineNumber = codeSectionsInfo[0].startLine + linePos;

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
                                if (currentLevel >= 0) {
                                    let fieldAreaInfo: { name: string } = { name: '' };
                                    if (isPageFieldAreaDefinition(lineText, fieldAreaInfo)) {
                                        currentLevel = -1;
                                    }

                                    let fieldGroupInfo: { type: string, name: string, extAnchor: boolean } = { type: '', name: '', extAnchor: false };
                                    if (isPageFieldGroupDefinition(lineText, fieldGroupInfo)) {
                                        if (currentLevel === 0) {
                                            const fieldGroupBody = extractElementDefinitionFromObjectTextArray(lines, linePos, false);
                                            const properties: { [key: string]: string } = {};
                                            findSymbolProperties(fieldGroupBody, properties);

                                            alReqPageFields.fields.push({
                                                name: fieldGroupInfo.name,
                                                type: fieldGroupInfo.type,
                                                section: 'requestpage',
                                                sourceExpr: '',
                                                isfield: false,
                                                dataItem: 'RequestPage',
                                                properties: properties,
                                                iconName: fieldGroupInfo.extAnchor ? 'plug' : 'symbol-variable',
                                                level: currentLevel,
                                                startLine: lineNumber
                                            });
                                        }
                                    }

                                    let fieldInfo: { name: string; sourceExpr: string } = { name: '', sourceExpr: '' };
                                    if (isPageFieldDefinition(lineText, fieldInfo)) {
                                        // Ricerca proprietà 
                                        const fieldBody = extractElementDefinitionFromObjectTextArray(lines, linePos, false);
                                        const properties: { [key: string]: string } = {};
                                        findSymbolProperties(fieldBody, properties);

                                        alReqPageFields.fields.push({
                                            name: fieldInfo.name,
                                            section: 'requestpage',
                                            isfield: true,
                                            type: fieldInfo.sourceExpr,
                                            dataItem: 'RequestPage',
                                            sourceExpr: fieldInfo.sourceExpr,
                                            properties: properties,
                                            iconName: 'symbol-field',
                                            level: currentLevel > 0 ? 1 : 0,
                                            startLine: lineNumber,
                                        });
                                    }
                                }

                                if (lineText.includes("{")) {
                                    currentLevel++;
                                }
                                if (lineText.includes("}")) {
                                    currentLevel--;
                                }
                            }
                        });

                        if (alReqPageFields.fields) {
                            if (alReqPageFields.fields.length > 0) {
                                // Order by StartLine
                                alReqPageFields.fields.sort((a, b) => a.startLine - b.startLine);
                            }
                        }
                    }
                }
            }
        }
    }
}

export function findRequestPageActions(alObject: ALObject, alPageActions: ALObjectActions) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isReport() || alObject.isReportExt) {
                let reqPageSectionsInfo: { startLine: number, content: string }[] = [];
                if (extractCodeSection('requestpage', alObject.objectContentText, false, reqPageSectionsInfo)) {
                    let codeSectionsInfo: { startLine: number, content: string }[] = [];
                    if (extractCodeSection('actions', alObject.objectContentText, false, codeSectionsInfo)) {
                        codeSectionsInfo[0].startLine += reqPageSectionsInfo[0].startLine;
                        const lines = codeSectionsInfo[0].content.split('\n');

                        let insideMultiLineComment: boolean;
                        let actionAreaInfo: { name: string, extAnchor: boolean } = { name: '', extAnchor: false };
                        let actionGroupStack: { name: string, level: number }[] = [];
                        let currentLevel = -1;

                        lines.forEach((lineText, linePos) => {
                            lineText = cleanObjectLineText(lineText);
                            const lineNumber = codeSectionsInfo[0].startLine + linePos;

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
                                        iconName: actionAreaInfo.extAnchor ? 'plug' : 'location',
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
                                        findSymbolProperties(actionGroupBody, properties);

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
                                        findSymbolProperties(actionBody, properties);

                                        alPageActions.actions.push({
                                            kind: 'action',
                                            name: actionInfo.name,
                                            level: currentLevel === 0 ? 1 : currentLevel,
                                            sourceAction: actionInfo.sourceAction,
                                            area: actionAreaInfo.name,
                                            actionGroupRef: lastGroupName ? lastGroupName.name : '',
                                            isAction: true,
                                            properties: properties,
                                            iconName: 'github-action',
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

//#region Triggers
export function findReportTriggers(alObject: ALObject, alObjectTriggers: ALObjectTriggers) {
    if (alObject) {
        if (alObject.isReport() || alObject.isReportExt()) {
            if (alObject.objectContentText) {
                const lines = alObject.objectContentText.split('\n');
                let insideMultiLineComment: boolean;
                let dataitems: { name: string, linePosition: number, level: number }[] = [];
                let currentLevel = -2;
                let currentSection = '';
                let currFieldName = '';

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
                        if (!currentSection) {
                            if (lineText.trim().toLowerCase() === 'dataset') {
                                currentSection = 'dataset';
                                currentLevel = -1;
                            }
                            else {

                                if (lineText.trim().toLowerCase() === 'requestpage') {
                                    currentSection = 'requestpage';
                                    currentLevel = -1;
                                }
                            }
                        }

                        if (lineText.includes("{")) {
                            currentLevel++;
                        }

                        if (lineText.includes("}")) {
                            currentLevel--;

                            if (currentLevel < 0) {
                                currentSection = '';
                            } else {
                                let currDataitem = null;
                                if (dataitems.length > 0) {
                                    currDataitem = dataitems[dataitems.length - 1];
                                    if (currDataitem.level === currentLevel) {
                                        dataitems.pop();
                                    }
                                }
                            }
                        }

                        switch (currentSection) {

                            case 'dataset': {
                                let dataItemInfo: { name: string, sourceExpr: string, linePos: number, level: number } = {
                                    name: '',
                                    sourceExpr: '',
                                    linePos: 0,
                                    level: 0
                                };
                                if (isReportDataItemDefinition(lineText, dataItemInfo)) {
                                    if (dataItemInfo.name) {
                                        dataitems.push({ name: dataItemInfo.name, linePosition: lineNumber, level: currentLevel });
                                    }
                                }

                                let triggerInfo: { name: string } = { name: '' };
                                if (isReportTriggerDefinition(currentSection, lineText, triggerInfo)) {
                                    let currDataitem = null;
                                    if (dataitems.length > 0) {
                                        currDataitem = dataitems[dataitems.length - 1];
                                    }
                                    if (currDataitem) {
                                        if (triggerInfo.name) {
                                            alObjectTriggers.triggers.push({
                                                scope: '',
                                                name: `${currDataitem.name} - ${triggerInfo.name}`,
                                                sortIndex: currDataitem.linePosition,
                                                groupIndex: 10,
                                                groupName: 'Dataitems',
                                                iconName: 'server-process',
                                                startLine: lineNumber
                                            });
                                        }
                                    }
                                }

                                break;
                            }

                            case 'requestpage': {
                                if (currFieldName) {
                                    if (lineText.includes("}")) {
                                        currFieldName = '';
                                    }
                                    if (currFieldName) {
                                        let triggerInfo: { name: string, scope: string } = { name: '', scope: '' };
                                        if (isFieldTriggerDefinition(alObject, lineText, triggerInfo)) {
                                            if (triggerInfo.name) {
                                                alObjectTriggers.triggers.push({
                                                    scope: '',
                                                    name: `${currFieldName} - ${triggerInfo.name}`,
                                                    sortIndex: lineNumber,
                                                    groupIndex: 110,
                                                    groupName: 'Request Fields',
                                                    iconName: 'server-process',
                                                    startLine: lineNumber
                                                });
                                            }
                                        }
                                    }
                                }
                                else {
                                    let fieldInfo: { name: string; sourceExpr: string } = { name: '', sourceExpr: '' };
                                    if (isPageFieldDefinition(lineText, fieldInfo)) {
                                        currFieldName = fieldInfo.name;
                                    }
                                    else {
                                        let triggerInfo: { name: string } = { name: '' };
                                        if (isReportTriggerDefinition(currentSection, lineText, triggerInfo)) {
                                            if (triggerInfo.name) {
                                                alObjectTriggers.triggers.push({
                                                    scope: '',
                                                    name: triggerInfo.name,
                                                    sortIndex: lineNumber,
                                                    groupIndex: 100,
                                                    groupName: 'Request Page',
                                                    iconName: 'server-process',
                                                    startLine: lineNumber
                                                });
                                            }
                                        }
                                    }
                                }

                                break;
                            }

                            default: {
                                let triggerInfo: { name: string, scope: string } = { name: '', scope: '' };
                                if (isReportTriggerDefinition('', lineText, triggerInfo)) {
                                    if (triggerInfo.scope === 'object') {
                                        let currDataitem = null;
                                        if (dataitems.length > 0) {
                                            currDataitem = dataitems[dataitems.length - 1];
                                        }

                                        if (triggerInfo.name) {
                                            alObjectTriggers.triggers.push({
                                                scope: '',
                                                name: currDataitem ? `${currDataitem.name} - ${triggerInfo.name}` : triggerInfo.name,
                                                sortIndex: currDataitem ? currDataitem.linePosition : lineNumber,
                                                groupIndex: 0,
                                                groupName: 'Report',
                                                iconName: 'server-process',
                                                startLine: lineNumber
                                            });
                                        }
                                    }
                                }

                                break;
                            }
                        }
                    }
                });

                if (alObjectTriggers.triggers) {
                    if (alObjectTriggers.triggers.length > 0) {
                        // Order by StartLine
                        alObjectTriggers.triggers.sort((a, b) => a.sortIndex - b.sortIndex);
                    }
                }
            }
        }
    }
}

export function isReportTriggerDefinition(section: string, lineText: string, triggerInfo: { name: string }): boolean {
    switch (section) {
        case '': {
            const match = lineText.trim().match(regExpr.reportTrigger);
            if (match) {
                triggerInfo.name = match[1];

                return true;
            }

            break;
        }

        case 'dataset': {
            const match = lineText.trim().match(regExpr.reportDataitemTrigger);
            if (match) {
                triggerInfo.name = match[1];

                return true;
            }

            break;
        }

        case 'requestpage': {
            const match = lineText.trim().match(regExpr.pageTrigger);
            if (match) {
                triggerInfo.name = match[1];

                return true;
            }

            break;
        }
    }

    return false;
}
//#endregion Triggers

//#endregion Report

//#region Query
//#region Data Items
export function findQueryDataitems(alObject: ALObject, alQueryDataitems: ALObjectDataItems) {
    if (alObject) {
        if (alObject.objectContentText) {
            if (alObject.isQuery()) {
                let codeSectionsInfo: { startLine: number, content: string }[] = [];
                if (extractCodeSection('elements', alObject.objectContentText, false, codeSectionsInfo)) {
                    const datasetTxtLines = codeSectionsInfo[0].content.split('\n');
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
                                                        findSymbolProperties(elementDefinitionText, properties);
                                                    }
                                                }
                                                // Aggiungo il l'elemento alla lista
                                                alQueryDataitems.dataItems.push({
                                                    name: lastEntry.name,
                                                    sourceExpression: lastEntry.sourceExpression,
                                                    level: lastEntry.level,
                                                    startLine: lastEntry.startLine,
                                                    endLine: codeSectionsInfo[0].startLine + lineNumber,
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
                                        startLine: codeSectionsInfo[0].startLine + lineNumber,
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

                // Ricerca sezione elements
                let codeSectionsInfo: { startLine: number, content: string }[] = [];
                if (extractCodeSection('elements', alObject.objectContentText, true, codeSectionsInfo)) {
                    let objectLines: string[] = alObject.objectContentText.split('\n');
                    objectLines = objectLines.map(line => line.trim().toLowerCase());

                    let match: RegExpExecArray | null;
                    while ((match = regExpr.queryColumnDefinition.exec(codeSectionsInfo[0].content)) !== null) {
                        const columnType = match[1].trim().toLowerCase();
                        const fieldName = match[2].trim();
                        if (fieldName) {
                            const sourceExpr = match[3].trim();

                            // Ricerca proprietà 
                            const fieldBody = match[4].trim();
                            const properties: { [key: string]: string } = {};
                            findSymbolProperties(fieldBody, properties);

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
                                section: 'elements',
                                type: columnType.toLowerCase(),
                                sourceExpr: sourceExpr,
                                isfield: true,
                                properties: properties,
                                iconName: (properties['method']) ? 'symbol-operator' :
                                    (columnType === 'filter') ? 'filter' : 'symbol-field',
                                dataItem: refDataItem ? refDataItem.name : '',
                                level: 0,
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

//#region Triggers
export function findQueryTriggers(alObject: ALObject, alObjectTriggers: ALObjectTriggers) {
    if (alObject) {
        if (alObject.isQuery()) {
            if (alObject.objectContentText) {
                const lines = alObject.objectContentText.split('\n');
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
                        let triggerInfo: { name: string, scope: string } = { name: '', scope: '' };
                        if (isQueryTriggerDefinition(lineText, triggerInfo)) {
                            if (triggerInfo.name) {
                                alObjectTriggers.triggers.push({
                                    scope: '',
                                    name: triggerInfo.name,
                                    sortIndex: lineNumber,
                                    groupIndex: 0,
                                    groupName: 'Query',
                                    iconName: 'server-process',
                                    startLine: lineNumber
                                });
                            }
                        }
                    }
                });

                if (alObjectTriggers.triggers) {
                    if (alObjectTriggers.triggers.length > 0) {
                        // Order by StartLine
                        alObjectTriggers.triggers.sort((a, b) => a.sortIndex - b.sortIndex);
                    }
                }
            }
        }
    }
}

export function isQueryTriggerDefinition(lineText: string, triggerInfo: { name: string }): boolean {
    const match = lineText.trim().match(regExpr.queryTrigger);
    if (match) {
        triggerInfo.name = match[1];
        return true;
    }
    return false;
}
//#endregion Triggers

//#endregion Query

//#region Fields
export function findObjectFields(alObject: ALObject, alObjectFields: ALObjectFields) {
    if (alObject) {
        if (alObject.objectContentText) {
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
                                        section: 'fields',
                                        type: tableField.type,
                                        isfield: true,
                                        pkIndex: pkIndex,
                                        iconName: (pkIndex > 0) ? 'key' : 'symbol-field',
                                        level: 0,
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
                                        section: 'layout',
                                        type: pageField.sourceExpr,
                                        sourceExpr: pageField.sourceExpr,
                                        isfield: true,
                                        iconName: 'symbol-field',
                                        level: 0,
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
                                        section: 'dataset',
                                        type: reportField.sourceExpr,
                                        sourceExpr: reportField.sourceExpr,
                                        isfield: true,
                                        dataItem: dataitemName,
                                        iconName: 'symbol-field',
                                        level: 0,
                                        startLine: lineNumber
                                    });

                                    return;
                                }
                                else {
                                    if (isReportReqPageFieldDefinition(lineText, reportField)) {
                                        alObjectFields.fields.push({
                                            id: 0,
                                            name: reportField.name,
                                            section: 'requestpage',
                                            type: reportField.sourceExpr,
                                            sourceExpr: reportField.sourceExpr,
                                            isfield: true,
                                            dataItem: '',
                                            iconName: 'symbol-field',
                                            level: 0,
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
                                        section: 'elements',
                                        type: reportField.sourceExpr,
                                        sourceExpr: reportField.sourceExpr,
                                        isfield: true,
                                        iconName: 'symbol-field',
                                        dataItem: dataitemName,
                                        level: 0,
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
    }
}
//#endregion Fields

//#region Actions
export function findObjectActions(alObject: ALObject, alObjectActions: ALObjectActions) {
    if (alObject) {
        if (alObject.objectContentText) {
            let validObjectType = alObject.isPage() || alObject.isPageExt ||
                alObject.isReport() || alObject.isReportExt();

            if (validObjectType) {
                const lines = alObject.objectContentText.split('\n');
                let insideMultiLineComment: boolean;
                let actionAreaInfo: { name: string, extAnchor: boolean } = { name: '', extAnchor: false };

                lines.forEach((lineText, linePos) => {
                    const lineNumber = linePos;

                    // Verifica inizio-fine commento multi-riga
                    if (isMultiLineCommentStart(lineText)) {
                        insideMultiLineComment = true;
                    }
                    if (isMultiLineCommentEnd(lineText)) {
                        insideMultiLineComment = false;
                    }

                    // Se la riga è dentro un commento multi-linea o è un commento su singola riga, ignorala
                    if (insideMultiLineComment || isCommentedLine(lineText)) {
                        return; // Ignora questa riga
                    }

                    if (!isActionAreaDefinition(lineText, actionAreaInfo)) {
                        let actionInfo: { name: string, sourceAction: string } = { name: '', sourceAction: '' };

                        if (isActionDefinition(lineText, actionInfo)) {
                            alObjectActions.actions.push({
                                kind: 'action',
                                name: actionInfo.name,
                                sourceAction: actionInfo.sourceAction,
                                area: actionAreaInfo.name,
                                actionGroupRef: '',
                                isAction: true,
                                iconName: 'github-action',
                                startLine: lineNumber,
                                level: 0,
                            });
                        }
                    }
                });

                if (alObjectActions.actions) {
                    if (alObjectActions.actions.length > 0) {
                        // Order by StartLine
                        alObjectActions.actions.sort((a, b) => a.startLine - b.startLine);
                    }
                }
            }
        }
    }
}
//#endregion Actions

//#region Dataitems
export function findObjectDataItems(alObject: ALObject, alObjectDataItems: ALObjectDataItems) {
    if (alObject) {
        if (alObject.objectContentText) {
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
    }
}
//#endregion Dataitems

//#region Procedures
export function findObjectProcedures(alObject: ALObject, alObjectProcedures: ALObjectProcedures) {
    if (alObject) {
        if (alObject.objectContentText) {
            const lines = alObject.objectContentText.split('\n');
            let insideMultiLineComment: boolean;
            let insideIntegrationEventDecl: boolean;
            let insideBusinessEventDecl: boolean;
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
                        insideIntegrationEventDecl = isIntegrationEventDeclaration(lineText);
                        insideBusinessEventDecl = false;
                        if (!insideIntegrationEventDecl) {
                            insideBusinessEventDecl = isBusinessEventDeclaration(lineText);
                        }
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
                                let symbol = (insideIntegrationEventDecl || insideBusinessEventDecl) ? 'symbol-event' :
                                    insideEventSubscription ? 'plug' :
                                        procedureInfo.scope === 'global' ? 'symbol-function' :
                                            procedureInfo.scope === 'protected' ? 'symbol-function' :
                                                procedureInfo.scope === 'local' ? 'shield' :
                                                    procedureInfo.scope === 'internal' ? 'symbol-variable' :
                                                        'symbol-function';

                                if (procedureInfo.name) {
                                    const lineRegionPath = alRegionMgr.findOpenRegionsPathByDocLine(alObjectRegions, lineNumber);
                                    alObjectProcedures.procedures.push({
                                        scope: insideIntegrationEventDecl ? '' :
                                            insideBusinessEventDecl ? '' :
                                                insideEventSubscription ? '' :
                                                    procedureInfo.scope.toLowerCase(),
                                        name: procedureInfo.name,
                                        sourceEvent: insideEventSubscription ? eventSubscrName : '',
                                        groupName: insideIntegrationEventDecl ? 'Integration Events' :
                                            insideBusinessEventDecl ? 'Business Events' :
                                                insideEventSubscription ? 'Event Subscriptions' :
                                                    'Procedures',
                                        iconName: symbol,
                                        regionPath: lineRegionPath,
                                        startLine: lineNumber
                                    });
                                    insideIntegrationEventDecl = false;
                                    insideBusinessEventDecl = false;
                                    insideEventSubscription = false;
                                }
                            }
                            else {
                                if ((insideIntegrationEventDecl || insideBusinessEventDecl || insideEventSubscription) && (!lineText.trim().startsWith('['))) {
                                    insideIntegrationEventDecl = false;
                                    insideBusinessEventDecl = false;
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

    return false;
}

//#region Integration Events
export function isIntegrationEventDeclaration(lineText: string): boolean {
    if (regExpr.integrationEvent.test(lineText.trim())) {
        return true;
    }
    return false;
}
export function isBusinessEventDeclaration(lineText: string): boolean {
    if (regExpr.businessEvent.test(lineText.trim())) {
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
//#endregion Procedures

//#region Triggers
export function findObjectTriggers(alObject: ALObject, alObjectTriggers: ALObjectTriggers) {
    if (alObject) {
        if (alObject.objectContentText) {
            const lines = alObject.objectContentText.split('\n');
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
                    let triggerInfo: { name: string, scope: string } = { name: '', scope: '' };
                    if (isTriggerDefinition(alObject, lineText, triggerInfo)) {
                        if (triggerInfo.name) {
                            alObjectTriggers.triggers.push({
                                scope: '',
                                name: triggerInfo.name,
                                sortIndex: lineNumber,
                                groupIndex: 0,
                                groupName: '',
                                iconName: 'server-process',
                                startLine: lineNumber
                            });
                        }
                    }
                }
            });

            if (alObjectTriggers.triggers) {
                if (alObjectTriggers.triggers.length > 0) {
                    // Order by StartLine
                    alObjectTriggers.triggers.sort((a, b) => a.sortIndex - b.sortIndex);
                }
            }
        }
    }
}

export function isTriggerDefinition(alObject: ALObject, lineText: string, triggerInfo: { name: string, scope: string }): boolean {
    switch (true) {
        case (alObject.isTable() || alObject.isTableExt()):
            {
                const match = lineText.trim().match(regExpr.tableTrigger);
                if (match) {
                    triggerInfo.scope = 'object';
                    triggerInfo.name = match[1];

                    return true;
                }
                break;
            }
        case (alObject.isPage() || alObject.isPageExt()):
            {
                const match = lineText.trim().match(regExpr.pageTrigger);
                if (match) {
                    triggerInfo.scope = 'object';
                    triggerInfo.name = match[1];

                    return true;
                }
                break;
            }
        case (alObject.isReport()):
            {
                let match = lineText.trim().match(regExpr.reportTrigger);
                if (match) {
                    triggerInfo.scope = 'object';
                    triggerInfo.name = match[1];

                    return true;
                }

                match = lineText.trim().match(regExpr.reportDataitemTrigger);
                if (match) {
                    triggerInfo.scope = 'dataitem';
                    triggerInfo.name = match[1];

                    return true;
                }

                match = lineText.trim().match(regExpr.pageTrigger);
                if (match) {
                    triggerInfo.scope = 'requestpage';
                    triggerInfo.name = match[1];

                    return true;
                }

                break;
            }
        case (alObject.isCodeunit()):
            {
                const match = lineText.trim().match(regExpr.codeunitTrigger);
                if (match) {
                    triggerInfo.scope = 'object';
                    triggerInfo.name = match[1];

                    return true;
                }
                break;
            }
        case (alObject.isQuery()):
            {
                const match = lineText.trim().match(regExpr.queryTrigger);
                if (match) {
                    triggerInfo.scope = 'object';
                    triggerInfo.name = match[1];

                    return true;
                }
                break;
            }
    }

    return false;
}
export function isFieldTriggerDefinition(alObject: ALObject, lineText: string, triggerInfo: { name: string }): boolean {
    switch (true) {
        case (alObject.isTable() || alObject.isTableExt()):
            {
                const match = lineText.trim().match(regExpr.tableFieldTrigger);
                if (match) {
                    triggerInfo.name = match[1];

                    return true;
                }
                break;
            }
        case (alObject.isPage() || alObject.isPageExt()): {
            const match = lineText.trim().match(regExpr.pageFieldTrigger);
            if (match) {
                triggerInfo.name = match[1];

                return true;
            }
            break;
        }
        case (alObject.isReport() || alObject.isReportExt()): {
            const match = lineText.trim().match(regExpr.pageFieldTrigger);
            if (match) {
                triggerInfo.name = match[1];

                return true;
            }
            break;
        }
    }

    return false;
}
//#endregion Triggers

//#region Element Properties
export function findObjectProperties(objectType: string, objectDefinitionText: string, properties: { [key: string]: string }) {
    const propertiesRegex = regExpr.objectProperties;

    let propMatch: RegExpExecArray | null;
    let singleLineDefText = objectDefinitionText.replace(/[\n\r]/g, '');  // Definizione su singola riga senza \n e \r
    singleLineDefText = singleLineDefText.replace(/\s+/g, ' '); // Riduco il numero di spazi tra una stringa e l'altra 

    while ((propMatch = propertiesRegex.exec(singleLineDefText)) !== null) {
        let name = propMatch[1].trim().toLowerCase();
        if ((objectType.toLowerCase() === 'permissionset') && (name.toLowerCase() === 'permissions')) {
            continue;
        }

        let value = propMatch[2].trim();

        // Prendo solo il valore tra apici (es Caption = 'Caption', locked=true;)
        const match = value.match(/^'([^']+)'/);
        if (match) {
            value = match[1];
        }

        properties[name] = value;
    }
}
export function findSymbolProperties(symbolDefinitionText: string, properties: { [key: string]: string }) {
    const propertiesRegex = regExpr.objectProperties;

    let propMatch: RegExpExecArray | null;
    let singleLineDefText = symbolDefinitionText.replace(/[\n\r]/g, '');  // Definizione su singola riga senza \n e \r
    singleLineDefText = singleLineDefText.replace(/\s+/g, ' '); // Riduco il numero di spazi tra una stringa e l'altra 

    while ((propMatch = propertiesRegex.exec(singleLineDefText)) !== null) {
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

function normalizeElementTypeString(elementType: string): string {
    switch (elementType.toLowerCase()) {
        case 'field': {
            return 'Field';
        }
        case 'action': {
            return 'Action';
        }
        case 'group': {
            return 'Group';
        }
        case 'repeater': {
            return 'Repeater';
        }
        case 'cuegroup': {
            return 'CueGroup';
        }
        case 'fixed': {
            return 'Fixed';
        }
        case 'grid': {
            return 'Grid';
        }
        case 'addfirst': {
            return 'AddFirst';
        }
        case 'addlast': {
            return 'AddLast';
        }
        case 'addbefore': {
            return 'AddBefore';
        }
        case 'addafter': {
            return 'AddAfter';
        }
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

//#region Variables

export function findObjectVariables(alObject: ALObject, alObjectVariables: ALObjectVariables) {
    if (alObject) {
        if (alObject.objectContentText) {
            const lines = alObject.objectContentText.split('\n');
            let insideMultiLineComment: boolean;
            let insideGlobalVarSection = false;
            let insideProcedureOrTrigger = false;

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
                    // Controlla se siamo in una sezione "procedure" o "trigger"
                    if (/^(local|internal|protected)?\s*(procedure|trigger)\b/.test(lineText)) {
                        insideProcedureOrTrigger = true;
                        insideGlobalVarSection = false;
                        return;
                    }

                    // Se troviamo un "begin" usciamo dalla sezione locale
                    if (/^begin\b/.test(lineText)) {
                        insideProcedureOrTrigger = false;
                        return;
                    }
                    // Controlla se siamo in una sezione "var" globale
                    if (/^var\s*$/.test(lineText) && !insideProcedureOrTrigger) {
                        insideGlobalVarSection = true;
                        return;
                    }

                    if (!insideGlobalVarSection) {
                        // Controlla se siamo in una sezione "protected var" globale
                        if (/^protected var\s*$/.test(lineText) && !insideProcedureOrTrigger) {
                            insideGlobalVarSection = true;
                            return;
                        }
                    }

                    // Controlla se siamo usciti dalla sezione globale
                    if (/^(procedure|trigger|begin)\b/.test(lineText)) {
                        insideGlobalVarSection = false;
                        return;
                    }

                    if (insideGlobalVarSection) {
                        let variableInfo: {
                            name: string,
                            type: string,
                            subtype?: string,
                            size?: number,
                            isALObject: boolean,
                            value?: string,
                            attributes?: string
                        } = { name: '', type: '', subtype: '', size: 0, value: '', isALObject: false, attributes: '' };
                        if (isVariableDefinition(lineText, variableInfo)) {
                            if (variableInfo.name) {
                                alObjectVariables.variables.push({
                                    name: variableInfo.name,
                                    type: variableInfo.type,
                                    subtype: variableInfo.subtype,
                                    value: variableInfo.value,
                                    size: variableInfo.size,
                                    attributes: variableInfo.attributes,
                                    isALObject: variableInfo.isALObject,
                                    scope: 'global',
                                    linePosition: lineNumber,
                                    groupName: getVariableGroupName(variableInfo.type, variableInfo.attributes),
                                    groupIndex: getVariableGroupIndex(variableInfo.type),
                                    iconName: alObjectVariables.getDefaultIconName(variableInfo.type)
                                });
                            }
                        }
                    }
                }
            });

            if (alObjectVariables.variables) {
                if (alObjectVariables.variables.length > 0) {
                    // Order by StartLine
                    alObjectVariables.variables.sort((a, b) => a.linePosition - b.linePosition);
                }
            }
        }
    }
}

function isVariableDefinition(
    lineText: string,
    variableInfo: {
        name: string,
        type: string,
        subtype?: string,
        size?: number,
        value?: string,
        isALObject: boolean,
        attributes?: string
    }
): boolean {
    if (lineText) {

        // Verifico se si tratta di una label
        //const cleanedText = lineText.replace(/,\s*Comment\s*=\s*'((?:''|[^'])*)'/gi, "").trim();
        for (const match of lineText.matchAll(regExpr.label)) {
            if (match && match.length > 1) {
                variableInfo.name = match[1];
                variableInfo.type = typeHelper.toPascalCase(match[2]);
                variableInfo.value = match[3];
                variableInfo.isALObject = false;
                variableInfo.attributes = '';
            }
        }
        if (variableInfo.name) {
            return true;
        }

        // Verifico se si tratta di Array
        for (const match of lineText.matchAll(regExpr.array)) {
            if (match && match.length > 1) {
                variableInfo.name = match[1];
                variableInfo.type = 'Array';
                variableInfo.value = '';
                variableInfo.subtype = match[3] ? `(${match[2]}) of [${match[3]}]` : match[4];
                variableInfo.isALObject = false;
                variableInfo.attributes = '';
            }
        }

        if (variableInfo.name) {
            return true;
        }

        // Verifico se si tratta di List o Dictionary
        for (const match of lineText.matchAll(regExpr.listDictionary)) {
            if (match && match.length > 1) {
                variableInfo.name = match[1];
                variableInfo.type = typeHelper.toPascalCase(match[2]);
                variableInfo.value = '';
                variableInfo.subtype = match[4] ? `of [${match[4]}]` : match[4];
                variableInfo.isALObject = false;
                variableInfo.attributes = '';
            }
        }

        if (variableInfo.name) {
            return true;
        }

        // Altre variabili
        const matches = Array.from(lineText.matchAll(regExpr.variable));
        if (matches) {
            matches.forEach((match) => {
                if (match[1]) {
                    variableInfo.name = match[1];
                    variableInfo.type = typeHelper.toPascalCase(match[2]);
                    variableInfo.subtype = typeHelper.addQuotesIfNeeded(match[3]);
                    variableInfo.size = Number(match[4]) || 0;
                    variableInfo.isALObject = typeHelper.isALObjectType(variableInfo.type);
                    variableInfo.attributes = (match[5]) ? typeHelper.toPascalCase(match[5]) : '';
                }
            });

            return true;
        }
    }

    return false;
}

function getVariableGroupName(type: string, attributes: string): string {
    switch (type.toLowerCase()) {
        case 'HttpClient'.toLowerCase(): {
            return 'HttpRequest';
        }
        case 'HttpContent'.toLowerCase(): {
            return 'HttpRequest';
        }
        case 'HttpHeaders'.toLowerCase(): {
            return 'HttpRequest';
        }
        case 'HttpRequestMessage'.toLowerCase(): {
            return 'HttpRequest';
        }
        case 'HttpResponseMessage'.toLowerCase(): {
            return 'HttpRequest';
        }


        case 'JsonObject'.toLowerCase(): {
            return 'Json';
        }
        case 'JsonArray'.toLowerCase(): {
            return 'Json';
        }
        case 'JsonToken'.toLowerCase(): {
            return 'Json';
        }
        case 'JsonValue'.toLowerCase(): {
            return 'Json';
        }
    }

    if (attributes) {
        return `${type} ${attributes}`;
    }
    return type;
}

function getVariableGroupIndex(type: string): number {
    switch (type.toLowerCase()) {
        case 'record': {
            return 1;
        }
        case 'page': {
            return 3;
        }
        case 'report': {
            return 4;
        }
        case 'codeunit': {
            return 5;
        }
        case 'enum': {
            return 6;
        }
        case 'label': {
            return 10;
        }
    }

    return 8;
}
//#endregion Variables

//#region Comments on Code
function removeCommentedLines(objectFileContent: string): string {
    if (objectFileContent) {
        const uncommentedContent = objectFileContent
            .replace(/\/\/.*/g, '') // Commenti di riga
            .replace(/\/\*[\s\S]*?\*\//g, ''); // Commenti multi-riga

        return uncommentedContent;
    }

    return '';
}

export function cleanObjectLineText(lineText: string): string {
    let newString = lineText;
    if (isCommentedLine(newString)) {
        newString = '';
    }

    if (isPragmaDirective(newString)) {
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
export function isPragmaDirective(lineText: string): boolean {
    if (lineText) {
        if (regExpr.pragmaDirective.test(lineText.trim())) {
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