import * as vscode from 'vscode';
import * as alFileMgr from './alObjectFileMgr';
import * as qpTools from '../tools/quickPickTools';
import { ALObject, ALObjectActions, ALObjectDataItems, ALTableFieldGroups, ALObjectFields, ALObjectProcedures, ALObjectRegions, ALTableKeys, ALObjectTriggers, ALObjectVariables } from './alObject';
import { ALObjectIndex } from './alObjectIndex';
import { TelemetryClient } from '../telemetry/telemetry';
interface ObjectElement {
    type: string,
    count: number,
    iconName: string,
    command: string,
    commandArgs?: any
}

//#region AL Object Explorer
export async function execALObjectExplorer(alObject?: ALObject) {
    TelemetryClient.logCommand('execALObjectExplorer');

    if (!alObject) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        const document = editor.document;
        alObject = alFileMgr.parseALObject(document);
    }

    let qpItems: qpTools.atsQuickPickItem[] = [];

    if (alObject) {
        let objectElements = countObjectElements(alObject, false);
        if (objectElements && (objectElements.length > 0)) {

            qpItems.push(
                {
                    label: 'Symbols in current object',
                    kind: vscode.QuickPickItemKind.Separator
                }
            );

            qpItems.push(
                ...objectElements.map(element => ({
                    label: `$(${element.iconName}) ${element.type}: ${element.count}`,
                    description: '',
                    detail: '',
                    command: element.command,
                    commandArgs: element.commandArgs,
                    buttons: [{
                        iconPath: new vscode.ThemeIcon('copy'),
                        tooltip: qpTools.btnCmdCopyAsText
                    }]
                })));
        }

        qpItems.push(
            {
                label: 'Tools',
                kind: vscode.QuickPickItemKind.Separator
            }
        );

        qpItems.push(
            {
                label: 'Find object...',
                command: 'ats.gotoWorkspaceObjects',
                iconPath: new vscode.ThemeIcon('extensions')
            }
        );

        qpItems.push(
            {
                label: 'Show open objects',
                command: 'ats.showOpenALObjects',
                iconPath: new vscode.ThemeIcon('files')
            }
        );

        qpItems.push(
            {
                label: 'Show local variables',
                command: 'ats.showAllLocalVariables',
                iconPath: new vscode.ThemeIcon('symbol-variable')
            }
        );

        qpTools.showQuickPick(qpItems, `${alObject.description}`, '', false, false, '', false, false, '');
    }
}

async function execALObjectExplorerByUri(docUri: vscode.Uri) {
    if (docUri) {
        const document = await vscode.workspace.openTextDocument(docUri);
        const alObject = alFileMgr.parseALObject(document);
        if (alObject) {
            execALObjectExplorer(alObject);
        }
    }
}

export function countObjectElements(alObject: ALObject, useShortNames: boolean): ObjectElement[] {
    let elements: ObjectElement[] = [];

    if (alObject.isReport() || alObject.isReportExt() || alObject.isQuery()) {
        try {
            let alObjectDataItems: ALObjectDataItems;
            alObjectDataItems = new ALObjectDataItems(alObject);
            if (alObjectDataItems) {
                if (alObjectDataItems.elementsCount > 0) {
                    elements.push({
                        type: 'Dataitems',
                        count: alObjectDataItems.elementsCount,
                        command: 'ats.showAllDataItems',
                        commandArgs: alObject.objectFileUri,
                        iconName: 'symbol-class'
                    });
                }
            }
        }
        catch {
            console.log(`No dataItems found in ${alObject.description}`);
        }
    }

    try {
        let alObjectFields: ALObjectFields;
        alObjectFields = new ALObjectFields(alObject);
        if (alObjectFields) {
            if (alObjectFields.fieldsCount > 0) {
                if (alObject.isReport() || alObject.isReportExt()) {
                    let fieldsCount = alObjectFields.fields.filter(item => (item.section === 'dataset') && (item.isfield)).length;
                    if (fieldsCount > 0) {
                        elements.push({
                            type: 'Columns',
                            count: fieldsCount,
                            command: 'ats.showAllFields',
                            commandArgs: [alObject.objectFileUri, 'dataset'],
                            iconName: 'symbol-field'
                        });
                    }
                    fieldsCount = alObjectFields.fields.filter(item => (item.section === 'requestpage') && (item.isfield)).length;
                    if (fieldsCount > 0) {
                        elements.push({
                            type: useShortNames ? 'Req. Page Fields' : 'Request Page Fields',
                            count: fieldsCount,
                            command: 'ats.showAllFields',
                            commandArgs: [alObject.objectFileUri, 'requestpage'],
                            iconName: 'gear'
                        });
                    }
                }
                else {
                    let type = 'Fields';
                    if (alObject.isQuery()) {
                        type = 'Columns';
                    }

                    elements.push({
                        type: type,
                        count: alObjectFields.fieldsCount,
                        command: 'ats.showAllFields',
                        commandArgs: alObject.objectFileUri,
                        iconName: 'symbol-field',
                    });
                }
            }
        }
    }
    catch {
        console.log(`No fields found in ${alObject.description}`);
    }

    if (alObject.isTable() || alObject.isTableExt()) {
        try {
            let alTableKeys: ALTableKeys;
            alTableKeys = new ALTableKeys(alObject);
            if (alTableKeys) {
                if (alTableKeys.elementsCount > 0) {
                    elements.push({
                        type: 'Keys',
                        count: alTableKeys.elementsCount,
                        command: 'ats.showAllTableKeys',
                        commandArgs: alObject.objectFileUri,
                        iconName: 'key'
                    });
                }
            }
        }
        catch {
            console.log(`No keys found in ${alObject.description}`);
        }
    }

    if (alObject.isTable() || alObject.isTableExt()) {
        try {
            let alTableFieldGroups: ALTableFieldGroups;
            alTableFieldGroups = new ALTableFieldGroups(alObject);
            if (alTableFieldGroups) {
                if (alTableFieldGroups.elementsCount > 0) {
                    elements.push({
                        type: 'Field Groups',
                        count: alTableFieldGroups.elementsCount,
                        command: 'ats.showAllTableFieldGroups',
                        commandArgs: alObject.objectFileUri,
                        iconName: 'group-by-ref-type'
                    });
                }
            }
        }
        catch {
            console.log(`No field groups found in ${alObject.description}`);
        }
    }

    if (alObject.isPage() || alObject.isPageExt() || alObject.isReport() || alObject.isReportExt()) {
        try {
            let alObjectActions: ALObjectActions;
            alObjectActions = new ALObjectActions(alObject);
            if (alObjectActions) {
                if (alObjectActions.actionsCount > 0) {
                    elements.push({
                        type: 'Page Actions',
                        count: alObjectActions.actionsCount,
                        command: 'ats.showAllActions',
                        commandArgs: alObject.objectFileUri,
                        iconName: 'github-action'
                    });
                }
            }
        }
        catch {
            console.log(`No actions found in ${alObject.description}`);
        }
    }

    try {
        let alObjectTriggers: ALObjectTriggers;
        alObjectTriggers = new ALObjectTriggers(alObject);
        if (alObjectTriggers) {
            if (alObjectTriggers.elementsCount > 0) {
                elements.push({
                    type: 'Triggers',
                    count: alObjectTriggers.elementsCount,
                    command: 'ats.showAllTriggers',
                    commandArgs: alObject.objectFileUri,
                    iconName: 'server-process'
                });
            }
        }
    }
    catch {
        console.log(`No triggers found in ${alObject.description}`);
    }

    try {
        let alObjectProcedures: ALObjectProcedures;
        alObjectProcedures = new ALObjectProcedures(alObject);
        if (alObjectProcedures) {
            for (let currGroup = 0; currGroup < 4; currGroup++) {
                let currGroupName: string = '';
                let currGroupIconName: string = '';

                switch (currGroup) {
                    case 0: {
                        currGroupName = 'Procedures';
                        currGroupIconName = 'code';
                        break;
                    }
                    case 1: {
                        currGroupName = 'Event Subscriptions';
                        break;
                    }
                    case 2: {
                        currGroupName = 'Integration Events';
                        break;
                    }
                    case 3: {
                        currGroupName = 'Business Events';
                        break;
                    }
                }

                let procedures = alObjectProcedures.procedures.filter(item => (item.groupName === currGroupName));
                if (procedures.length > 0) {
                    currGroupIconName = currGroupIconName || procedures[0].iconName;

                    elements.push({
                        type: currGroupName,
                        count: procedures.length,
                        command: 'ats.showAllProcedures',
                        commandArgs: [alObject.objectFileUri, currGroupName],
                        iconName: currGroupIconName
                    });
                }
            }
        }
    }
    catch {
        console.log(`No procedures found in ${alObject.description}`);
    }

    try {
        let alObjectRegions: ALObjectRegions;
        alObjectRegions = new ALObjectRegions(alObject);
        if (alObjectRegions) {
            if (alObjectRegions.elementsCount > 0) {
                elements.push({
                    type: 'Regions',
                    count: alObjectRegions.elementsCount,
                    command: 'ats.showAllRegions',
                    commandArgs: alObject.objectFileUri,
                    iconName: 'symbol-number'
                });
            }
        }
    }
    catch {
        console.log(`No regions found in ${alObject.description}`);
    }

    try {
        let alObjectVariables: ALObjectVariables;
        alObjectVariables = new ALObjectVariables(alObject);
        alObjectVariables.findGlobalVariables(alObject);
        if (alObjectVariables) {
            if (alObjectVariables.elementsCount > 0) {
                elements.push({
                    type: useShortNames ? 'Globals' : 'Global Variables',
                    count: alObjectVariables.elementsCount,
                    command: 'ats.showAllGlobalVariables',
                    commandArgs: alObject.objectFileUri,
                    iconName: 'symbol-value'
                });
            }
        }
    }
    catch {
        console.log(`No global variables found in ${alObject.description}`);
    }

    return elements;
}

async function showObjectItems(alObject: ALObject,
    items: qpTools.atsQuickPickItem[],
    title: string,
    enableSearchOnDescription: boolean,
    enableSearchOnDetails: boolean,
    sortingMethod: number
) {
    if (items) {
        const editor = vscode.window.activeTextEditor;

        // Ricerca posizione corrente
        let currItemStartLine: number = 0;
        let selectedText: string = '';
        try {
            const selection = editor.selection;
            const currentLine = selection.active.line;
            selectedText = editor.document.getText(selection).trim();

            const currentItem = [...items]
                .reverse()             // Inverte l'array
                .find(item => ((item.itemStartLine <= currentLine) &&
                    (item.itemEndLine === 0 || item.itemEndLine >= currentLine)));  // Trova il primo che soddisfa la condizione
            currItemStartLine = currentItem.itemStartLine;
        }
        catch {
            currItemStartLine = 0;
        }

        // Ricerca gruppi 
        const groups = [...new Map(items.map(item =>
            [item['groupName'], { id: item.groupID, name: item.groupName }])).values()]
            .sort((a, b) => a.id - b.id);

        // Ricerca elementi del gruppo                
        if (groups) {
            let qpItems: qpTools.atsQuickPickItem[] = [];
            groups.forEach(group => {
                qpItems.push({
                    label: group.name,
                    kind: vscode.QuickPickItemKind.Separator
                });

                const groupItems = items.filter(item => (item.groupName === group.name));

                switch (sortingMethod) {
                    case 1: {
                        // Sort by Index
                        groupItems.sort((a, b) => a.sortIndex - b.sortIndex);
                        break;
                    }

                    case 2: {
                        // Sort by Key
                        groupItems.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
                        break;
                    }
                }

                groupItems.forEach(item => {
                    qpItems.push({
                        label: (item.level > 0) ? `${'•  '.repeat(item.level)} ${item.label}` : `${item.label}`,
                        description: (item.itemStartLine === currItemStartLine) ? `${item.description} $(eye)` : item.description,
                        detail: (item.detail && (item.level > 0)) ? `${'      '.repeat(item.level)} ${item.detail}` : item.detail,
                        command: item.command ? item.command : qpTools.cmdGoToLine,
                        commandArgs: item.command ? item.commandArgs : item.itemStartLine,
                        documentUri: alObject.objectFileUri,
                        iconPath: item.iconName ? new vscode.ThemeIcon(item.iconName) : null,
                        groupName: item.groupName,
                        groupID: item.groupID,
                        kind: item.kind,
                        buttons: [{
                            iconPath: new vscode.ThemeIcon("layout-sidebar-right"),
                            tooltip: qpTools.btnCmdOpenToSide,
                        }]
                    });
                });
            });

            await qpTools.showQuickPick(qpItems,
                title,
                'Type to search symbols',
                enableSearchOnDescription,
                enableSearchOnDetails,
                selectedText, false, true,
                'ats.ALObjectExplorer');
        }
    }
}
//#endregion AL Object Explorer

//#region AL Object Fields
export async function showAllFields(alObjectUri?: vscode.Uri, sectionFilter?: string) {
    TelemetryClient.logCommand('showAllFields');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let enableSearchOnDescription = true;
        let enableSearchOnDetails = true;

        let alObjectFieldsFull: ALObjectFields;
        alObjectFieldsFull = new ALObjectFields(alObject);

        let alObjectFields = {
            objectType: alObjectFieldsFull.objectType,
            objectId: alObjectFieldsFull.objectId,
            objectName: alObjectFieldsFull.objectName,
            elementsCount: alObjectFieldsFull.elementsCount,
            fields: sectionFilter ? alObjectFieldsFull.fields.filter(item => item.section === sectionFilter) :
                alObjectFieldsFull.fields
        };

        if (alObjectFields.fields) {
            let groupID: number = 0;
            let groupName: string = '';

            if (alObjectFields.elementsCount > 0) {
                let items: qpTools.atsQuickPickItem[] = [];
                for (const field of alObjectFields.fields) {
                    let label = field.name;
                    let description = '';
                    let detail = '';
                    let isValidEntry = true;

                    if (alObject.isTable() || alObject.isTableExt()) {
                        if (field.id > 0) {
                            label = `[${field.id}]  ${field.name}`;
                        }

                        if (field.externalFieldExt) {
                            groupID = 1;
                            groupName = 'Extended Fields';
                        }
                        else {
                            groupID = 5;
                            groupName = 'Fields';
                        }

                        description = field.type;
                        enableSearchOnDescription = false;

                        if (field.pkIndex > 0) {
                            groupID = 0;
                            groupName = 'Primary Key';

                            description += `, PK${field.pkIndex}`;
                        }

                        if (field.properties) {
                            if ('fieldclass' in field.properties) {
                                if (field.properties['fieldclass'].toLowerCase() === 'flowfield') {
                                    groupID = 10;
                                    groupName = 'FlowFields';

                                    description += `, FlowField`;
                                }
                                if (field.properties['fieldclass'].toLowerCase() === 'flowfilter') {
                                    groupID = 11;
                                    groupName = 'FlowFilters';
                                    description += `, FlowFilter`;
                                }
                            }
                        }

                        if (field.properties) {
                            if ('caption' in field.properties) {
                                if (field.properties['caption']) {
                                    detail = `${field.properties['caption'].trim()}`;
                                }
                            }
                        }
                    }

                    if (alObject.isPage() || alObject.isPageExt()) {
                        if (!field.isfield) {
                            groupID = 20;
                            groupName = `${field.type}(${field.name})`;
                            isValidEntry = false;
                        }
                        else {
                            if (field.externalFieldExt) {
                                groupID = 10;
                                groupName = 'Extended Fields';
                            }

                            field.level -= 1;
                            if (field.properties) {
                                if ('caption' in field.properties) {
                                    if (field.properties['caption']) {
                                        description = `${field.properties['caption'].trim()}`;
                                    }
                                }
                            }

                            if (field.sourceExpr) {
                                description = addTextWithSeparator(description, field.sourceExpr);
                            }
                        }
                    }

                    if (alObject.isQuery()) {
                        groupName = field.dataItem;

                        if (field.sourceExpr) {
                            if (field.properties && ('method' in field.properties)) {
                                description = `${field.properties['method'].toUpperCase()}(${field.sourceExpr})`;
                            }
                            else {
                                description = field.sourceExpr;
                            }
                        }
                    }

                    if (alObject.isReport() || alObject.isReportExt()) {
                        groupID = 10;
                        groupName = field.dataItem;
                        if (field.section === 'requestpage') {
                            groupID = 20;
                        }

                        if (field.sourceExpr) {
                            description = field.sourceExpr;
                        }

                        if (field.properties) {
                            if ('caption' in field.properties) {
                                if (field.properties['caption']) {
                                    detail = `${field.properties['caption'].trim()}`;
                                }
                            }
                        }
                    }

                    if (isValidEntry) {
                        items.push({
                            label: label,
                            description: description,
                            detail: detail,
                            groupID: groupID,
                            groupName: groupName,
                            itemStartLine: field.startLine ? field.startLine : 0,
                            itemEndLine: 0,
                            level: field.level,
                            sortIndex: (field.id && field.id > 0) ? field.id : field.startLine ? field.startLine : 0,
                            iconName: field.iconName
                        });
                    }
                }

                showObjectItems(alObject,
                    items,
                    `${alObject.description}: Fields`,
                    enableSearchOnDescription,
                    enableSearchOnDetails,
                    1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No fields found in ${alObject.objectType} ${alObject.objectName}`);
    }
}

export async function copyFieldsAsText(alObjectUri?: vscode.Uri, sectionFilter?: string) {
    TelemetryClient.logCommand('copyFieldsAsText');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        var fullText = '';

        let alObjectFieldsFull: ALObjectFields;
        alObjectFieldsFull = new ALObjectFields(alObject);

        let alObjectFields = {
            objectType: alObjectFieldsFull.objectType,
            objectId: alObjectFieldsFull.objectId,
            objectName: alObjectFieldsFull.objectName,
            elementsCount: alObjectFieldsFull.elementsCount,
            fields: sectionFilter ? alObjectFieldsFull.fields.filter(item => item.section === sectionFilter) :
                alObjectFieldsFull.fields
        };

        if (alObjectFields.fields) {
            for (const field of alObjectFields.fields) {
                if ((field.isfield) && (!field.externalFieldExt)) {

                    let caption = '';
                    let fieldClass = '';
                    if (field.properties) {
                        if ('caption' in field.properties) {
                            if (field.properties['caption']) {
                                caption = `${field.properties['caption'].trim()}`;
                            }
                        }

                        if (alObject.isTable() || alObject.isTableExt()) {
                            if ('fieldclass' in field.properties) {
                                if (field.properties['fieldclass']) {
                                    fieldClass = `${field.properties['fieldclass'].trim()}`;
                                }
                            }

                            if (!fieldClass) {
                                fieldClass = 'Normal';
                            }
                        }
                    }

                    switch (true) {
                        case alObject.isTable(): {
                            if (!fullText) {
                                fullText = 'ID\tName\tType\tCaption\tPK Position\tField Class\n';
                            }

                            fullText += `${field.id}\t` +
                                `${field.name}\t` +
                                `${field.type ? field.type : ''}\t` +
                                `${caption ? caption : ''}\t` +
                                `${field.pkIndex ? field.pkIndex : 0}\t` +
                                `${fieldClass ? fieldClass : ''}\n`;

                            break;
                        }

                        case alObject.isTableExt(): {
                            if (!fullText) {
                                fullText = 'ID\tName\tType\tCaption\tField Class\n';
                            }

                            fullText += `${field.id}\t` +
                                `${field.name}\t` +
                                `${field.type ? field.type : ''}\t` +
                                `${caption ? caption : ''}\t` +
                                `${fieldClass ? fieldClass : ''}\n`;

                            break;
                        }

                        case alObject.isReport() || alObject.isReportExt(): {
                            if (!fullText) {
                                fullText = 'Name\tCaption\tSource Expression\tLevel\tData Item\n';
                            }

                            if (!field.externalFieldExt) {
                                fullText += `${field.name}\t` +
                                    `${caption ? caption : ''}\t` +
                                    `${field.sourceExpr ? field.sourceExpr : ''}\t` +
                                    `${field.level}\t` +
                                    `${field.dataItem}\n`;
                            }

                            break;
                        }

                        case alObject.isQuery(): {
                            if (!fullText) {
                                fullText = 'Name\tCaption\tSource Expression\tLevel\tData Item\n';
                            }

                            if (field.properties && ('method' in field.properties)) {
                                fullText += `${field.name}\t` +
                                    `${caption ? caption : ''}\t` +
                                    `${field.properties['method'].toUpperCase()}(${field.sourceExpr})\t` +
                                    `${field.level}\t` +
                                    `${field.dataItem}\n`;
                            }
                            else {
                                fullText += `${field.name}\t` +
                                    `${caption ? caption : ''}\t` +
                                    `${field.sourceExpr ? field.sourceExpr : ''}\t` +
                                    `${field.level}\t` +
                                    `${field.dataItem}\n`;
                            }
                            break;
                        }

                        default: {
                            if (!fullText) {
                                fullText = 'Name\tCaption\tSource Expression\n';
                            }

                            fullText += `${field.name}\t` +
                                `${caption ? caption : ''}\t` +
                                `${field.sourceExpr ? field.sourceExpr : ''}\n`;
                        }
                    }
                }
            }
        }

        if (fullText) {
            await vscode.env.clipboard.writeText(fullText);
            vscode.window.showInformationMessage("The requested information has been copied to the clipboard.");
        }
        else {
            vscode.window.showInformationMessage(`No fields found in ${alObject.objectType} ${alObject.objectName}`);
        }
    }
}
//#endregion AL Object Fields

//#region AL Table Keys
export async function showAllTableKeys(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('showAllTableKeys');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let alTableKeys: ALTableKeys;
        alTableKeys = new ALTableKeys(alObject);
        if (alTableKeys.keys) {
            if (alTableKeys.elementsCount > 0) {
                let items: qpTools.atsQuickPickItem[] = alTableKeys.keys.map(item => ({
                    label: item.fieldsList,
                    description: item.isPrimaryKey ? `${item.name} [PK]` : item.name,
                    detail: '',
                    groupID: 0,
                    groupName: '',
                    itemStartLine: item.startLine ? item.startLine : 0,
                    itemEndLine: 0,
                    sortIndex: item.startLine ? item.startLine : 0,
                    level: 0,
                    iconName: item.iconName
                }));

                showObjectItems(alObject,
                    items,
                    `${alObject.description}: Keys`,
                    true, false, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No keys found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
export async function copyTableKeysAsText(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('copyTableKeysAsText');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        var fullText = '';

        let alTableKeys: ALTableKeys;
        alTableKeys = new ALTableKeys(alObject);
        if (alTableKeys.keys) {
            for (const key of alTableKeys.keys) {
                if (!fullText) {
                    fullText = 'Name\tField List\tPK\n';
                }

                fullText += `${key.name}\t` +
                    `${key.fieldsList}\t` +
                    `${key.isPrimaryKey ? 'yes' : 'no'}\n`;
            }
        }

        if (fullText) {
            await vscode.env.clipboard.writeText(fullText);
            vscode.window.showInformationMessage("The requested information has been copied to the clipboard.");
        }
        else {
            vscode.window.showInformationMessage(`No keys found in ${alObject.objectType} ${alObject.objectName}`);
        }
    }
}
//#endregion AL Table Keys

//#region AL Table Field Groups
export async function showAllTableFieldGroups(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('showAllTableFieldGroups');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let alTableFieldGroups: ALTableFieldGroups;
        alTableFieldGroups = new ALTableFieldGroups(alObject);
        if (alTableFieldGroups.fieldgroups) {
            if (alTableFieldGroups.elementsCount > 0) {
                let items: qpTools.atsQuickPickItem[] = alTableFieldGroups.fieldgroups.map(item => ({
                    label: item.fieldsList,
                    description: '',
                    detail: item.name,
                    groupID: 0,
                    groupName: '',
                    itemStartLine: item.startLine ? item.startLine : 0,
                    itemEndLine: 0,
                    level: 0,
                    sortIndex: item.startLine ? item.startLine : 0,
                    iconName: item.iconName
                }));

                showObjectItems(alObject,
                    items,
                    `${alObject.description}: Field Groups`,
                    false, true, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No field groups found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
export async function copyTableFieldGroupsAsText(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('copyTableFieldGroupsAsText');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        var fullText = '';

        let alTableFieldGroups: ALTableFieldGroups;
        alTableFieldGroups = new ALTableFieldGroups(alObject);
        if (alTableFieldGroups.fieldgroups) {
            for (const fieldGroup of alTableFieldGroups.fieldgroups) {
                if (!fullText) {
                    fullText = 'Name\tField List\n';
                }

                fullText += `${fieldGroup.name}\t` +
                    `${fieldGroup.fieldsList}\n`;
            }
        }

        if (fullText) {
            await vscode.env.clipboard.writeText(fullText);
            vscode.window.showInformationMessage("The requested information has been copied to the clipboard.");
        }
        else {
            vscode.window.showInformationMessage(`No field groups found in ${alObject.objectType} ${alObject.objectName}`);
        }
    }
}
//#endregion AL Table Field Groups

//#region AL Object Triggers
export async function showAllTriggers(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('showAllTriggers');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let alObjectTriggers: ALObjectTriggers;
        alObjectTriggers = new ALObjectTriggers(alObject);

        if (alObjectTriggers.triggers) {
            if (alObjectTriggers.triggers.length > 0) {
                let items: qpTools.atsQuickPickItem[] = alObjectTriggers.triggers.map(item => ({
                    label: item.name,
                    description: '',
                    detail: '',
                    groupID: item.groupIndex,
                    groupName: item.groupName,
                    itemStartLine: item.startLine ? item.startLine : 0,
                    itemEndLine: 0,
                    sortIndex: item.sortIndex,
                    level: 0,
                    iconName: item.iconName
                }));

                showObjectItems(alObject,
                    items,
                    `${alObject.description}: Triggers`,
                    false, true, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No triggers found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
export async function copyTriggersAsText(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('copyTriggersAsText');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        var fullText = '';

        let alObjectTriggers: ALObjectTriggers;
        alObjectTriggers = new ALObjectTriggers(alObject);

        if (alObjectTriggers.triggers) {
            for (const trigger of alObjectTriggers.triggers) {
                if (!fullText) {
                    fullText = 'Name\n';
                }

                fullText += `${trigger.name}\n`;
            }
        }

        if (fullText) {
            await vscode.env.clipboard.writeText(fullText);
            vscode.window.showInformationMessage("The requested information has been copied to the clipboard.");
        }
        else {
            vscode.window.showInformationMessage(`No triggers found in ${alObject.objectType} ${alObject.objectName}`);
        }
    }
}
//#endregion AL Object Triggers

//#region AL Object Procedures
export async function showAllProcedures(alObjectUri?: vscode.Uri, groupFilter?: string) {
    TelemetryClient.logCommand('showAllProcedures');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let alObjectProceduresFull: ALObjectProcedures;
        alObjectProceduresFull = new ALObjectProcedures(alObject);

        let alObjectProcedures = {
            objectType: alObjectProceduresFull.objectType,
            objectId: alObjectProceduresFull.objectId,
            objectName: alObjectProceduresFull.objectName,
            elementsCount: (groupFilter) ? alObjectProceduresFull.procedures.filter(item => item.groupName === groupFilter).length :
                alObjectProceduresFull.elementsCount,
            procedures: (groupFilter) ? alObjectProceduresFull.procedures.filter(item => item.groupName === groupFilter) :
                alObjectProceduresFull.procedures
        };

        if (alObjectProcedures.procedures) {
            if (alObjectProcedures.procedures.length > 0) {
                let items: qpTools.atsQuickPickItem[] = [];

                for (let currGroup = 0; currGroup < 4; currGroup++) {
                    let currGroupName: string = '';

                    switch (currGroup) {
                        case 0: {
                            currGroupName = 'Procedures';
                            break;
                        }
                        case 1: {
                            currGroupName = 'Event Subscriptions';
                            break;
                        }
                        case 2: {
                            currGroupName = 'Integration Events';
                            break;
                        }
                        case 3: {
                            currGroupName = 'Business Events';
                            break;
                        }
                    }

                    if (currGroupName) {
                        let procedures = alObjectProcedures.procedures.filter(item => item.groupName.toLowerCase() === currGroupName.toLowerCase());
                        if (procedures && (procedures.length > 0)) {
                            let lastRegionPath = '';
                            let level = 0;
                            for (let i = 0; i < procedures.length; i++) {
                                if ((procedures[i].regionPath !== lastRegionPath)) {
                                    let regions = procedures[i].regionPath.split(' > ');
                                    let prevRegions = lastRegionPath.split(' > ');
                                    lastRegionPath = procedures[i].regionPath;

                                    let newRegionsFound = false;
                                    for (let r = 0; r < regions.length; r++) {
                                        let newRegion = newRegionsFound;
                                        if (!newRegion) {
                                            newRegion = (regions[r] != prevRegions[r]);
                                        }

                                        if (newRegion) {
                                            newRegionsFound = true;
                                            level = r;

                                            items.push({
                                                label: regions[r],
                                                description: 'Region',
                                                detail: '',
                                                groupID: currGroup,
                                                groupName: currGroupName,
                                                itemStartLine: procedures[i].startLine ? procedures[i].startLine : 0,
                                                itemEndLine: 0,
                                                sortIndex: procedures[i].startLine ? procedures[i].startLine : 0,
                                                level: level,
                                                iconName: 'symbol-number'
                                            });
                                        }
                                    }
                                }

                                items.push({
                                    label: procedures[i].name,
                                    description: (procedures[i].sourceEvent) ? `${procedures[i].sourceEvent}` : procedures[i].scope,
                                    detail: '',
                                    groupID: currGroup,
                                    groupName: currGroupName,
                                    itemStartLine: procedures[i].startLine ? procedures[i].startLine : 0,
                                    itemEndLine: 0,
                                    sortIndex: procedures[i].startLine ? procedures[i].startLine : 0,
                                    level: procedures[i].regionPath ? level + 1 : 0,
                                    iconName: procedures[i].iconName
                                });
                            }
                        }
                    }
                }

                if (items) {
                    let title = groupFilter || 'Procedures';
                    showObjectItems(alObject,
                        items,
                        `${alObject.description}: ${title}`,
                        false, false, 1);
                    return;
                }
            }
        }

        vscode.window.showInformationMessage(`No procedures found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
export async function copyProceduresAsText(alObjectUri?: vscode.Uri, groupFilter?: string) {
    TelemetryClient.logCommand('copyProceduresAsText');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let fullText = '';
        let exportSourceEventDet = false;

        let alObjectProceduresFull: ALObjectProcedures;
        alObjectProceduresFull = new ALObjectProcedures(alObject);

        let alObjectProcedures = {
            objectType: alObjectProceduresFull.objectType,
            objectId: alObjectProceduresFull.objectId,
            objectName: alObjectProceduresFull.objectName,
            elementsCount: (groupFilter) ? alObjectProceduresFull.procedures.filter(item => item.groupName === groupFilter).length :
                alObjectProceduresFull.elementsCount,
            procedures: (groupFilter) ? alObjectProceduresFull.procedures.filter(item => item.groupName === groupFilter) :
                alObjectProceduresFull.procedures
        };

        if (alObjectProcedures.procedures) {
            for (let currGroup = 0; currGroup < 4; currGroup++) {
                let currGroupName: string = '';

                switch (currGroup) {
                    case 0: {
                        currGroupName = 'Procedures';
                        break;
                    }
                    case 1: {
                        currGroupName = 'Event Subscriptions';
                        exportSourceEventDet = true;
                        break;
                    }
                    case 2: {
                        currGroupName = 'Integration Events';
                        break;
                    }
                    case 3: {
                        currGroupName = 'Business Events';
                        break;
                    }
                }

                if (currGroupName) {
                    let procedures = alObjectProcedures.procedures.filter(item => item.groupName.toLowerCase() === currGroupName.toLowerCase());
                    if (procedures && (procedures.length > 0)) {
                        for (let i = 0; i < procedures.length; i++) {
                            if (!fullText) {
                                if (exportSourceEventDet) {
                                    fullText = 'Name\tSource Integration Event\tRegion Path\n';
                                }
                                else {
                                    fullText = 'Name\tRegion Path\n';
                                }
                            }

                            if (exportSourceEventDet) {
                                fullText += `${procedures[i].name}\t` +
                                    `${procedures[i].sourceEvent ? procedures[i].sourceEvent : ''}\t` +
                                    `${procedures[i].regionPath ? procedures[i].regionPath : ''}\n`;
                            }
                            else {
                                fullText += `${procedures[i].name}\t` +
                                    `${procedures[i].regionPath ? procedures[i].regionPath : ''}\n`;
                            }
                        }
                    }
                }
            }
        }

        if (fullText) {
            await vscode.env.clipboard.writeText(fullText);
            vscode.window.showInformationMessage("The requested information has been copied to the clipboard.");
        }
        else {
            vscode.window.showInformationMessage(`No procedures found in ${alObject.objectType} ${alObject.objectName}`);
        }
    }
}
//#endregion AL Object Procedures

//#region AL Object Dataitems
export async function showAllDataItems(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('showAllDataItems');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let alObjectDataItems: ALObjectDataItems;
        alObjectDataItems = new ALObjectDataItems(alObject);
        if (alObjectDataItems.dataItems) {
            if (alObjectDataItems.elementsCount > 0) {
                let items: qpTools.atsQuickPickItem[] = alObjectDataItems.dataItems.map(item => ({
                    label: item.name,
                    description: item.sourceExpression,
                    detail: '',
                    groupID: 0,
                    groupName: '',
                    itemStartLine: item.startLine ? item.startLine : 0,
                    itemEndLine: item.endLine ? item.endLine : 0,
                    sortIndex: item.startLine ? item.startLine : 0,
                    level: item.level,
                    iconName: item.iconName
                }));

                showObjectItems(alObject,
                    items,
                    `${alObject.description}: Dataitems`,
                    true, false, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No dataitems found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
export async function copyDataItemsAsText(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('copyDataItemsAsText');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let fullText = '';

        let alObjectDataItems: ALObjectDataItems;
        alObjectDataItems = new ALObjectDataItems(alObject);
        if (alObjectDataItems.dataItems) {
            for (const dataItem of alObjectDataItems.dataItems) {
                if (!fullText) {
                    fullText = 'Name\tSource Table\tLevel\n';
                }

                fullText += `${dataItem.name}\t` +
                    `${dataItem.sourceExpression}\t` +
                    `${dataItem.level}\n`;
            }
        }

        if (fullText) {
            await vscode.env.clipboard.writeText(fullText);
            vscode.window.showInformationMessage("The requested information has been copied to the clipboard.");
        }
        else {
            vscode.window.showInformationMessage(`No dataitems found in ${alObject.objectType} ${alObject.objectName}`);
        }
    }
}
//#endregion AL Object Dataitems

//#region AL Object Page Actions
export async function showAllActions(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('showAllActions');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let alObjectActions: ALObjectActions;
        alObjectActions = new ALObjectActions(alObject);
        if (alObjectActions.actions) {
            if (alObjectActions.elementsCount > 0) {
                let items: qpTools.atsQuickPickItem[] = alObjectActions.actions.map(item => ({
                    label: item.name,
                    description: item.sourceAction ? `Ref: ${item.sourceAction}` :
                        (item.properties && item.properties['caption']) ? `${item.properties['caption']}` : '',
                    detail: '',
                    groupID: 0,
                    groupName: '',
                    itemStartLine: item.startLine ? item.startLine : 0,
                    itemEndLine: 0,
                    sortIndex: item.startLine ? item.startLine : 0,
                    level: item.level,
                    iconName: item.iconName
                }));

                showObjectItems(alObject,
                    items,
                    `${alObject.description}: Page Actions`,
                    true, true, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No actions found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
export async function copyActionsAsText(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('copyActionsAsText');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let fullText = '';

        let alObjectActions: ALObjectActions;
        alObjectActions = new ALObjectActions(alObject);
        if (alObjectActions.actions) {
            for (const action of alObjectActions.actions) {
                if (!fullText) {
                    fullText = 'Name\tCaption\tLinked Ref. Action\n';
                }

                fullText += `${action.name}\t` +
                    `${(action.properties && action.properties['caption']) ? `${action.properties['caption']}` : ''}\t` +
                    `${action.sourceAction}\n`;
            }
        }

        if (fullText) {
            await vscode.env.clipboard.writeText(fullText);
            vscode.window.showInformationMessage("The requested information has been copied to the clipboard.");
        }
        else {
            vscode.window.showInformationMessage(`No actions found in ${alObject.objectType} ${alObject.objectName}`);
        }
    }
}
//#endregion AL Object Page Actions

//#region AL Object Regions
export async function showAllRegions(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('showAllRegions');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let alObjectRegions: ALObjectRegions;
        alObjectRegions = new ALObjectRegions(alObject);
        if (alObjectRegions.regions) {
            if (alObjectRegions.elementsCount > 0) {
                let items: qpTools.atsQuickPickItem[] = alObjectRegions.regions.map(item => ({
                    label: item.name,
                    description: '',
                    detail: '',
                    groupID: 0,
                    groupName: '',
                    itemStartLine: item.startLine ? item.startLine : 0,
                    itemEndLine: item.endLine ? item.endLine : 0,
                    sortIndex: item.startLine ? item.startLine : 0,
                    level: item.level ? item.level : 0,
                    iconName: item.iconName
                }));

                showObjectItems(alObject,
                    items,
                    `${alObject.description}: Regions`,
                    false, false, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No regions found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
export async function copyRegionsAsText(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('copyRegionsAsText');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }


    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let fullText = '';

        let alObjectRegions: ALObjectRegions;
        alObjectRegions = new ALObjectRegions(alObject);
        if (alObjectRegions.regions) {
            for (const region of alObjectRegions.regions) {
                if (!fullText) {
                    fullText = 'Name\n';
                }

                fullText += `${region.name}\n`;
            }
        }

        if (fullText) {
            await vscode.env.clipboard.writeText(fullText);
            vscode.window.showInformationMessage("The requested information has been copied to the clipboard.");
        }
        else {
            vscode.window.showInformationMessage(`No regions found in ${alObject.objectType} ${alObject.objectName}`);
        }
    }
}
//#endregion AL Object Regions

//#region AL Object Variables
export async function showAllGlobalVariables(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('showAllGlobalVariables');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let alObjectVariables: ALObjectVariables;
        alObjectVariables = new ALObjectVariables(alObject);
        alObjectVariables.findGlobalVariables(alObject);
        if (alObjectVariables.variables) {
            if (alObjectVariables.elementsCount > 0) {
                let items: qpTools.atsQuickPickItem[] = alObjectVariables.variables.map(variable => ({
                    label: variable.name,
                    description:
                        (variable.subtype && variable.attributes) ? `${variable.type} ${variable.subtype} ${variable.attributes}` :
                            variable.subtype ? `${variable.type} ${variable.subtype}` :
                                variable.size ? `${variable.type}[${variable.size}]` :
                                    variable.type,
                    detail: variable.value,
                    groupID: variable.groupIndex,
                    groupName: variable.groupName,
                    sortKey: variable.name,
                    itemStartLine: variable.linePosition ? variable.linePosition : 0,
                    itemEndLine: 0,
                    sortIndex: variable.linePosition ? variable.linePosition : 0,
                    level: 0,
                    iconName: variable.iconName
                }));

                showObjectItems(alObject,
                    items,
                    `${alObject.description}: Global Variables`,
                    false, false, 2);
                return;
            }
        }

        vscode.window.showInformationMessage(`No global variables found in ${alObject.objectType} ${alObject.objectName}`);
    }
}

export async function copyGlobalVariablesAsText(alObjectUri?: vscode.Uri) {
    TelemetryClient.logCommand('copyGlobalVariablesAsText');

    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        document = editor.document;
    }

    const alObject = alFileMgr.parseALObject(document);
    if (alObject) {
        let fullText = '';

        let alObjectVariables: ALObjectVariables;
        alObjectVariables = new ALObjectVariables(alObject);
        alObjectVariables.findGlobalVariables(alObject);
        if (alObjectVariables.variables) {

            for (const variable of alObjectVariables.variables) {
                if (!fullText) {
                    fullText = 'Name\tType\tSize\tSubtype\tAttributes\tValue\n';
                }

                fullText += `${variable.name}\t` +
                    `${variable.type}\t` +
                    `${(variable.size !== 0) ? variable.size : ''}\t` +
                    `${variable.subtype ? variable.subtype : ''}\t` +
                    `${variable.attributes ? variable.attributes : ''}\t` +
                    `${variable.value}\n`;
            }
        }

        if (fullText) {
            await vscode.env.clipboard.writeText(fullText);
            vscode.window.showInformationMessage("The requested information has been copied to the clipboard.");
        }
        else {
            vscode.window.showInformationMessage(`No global variables found in ${alObject.objectType} ${alObject.objectName}`);
        }
    }
}


export async function showAllLocalVariables() {
    TelemetryClient.logCommand('showAllLocalVariables');

    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const alObject = alFileMgr.parseALObject(editor.document);
    if (!alObject) { return; }

    const alObjectVariables = new ALObjectVariables(undefined);
    alFileMgr.findLocalVariablesInCurrentScope(alObjectVariables);
    if (alObjectVariables.variables) {
        if (alObjectVariables.elementsCount > 0) {
            let items: qpTools.atsQuickPickItem[] = alObjectVariables.variables.map(variable => ({
                label: variable.name,
                description:
                    (variable.subtype && variable.attributes) ? `${variable.type} ${variable.subtype} ${variable.attributes}` :
                        variable.subtype ? `${variable.type} ${variable.subtype}` :
                            variable.size ? `${variable.type}[${variable.size}]` :
                                variable.type,
                detail: variable.value,
                groupID: variable.groupIndex,
                groupName: variable.groupName,
                sortKey: alObjectVariables.getDefaultSortingIndex(variable.type).toString().padStart(10, "0") + variable.type + variable.name,
                itemStartLine: variable.linePosition ? variable.linePosition : 0,
                itemEndLine: 0,
                sortIndex: variable.linePosition ? variable.linePosition : 0,
                level: 0,
                iconName: variable.iconName
            }));

            showObjectItems(alObject,
                items,
                `${alObjectVariables.variables[0].scope}: Local Variables`,
                false, false, 2);
            return;
        }
    }

    vscode.window.showInformationMessage(`No local variables found in current position`);
}
//#endregion AL Object Variables

//#region Open AL Objects
export async function showOpenALObjects() {
    TelemetryClient.logCommand('showOpenALObjects');

    const activeEditor = vscode.window.activeTextEditor;
    const activeUri = activeEditor?.document.uri.toString();

    // Recupera i tab aperti
    const openEditors = vscode.window.tabGroups.all.flatMap(group => group.tabs);

    const openFiles: qpTools.atsQuickPickItem[] = [];

    for (const editor of openEditors) {
        try {
            const documentUri = (editor.input as any).uri;

            if (alFileMgr.isALObjectFile(documentUri, true)) {
                const doc = await vscode.workspace.openTextDocument(documentUri);

                const alObject = alFileMgr.parseALObject(doc);
                const isCurrentEditor = (doc.uri.toString() === activeUri);
                const isLocked = alFileMgr.isPreviewALObjectFile(documentUri);

                openFiles.push({
                    label: isLocked ? `$(lock-small) ${alObject.description}` : alObject.description,
                    description: isCurrentEditor ? '$(eye)' : '',
                    detail: vscode.workspace.asRelativePath(doc.uri),
                    groupID: getObjectGroupID(alObject, isCurrentEditor),
                    groupName: isCurrentEditor ? 'Current Editor' : alObject.objectType,
                    sortIndex: 0,
                    sortKey: alObject.objectName,
                    command: qpTools.cmdOpenFile,
                    commandArgs: doc.uri,
                    iconPath: new vscode.ThemeIcon(alObject.getDefaultIconName()),
                    buttons: [
                        {
                            iconPath: new vscode.ThemeIcon("symbol-misc"),
                            tooltip: qpTools.btnCmdExecObjectExplorer,
                        },
                        {
                            iconPath: new vscode.ThemeIcon("layout-sidebar-right"),
                            tooltip: qpTools.btnCmdOpenToSide,
                        }
                    ]
                });
            }
        } catch (err) {
            console.log(`Unable to read file: ${editor}`, err);
        }
    }

    if (openFiles) {
        // Ricerca gruppi 
        const groups = [...new Map(openFiles.map(item =>
            [item['groupName'], { id: item.groupID, name: item.groupName }])).values()]
            .sort((a, b) => a.id - b.id);

        // Ricerca elementi del gruppo                
        if (groups) {
            let qpItems: qpTools.atsQuickPickItem[] = [];
            groups.forEach(group => {
                qpItems.push({
                    label: group.name,
                    kind: vscode.QuickPickItemKind.Separator
                });

                qpItems.push(...openFiles.filter(item => (item.groupName === group.name)));
            });

            await qpTools.showQuickPick(qpItems, 'Open AL Objects', 'Select a file to open', true, true, '', true, true, '');
        }
    }
}
//#endregion Open AL Objects

//#region Utilities
function getObjectGroupID(alObject: ALObject, isCurrentEditor: boolean): number {
    if (isCurrentEditor) {
        return 1;
    }

    if (alObject) {
        return alObject.objectTypeIndex ?? 99;
    }
}

function addTextWithSeparator(originalText: string, textToAdd: string): string {
    if (textToAdd) {
        if (originalText) {
            return `${originalText} | ${textToAdd}`;
        }
        else {
            return textToAdd;
        }
    }

    return originalText;
}
//#endregion Utilities

//#region Go to AL Object command

export async function gotoWorkspaceObjects() {
    TelemetryClient.logCommand('gotoWorkspaceObjects');

    const alObjectIndex = await ALObjectIndex.getInstance();
    const allItems = alObjectIndex.toQuickPickItems();
    if (allItems.length === 0) {
        void vscode.window.showInformationMessage('No AL objects found in the current workspace.');
        return;
    }

    let selectedText = '';
    try {
        const editor = vscode.window.activeTextEditor;
        const selection = editor.selection;
        selectedText = editor.document.getText(selection).trim();
    }
    catch { }

    await qpTools.showQuickPick(allItems, 'ATS: Go to AL object (workspace only)', 'Type to search', false, false, selectedText, true, true, '');

}
//#endregion Go to AL Object command