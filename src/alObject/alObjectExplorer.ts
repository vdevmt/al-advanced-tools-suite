import * as vscode from 'vscode';
import * as alFileMgr from './alObjectFileMgr';
import { ALObject, ALObjectActions, ALObjectDataItems, ALTableFieldGroups, ALObjectFields, ALObjectProcedures, ALObjectRegions, ALTableKeys, ALObjectTriggers, ALObjectVariables } from './alObject';
interface ObjectElement {
    type: string,
    count: number,
    iconName: string,
    command: string,
    commandArgs?: any,
}

interface atsQuickPickItem extends vscode.QuickPickItem {
    iconName?: string;
    itemStartLine?: number;
    itemEndLine?: number;
    groupID?: number;
    groupName?: string;
    sortIndex?: number;
    sortKey?: string;
    level?: number;
    documentUri?: vscode.Uri;
    command?: string;
    commandArgs?: any;
}

const cmdGoToLine = 'GoToLine';
const cmdGoToLineOnSide = 'GoToLineOnSide';
const cmdOpenFile = 'OpenFile';
const cmdOpenFileOnSide = 'OpenFileOnSide';
const cmdExecALObjectExplorer = 'ALObjectExplorer';

//#region AL Object Explorer
export async function execALObjectExplorer(alObject?: ALObject) {
    if (!alObject) {
        const editor = vscode.window.activeTextEditor;
        const document = editor.document;

        if (alFileMgr.isALObjectDocument(document)) {
            alObject = new ALObject(document);
        }
    }

    if (alObject) {
        let objectElements = countObjectElements(alObject, false);
        if (objectElements && (objectElements.length > 0)) {
            const qpItems: atsQuickPickItem[] = objectElements.map(element => ({
                label: `$(${element.iconName}) ${element.type}: ${element.count}`,
                description: '',
                detail: '',
                command: element.command,
                commandArgs: element.commandArgs
            }));

            showQuickPick(qpItems,
                `${alFileMgr.makeALObjectDescriptionText(alObject)}`,
                '',
                false,
                false,
                '');
        }
    }
}

async function execALObjectExplorerByUri(docUri: vscode.Uri) {
    if (docUri) {
        const document = await vscode.workspace.openTextDocument(docUri);
        if (alFileMgr.isALObjectDocument(document)) {
            const alObject: ALObject = new ALObject(document);
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
            console.log(`No dataItems found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
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
                        iconName: 'symbol-field'
                    });
                }
            }
        }
    }
    catch {
        console.log(`No fields found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
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
            console.log(`No keys found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
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
            console.log(`No field groups found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
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
            console.log(`No actions found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
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
        console.log(`No triggers found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
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
        console.log(`No procedures found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
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
        console.log(`No regions found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
    }

    try {
        let alObjectVariables: ALObjectVariables;
        alObjectVariables = new ALObjectVariables(alObject);
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
        console.log(`No global variables found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
    }

    return elements;
}

async function showObjectItems(alObject: ALObject,
    items: atsQuickPickItem[],
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
            let qpItems: atsQuickPickItem[] = [];
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
                        label: (item.level > 0) ? `${'....'.repeat(item.level)} ${item.label}` : `${item.label}`,
                        description: (item.itemStartLine === currItemStartLine) ? `${item.description} $(eye)` : item.description,
                        detail: (item.detail && (item.level > 0)) ? `${'    '.repeat(item.level)} ${item.detail}` : item.detail,
                        command: item.command ? item.command : cmdGoToLine,
                        commandArgs: item.command ? item.commandArgs : item.itemStartLine,
                        documentUri: alObject.objectFileUri,
                        iconPath: item.iconName ? new vscode.ThemeIcon(item.iconName) : null,
                        buttons: [{
                            iconPath: new vscode.ThemeIcon("layout-sidebar-right"),
                            tooltip: "Open to the Side",
                        }]
                    });
                });
            });

            await showQuickPick(qpItems,
                title,
                'Type to search symbols',
                enableSearchOnDescription,
                enableSearchOnDetails,
                selectedText);
        }
    }
}
//#endregion AL Object Explorer

//#region AL Object Fields
export async function showAllFields(alObjectUri?: vscode.Uri, sectionFilter?: string) {
    let alObject: ALObject;
    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    if (alFileMgr.isALObjectDocument(document)) {
        alObject = new ALObject(document);
    }

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
                let items: atsQuickPickItem[] = [];
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

                            description += ` (PK${field.pkIndex})`;
                        }

                        if (field.properties) {
                            if ('fieldclass' in field.properties) {
                                if (field.properties['fieldclass'].toLowerCase() === 'flowfield') {
                                    groupID = 10;
                                    groupName = 'FlowFields';
                                }
                                if (field.properties['fieldclass'].toLowerCase() === 'flowfilter') {
                                    groupID = 11;
                                    groupName = 'FlowFilters';
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
                    `${alFileMgr.makeALObjectDescriptionText(alObject)}: Fields`,
                    enableSearchOnDescription,
                    enableSearchOnDetails,
                    1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No fields found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
//#endregion AL Object Fields

//#region AL Table Keys
export async function showAllTableKeys(alObjectUri?: vscode.Uri) {
    let alObject: ALObject;
    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    if (alFileMgr.isALObjectDocument(document)) {
        alObject = new ALObject(document);
    }

    if (alObject) {
        let alTableKeys: ALTableKeys;
        alTableKeys = new ALTableKeys(alObject);
        if (alTableKeys.keys) {
            if (alTableKeys.elementsCount > 0) {
                let items: atsQuickPickItem[] = alTableKeys.keys.map(item => ({
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
                    `${alFileMgr.makeALObjectDescriptionText(alObject)}: Keys`,
                    true, false, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No keys found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
//#endregion AL Table Keys

//#region AL Table Field Groups
export async function showAllTableFieldGroups(alObjectUri?: vscode.Uri) {
    let alObject: ALObject;
    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    if (alFileMgr.isALObjectDocument(document)) {
        alObject = new ALObject(document);
    }

    if (alObject) {
        let alTableFieldGroups: ALTableFieldGroups;
        alTableFieldGroups = new ALTableFieldGroups(alObject);
        if (alTableFieldGroups.fieldgroups) {
            if (alTableFieldGroups.elementsCount > 0) {
                let items: atsQuickPickItem[] = alTableFieldGroups.fieldgroups.map(item => ({
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
                    `${alFileMgr.makeALObjectDescriptionText(alObject)}: Field Groups`,
                    false, true, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No field groups found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
//#endregion AL Table Field Groups

//#region AL Object Triggers
export async function showAllTriggers(alObjectUri?: vscode.Uri) {
    let alObject: ALObject;
    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    if (alFileMgr.isALObjectDocument(document)) {
        alObject = new ALObject(document);
    }
    if (alObject) {
        let alObjectTriggers: ALObjectTriggers;
        alObjectTriggers = new ALObjectTriggers(alObject);

        if (alObjectTriggers.triggers) {
            if (alObjectTriggers.triggers.length > 0) {
                let items: atsQuickPickItem[] = alObjectTriggers.triggers.map(item => ({
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
                    `${alFileMgr.makeALObjectDescriptionText(alObject)}: Triggers`,
                    false, true, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No triggers found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
//#endregion AL Object Triggers

//#region AL Object Procedures
export async function showAllProcedures(alObjectUri?: vscode.Uri, groupFilter?: string) {
    let alObject: ALObject;
    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    if (alFileMgr.isALObjectDocument(document)) {
        alObject = new ALObject(document);
    }
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
                let items: atsQuickPickItem[] = [];

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
                            for (let i = 0; i < procedures.length; i++) {
                                items.push({
                                    label: procedures[i].name,
                                    description: procedures[i].scope,
                                    detail: (procedures[i].regionPath && procedures[i].sourceEvent) ? `Region: ${procedures[i].regionPath} | Event: ${procedures[i].sourceEvent}` :
                                        (procedures[i].regionPath) ? `Region: ${procedures[i].regionPath}` :
                                            (procedures[i].sourceEvent) ? `Event: ${procedures[i].sourceEvent}` : '',
                                    groupID: currGroup,
                                    groupName: currGroupName,
                                    itemStartLine: procedures[i].startLine ? procedures[i].startLine : 0,
                                    itemEndLine: 0,
                                    sortIndex: procedures[i].startLine ? procedures[i].startLine : 0,
                                    level: 0,
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
                        `${alFileMgr.makeALObjectDescriptionText(alObject)}: ${title}`,
                        false, true, 1);
                    return;
                }
            }
        }

        vscode.window.showInformationMessage(`No procedures found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
//#endregion AL Object Procedures

//#region AL Object Dataitems
export async function showAllDataItems(alObjectUri?: vscode.Uri) {
    let alObject: ALObject;
    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    if (alFileMgr.isALObjectDocument(document)) {
        alObject = new ALObject(document);
    }

    if (alObject) {
        let alObjectDataItems: ALObjectDataItems;
        alObjectDataItems = new ALObjectDataItems(alObject);
        if (alObjectDataItems.dataItems) {
            if (alObjectDataItems.elementsCount > 0) {
                let items: atsQuickPickItem[] = alObjectDataItems.dataItems.map(item => ({
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
                    `${alFileMgr.makeALObjectDescriptionText(alObject)}: Dataitems`,
                    true, false, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No dataitems found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
//#endregion AL Object Dataitems

//#region AL Object Page Actions
export async function showAllActions(alObjectUri?: vscode.Uri) {
    let alObject: ALObject;
    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    if (alFileMgr.isALObjectDocument(document)) {
        alObject = new ALObject(document);
    }

    if (alObject) {
        let alObjectActions: ALObjectActions;
        alObjectActions = new ALObjectActions(alObject);
        if (alObjectActions.actions) {
            if (alObjectActions.elementsCount > 0) {
                let items: atsQuickPickItem[] = alObjectActions.actions.map(item => ({
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
                    `${alFileMgr.makeALObjectDescriptionText(alObject)}: Page Actions`,
                    true, true, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No actions found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
//#endregion AL Object Page Actions

//#region AL Object Regions
export async function showAllRegions(alObjectUri?: vscode.Uri) {
    let alObject: ALObject;
    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    if (alFileMgr.isALObjectDocument(document)) {
        alObject = new ALObject(document);
    }

    if (alObject) {
        let alObjectRegions: ALObjectRegions;
        alObjectRegions = new ALObjectRegions(alObject);
        if (alObjectRegions.regions) {
            if (alObjectRegions.elementsCount > 0) {
                let items: atsQuickPickItem[] = alObjectRegions.regions.map(item => ({
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
                    `${alFileMgr.makeALObjectDescriptionText(alObject)}: Regions`,
                    false, false, 1);
                return;
            }
        }

        vscode.window.showInformationMessage(`No regions found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
//#endregion AL Object Regions

//#region AL Object Variables
export async function showAllGlobalVariables(alObjectUri?: vscode.Uri) {
    let alObject: ALObject;
    let document: vscode.TextDocument;

    if (alObjectUri) {
        document = await vscode.workspace.openTextDocument(alObjectUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    if (alFileMgr.isALObjectDocument(document)) {
        alObject = new ALObject(document);
    }

    if (alObject) {
        let alObjectVariables: ALObjectVariables;
        alObjectVariables = new ALObjectVariables(alObject);
        if (alObjectVariables.variables) {
            if (alObjectVariables.elementsCount > 0) {
                let items: atsQuickPickItem[] = alObjectVariables.variables.map(variable => ({
                    label: variable.name,
                    description: variable.subtype ? `${variable.type} ${variable.subtype}` :
                        variable.size ? `${variable.type}[${variable.size}]` : variable.type,
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
                    `${alFileMgr.makeALObjectDescriptionText(alObject)}: Global Variables`,
                    false, false, 2);
                return;
            }
        }

        vscode.window.showInformationMessage(`No regions found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
//#endregion AL Object Variables


//#region Open AL Objects
export async function showOpenALObjects() {
    const activeEditor = vscode.window.activeTextEditor;
    const activeUri = activeEditor?.document.uri.toString();

    // Recupera i tab aperti
    const openEditors = vscode.window.tabGroups.all.flatMap(group => group.tabs);

    const openFiles: atsQuickPickItem[] = [];

    for (const editor of openEditors) {
        try {
            const documentUri = (editor.input as any).uri;

            if (alFileMgr.isALObjectFile(documentUri, true)) {
                const doc = await vscode.workspace.openTextDocument(documentUri);

                let alObject: ALObject;
                alObject = new ALObject(doc);
                let objectInfoText = alFileMgr.makeALObjectDescriptionText(alObject);

                const isCurrentEditor = (doc.uri.toString() === activeUri);
                const isLocked = alFileMgr.isPreviewALObjectFile(documentUri);

                openFiles.push({
                    label: isLocked ? `$(lock-small) ${objectInfoText}` : objectInfoText,
                    description: isCurrentEditor ? '$(eye)' : '',
                    detail: vscode.workspace.asRelativePath(doc.uri),
                    groupID: objectGroupID(alObject, isCurrentEditor),
                    groupName: isCurrentEditor ? 'Current Editor' : alObject.objectType,
                    sortIndex: 0,
                    sortKey: alObject.objectName,
                    command: cmdOpenFile,
                    commandArgs: doc.uri,
                    iconPath: new vscode.ThemeIcon(alObject.getDefaultIconName()),
                    buttons: [
                        {
                            iconPath: new vscode.ThemeIcon("symbol-misc"),
                            tooltip: "AL Object Explorer",
                        },
                        {
                            iconPath: new vscode.ThemeIcon("layout-sidebar-right"),
                            tooltip: "Open to the Side",
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
            let qpItems: atsQuickPickItem[] = [];
            groups.forEach(group => {
                qpItems.push({
                    label: group.name,
                    kind: vscode.QuickPickItemKind.Separator
                });

                qpItems.push(...openFiles.filter(item => (item.groupName === group.name)));
            });

            await showQuickPick(qpItems, 'Open AL Objects', 'Select a file to open', true, true, '');
        }
    }
}

function objectGroupID(alObject: ALObject, isCurrentEditor: boolean): number {
    let groupIndex: number = 99;

    if (alObject) {
        if (isCurrentEditor) {
            groupIndex = 1;
        }
        else {
            switch (alObject.objectType) {
                case 'table':
                    groupIndex = 10;
                    break;

                case 'tableextension':
                    groupIndex = 11;
                    break;

                case 'page':
                    groupIndex = 20;
                    break;

                case 'pageextension':
                    groupIndex = 21;
                    break;

                case 'codeunit':
                    groupIndex = 30;
                    break;

                case 'report':
                    groupIndex = 40;
                    break;

                case 'reportextension':
                    groupIndex = 41;
                    break;
            }
        }
    }

    return groupIndex;
}
function objectSortKey(alObject: ALObject, isCurrentEditor: boolean): string {
    let objPriority: string = 'Z';

    if (alObject) {
        if (isCurrentEditor) {
            objPriority = 'A';
        }
        else {
            switch (alObject.objectType) {
                case 'table':
                    objPriority = 'B';
                    break;

                case 'tableextension':
                    objPriority = 'C';
                    break;

                case 'codeunit':
                    objPriority = 'D';
                    break;

                case 'page':
                    objPriority = 'E';
                    break;

                case 'pageextension':
                    objPriority = 'F';
                    break;

                case 'report':
                    objPriority = 'G';
                    break;

                case 'reportextension':
                    objPriority = 'H';
                    break;
            }
        }

        return `${objPriority}_${alObject.objectType}_${alObject.objectName}`;
    }

    return objPriority;
}
//#endregion Open AL Objects

//#region Utilities

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

//#region Quick Pick Functions
async function showQuickPick(qpItems: atsQuickPickItem[],
    title: string,
    placeholder: string,
    enableSearchOnDescription: boolean,
    enableSearchOnDetails: boolean,
    initialValue: string
) {
    const quickPick = vscode.window.createQuickPick();
    quickPick.items = qpItems;

    quickPick.title = title;
    quickPick.placeholder = placeholder;
    quickPick.matchOnDescription = enableSearchOnDescription;
    quickPick.matchOnDetail = enableSearchOnDetails;
    quickPick.value = initialValue;

    // Gestione elemento selezionato        
    quickPick.onDidAccept(async () => {
        const selectedItem = quickPick.selectedItems[0] as atsQuickPickItem;
        if (selectedItem) {
            await executeQuickPickItemCommand(selectedItem);
        }
        quickPick.hide();
    });

    // Gestione button dell'elemento selezionato
    quickPick.onDidTriggerItemButton(async (selected) => {
        const selectedItem = selected.item as atsQuickPickItem;
        if (selectedItem) {
            switch (selected.button.tooltip) {
                case 'Open to the Side': {
                    switch (selectedItem.command) {
                        case cmdGoToLine: {
                            selectedItem.command = cmdGoToLineOnSide;
                            break;
                        }
                        case cmdOpenFile: {
                            selectedItem.command = cmdOpenFileOnSide;
                            break;
                        }
                    }
                    break;
                }

                case 'AL Object Explorer': {
                    selectedItem.command = cmdExecALObjectExplorer;
                    break;
                }
            }

            // Esegui il comando per l'item selezionato
            await executeQuickPickItemCommand(selectedItem);
            quickPick.hide();
        }
    });

    quickPick.onDidHide(() => quickPick.dispose());

    quickPick.show();
}

async function executeQuickPickItemCommand(selectedItem: atsQuickPickItem) {
    if (selectedItem) {
        if (selectedItem.command) {
            switch (selectedItem.command) {
                case cmdGoToLine: {
                    let lineNumber: number = Number(selectedItem.commandArgs);
                    if (lineNumber >= 0) {
                        if (selectedItem.documentUri && (selectedItem.documentUri !== vscode.window.activeTextEditor.document.uri)) {
                            const position = new vscode.Position(lineNumber, 0);
                            await vscode.window.showTextDocument(selectedItem.documentUri, {
                                viewColumn: vscode.ViewColumn.Active,
                                preserveFocus: false,
                                selection: new vscode.Selection(position, position)
                            });
                        }
                        else {
                            const editor = vscode.window.activeTextEditor;
                            if (editor) {
                                const position = new vscode.Position(lineNumber, 0);
                                editor.selection = new vscode.Selection(position, position);
                                editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
                            }
                        }
                    }

                    break;
                }
                case cmdGoToLineOnSide: {
                    let lineNumber: number = Number(selectedItem.commandArgs);
                    if (lineNumber >= 0) {
                        let docUri = selectedItem.documentUri || vscode.window.activeTextEditor.document.uri;
                        if (docUri) {
                            const position = new vscode.Position(lineNumber, 0);
                            await vscode.window.showTextDocument(selectedItem.documentUri, {
                                viewColumn: vscode.ViewColumn.Beside,
                                preserveFocus: false,
                                selection: new vscode.Selection(position, position)
                            });
                        }
                    }

                    break;
                }

                case cmdOpenFile: {
                    if (selectedItem.commandArgs) {
                        vscode.window.showTextDocument(selectedItem.commandArgs);
                    }

                    break;
                }

                case cmdOpenFileOnSide: {
                    if (selectedItem.commandArgs) {
                        // Nuovo editor laterale 
                        const document = await vscode.workspace.openTextDocument(selectedItem.commandArgs);
                        vscode.window.showTextDocument(document, {
                            viewColumn: vscode.ViewColumn.Beside, // Split editor a destra
                            preserveFocus: false,
                            preview: false,
                        });
                    }

                    break;
                }

                case cmdExecALObjectExplorer: {
                    if (selectedItem.commandArgs) {
                        const document = await vscode.workspace.openTextDocument(selectedItem.commandArgs);
                        const alObject: ALObject = new ALObject(document);
                        execALObjectExplorer(alObject);
                    }

                    break;
                }

                default: {
                    if (selectedItem.command) {
                        if (Array.isArray(selectedItem.commandArgs)) {
                            vscode.commands.executeCommand(selectedItem.command, ...selectedItem.commandArgs);
                        } else {
                            await vscode.commands.executeCommand(selectedItem.command, selectedItem.commandArgs);
                        }
                    }

                    break;
                }
            }
        }
    }
}
//#endregion Quick Pick Functions