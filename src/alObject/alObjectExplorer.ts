import * as vscode from 'vscode';
import * as alFileMgr from './alObjectFileMgr';
import { ALObject, ALObjectActions, ALObjectDataItems, ALTableFieldGroups, ALObjectFields, ALObjectProcedures, ALObjectRegions, ALTableKeys, ALObjectTriggers } from './alObject';

interface objectExplorerItem {
    label: string;
    description?: string;
    detail?: string;
    sortKey?: string;
    groupID: number;
    groupName: string;
    uri?: vscode.Uri;
    alObject?: ALObject;
    alOjectType?: string,
    iconName?: string;
    level?: number;
    startLine?: number;
    endLine?: number;
    command?: string;
    commandArgs?: any,
    itemkind?: vscode.QuickPickItemKind;
}

interface ObjectElement {
    type: string,
    count: number,
    iconName: string,
    command: string,
    commandArgs?: any,
}

//#region AL Object Explorer
export function countObjectElements(alObject: ALObject, compressResult: boolean): ObjectElement[] {
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
                            commandArgs: 'dataset',
                            iconName: 'symbol-field'
                        });
                    }
                    fieldsCount = alObjectFields.fields.filter(item => (item.section === 'requestpage') && (item.isfield)).length;
                    if (fieldsCount > 0) {
                        elements.push({
                            type: 'Options',
                            count: fieldsCount,
                            command: 'ats.showAllFields',
                            commandArgs: 'requestpage',
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
                        iconName: 'symbol-event'
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
            if (compressResult) {
                elements.push({
                    type: 'Procedures',
                    count: alObjectProcedures.elementsCount,
                    command: 'ats.showAllProcedures',
                    commandArgs: '',
                    iconName: 'code'
                });
            }
            else {
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
                            commandArgs: currGroupName,
                            iconName: currGroupIconName
                        });
                    }
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
                    iconName: 'symbol-number'
                });
            }
        }
    }
    catch {
        console.log(`No regions found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
    }

    return elements;
}

export async function execALObjectExplorer() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let objectElements = countObjectElements(alObject, false);
        if (objectElements && (objectElements.length > 0)) {
            const picked = await vscode.window.showQuickPick(objectElements.map(element => ({
                label: `$(${element.iconName}) ${element.type}: ${element.count}`,
                description: '',
                detail: '',
                command: element.command,
                commandArgs: element.commandArgs
            })), {
                placeHolder: `${alFileMgr.makeALObjectDescriptionText(alObject)}`,
                matchOnDescription: false,
                matchOnDetail: false,
            });

            if (picked) {
                if (picked.command) {
                    vscode.commands.executeCommand(picked.command, picked.commandArgs);
                }
            }
        }
    }
}

export async function showObjectItems(items: objectExplorerItem[], title: string, enableSearchOnDescription: boolean, enableSearchOnDetails: boolean) {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (items) {
        // Ricerca posizione corrente
        const currentLine = editor.selection.active.line;

        let currItemStartLine: number;
        try {
            const currentItem = [...items]
                .reverse()             // Inverte l'array
                .find(item => ((item.startLine <= currentLine) && (item.endLine === 0 || item.endLine >= currentLine)));  // Trova il primo che soddisfa la condizione
            currItemStartLine = currentItem.startLine;
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
            let qpItems = [];
            groups.forEach(group => {
                qpItems.push({
                    label: group.name,
                    description: '',
                    detail: '',
                    startLine: 0,
                    kind: vscode.QuickPickItemKind.Separator
                });

                const groupItems = items
                    .filter(item => (item.groupName === group.name))
                    .sort((a, b) => a.startLine - b.startLine);

                groupItems.forEach(item => {
                    qpItems.push({
                        label: ((item.level > 0) && (item.iconName)) ? `${'    '.repeat(item.level)}   $(${item.iconName}) ${item.label}` :
                            (item.level > 0) ? `${'    '.repeat(item.level)} ${item.label}` :
                                (item.iconName) ? `$(${item.iconName}) ${item.label}` :
                                    `${item.label}`,
                        description: (item.startLine === currItemStartLine) ? `${item.description} $(eye)` : item.description,
                        detail: (item.detail && (item.level > 0)) ? `${'    '.repeat(item.level)} ${item.detail}` : item.detail,
                        startLine: item.startLine,
                        kind: item.itemkind
                    });
                });
            });
            const picked = await vscode.window.showQuickPick(qpItems, {
                placeHolder: `${title}`,
                matchOnDescription: enableSearchOnDescription,
                matchOnDetail: enableSearchOnDetails,
            });

            if (picked) {
                if (picked.startLine > 0) {
                    const position = new vscode.Position(picked.startLine, 0);
                    const newSelection = new vscode.Selection(position, position);
                    editor.selection = newSelection;
                    editor.revealRange(new vscode.Range(position, position));
                }
            }
        }
    }
}
//#endregion AL Object Explorer

//#region AL Object Fields
export async function showAllFields(sectionFilter?: string) {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    let enableSearchOnDescription = true;
    let enableSearchOnDetails = true;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

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
                let items: objectExplorerItem[] = [];
                for (const field of alObjectFields.fields) {
                    let label = field.name;
                    let description = '';
                    let detail = '';
                    let itemkind = vscode.QuickPickItemKind.Default;

                    if (alObject.isTable() || alObject.isTableExt()) {
                        if (field.id > 0) {
                            label = `[${field.id}]  ${field.name}`;
                        }

                        description = field.type;
                        enableSearchOnDescription = false;
                        if (field.pkIndex > 0) {
                            description += ` (PK${field.pkIndex})`;
                        }

                        groupID = 0;
                        groupName = '';
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
                            groupName = `${field.type}(${field.name})`;
                        }
                        else {
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
                        groupName = field.dataItem;
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

                    if (field.isfield) {
                        items.push({
                            label: label,
                            description: description,
                            detail: detail,
                            groupID: groupID,
                            groupName: groupName,
                            startLine: field.startLine ? field.startLine : 0,
                            endLine: 0,
                            level: field.level,
                            iconName: field.iconName,
                            itemkind: itemkind
                        });
                    }
                }

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Fields`, enableSearchOnDescription, enableSearchOnDetails);
                return;
            }
        }

        vscode.window.showInformationMessage(`No fields found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}
//#endregion AL Object Fields

//#region AL Table Keys
export async function showAllTableKeys() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alTableKeys: ALTableKeys;
        alTableKeys = new ALTableKeys(alObject);
        if (alTableKeys.keys) {
            if (alTableKeys.elementsCount > 0) {
                let items: objectExplorerItem[] = alTableKeys.keys.map(item => ({
                    label: item.fieldsList,
                    description: item.isPrimaryKey ? `${item.name} [PK]` : item.name,
                    detail: '',
                    groupID: 0,
                    groupName: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: 0,
                    level: 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Keys`, true, false);
                return;
            }
        }

        vscode.window.showInformationMessage(`No keys found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}
//#endregion AL Table Keys

//#region AL Table Field Groups
export async function showAllTableFieldGroups() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alTableFieldGroups: ALTableFieldGroups;
        alTableFieldGroups = new ALTableFieldGroups(alObject);
        if (alTableFieldGroups.fieldgroups) {
            if (alTableFieldGroups.elementsCount > 0) {
                let items: objectExplorerItem[] = alTableFieldGroups.fieldgroups.map(item => ({
                    label: item.fieldsList,
                    description: '',
                    detail: item.name,
                    groupID: 0,
                    groupName: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: 0,
                    level: 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Keys`, false, true);
                return;
            }
        }

        vscode.window.showInformationMessage(`No field groups found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}
//#endregion AL Table Field Groups

//#region AL Object Triggers
export async function showAllTriggers() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alObjectTriggers: ALObjectTriggers;
        alObjectTriggers = new ALObjectTriggers(alObject);

        if (alObjectTriggers.triggers) {
            if (alObjectTriggers.triggers.length > 0) {
                let items: objectExplorerItem[] = alObjectTriggers.triggers.map(item => ({
                    label: item.name,
                    description: '',
                    detail: '',
                    groupID: 0,
                    groupName: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: 0,
                    level: 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Triggers`, false, true);
                return;
            }
        }

        vscode.window.showInformationMessage(`No triggers found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}
//#endregion AL Object Triggers

//#region AL Object Procedures
export async function showAllProcedures(groupFilter?: string) {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

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
                let items: objectExplorerItem[] = [];

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
                                    startLine: procedures[i].startLine ? procedures[i].startLine : 0,
                                    endLine: 0,
                                    level: 0,
                                    iconName: procedures[i].iconName
                                });
                            }
                        }
                    }
                }

                if (items) {
                    let title = groupFilter || 'Procedures';
                    showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: ${title}`, false, true);
                    return;
                }
            }
        }

        vscode.window.showInformationMessage(`No procedures found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}
//#endregion AL Object Procedures

//#region AL Object Dataitems
export async function showAllDataItems() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alObjectDataItems: ALObjectDataItems;
        alObjectDataItems = new ALObjectDataItems(alObject);
        if (alObjectDataItems.dataItems) {
            if (alObjectDataItems.elementsCount > 0) {
                let items: objectExplorerItem[] = alObjectDataItems.dataItems.map(item => ({
                    label: item.name,
                    description: item.sourceExpression,
                    detail: '',
                    groupID: 0,
                    groupName: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: item.endLine ? item.endLine : 0,
                    level: item.level,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Dataitems`, true, false);
                return;
            }
        }

        vscode.window.showInformationMessage(`No dataitems found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}
//#endregion AL Object Dataitems

//#region AL Object Page Actions
export async function showAllActions() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alObjectActions: ALObjectActions;
        alObjectActions = new ALObjectActions(alObject);
        if (alObjectActions.actions) {
            if (alObjectActions.elementsCount > 0) {
                let items: objectExplorerItem[] = alObjectActions.actions.map(item => ({
                    label: item.name,
                    description: item.sourceAction ? `Ref: ${item.sourceAction}` :
                        (item.properties && item.properties['caption']) ? `${item.properties['caption']}` : '',
                    detail: '',
                    groupID: 0,
                    groupName: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: 0,
                    level: item.level,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Page Actions`, true, true);
                return;
            }
        }

        vscode.window.showInformationMessage(`No actions found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}
//#endregion AL Object Page Actions

//#region AL Object Regions
export async function showAllRegions() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alObjectRegions: ALObjectRegions;
        alObjectRegions = new ALObjectRegions(alObject);
        if (alObjectRegions.regions) {
            if (alObjectRegions.elementsCount > 0) {
                let items: objectExplorerItem[] = alObjectRegions.regions.map(item => ({
                    label: item.name,
                    description: '',
                    detail: '',
                    groupID: 0,
                    groupName: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: item.endLine ? item.endLine : 0,
                    level: item.level ? item.level : 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Regions`, false, false);
                return;
            }
        }

        vscode.window.showInformationMessage(`No regions found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}
//#endregion AL Object Regions

//#region Open AL Objects
export async function showOpenALObjects() {
    const activeEditor = vscode.window.activeTextEditor;
    const activeUri = activeEditor?.document.uri.toString();

    // Recupera i tab aperti
    const openEditors = vscode.window.tabGroups.all.flatMap(group => group.tabs);

    const stack: objectExplorerItem[] = [];

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

                stack.push({
                    label: isLocked ? `$(${alObject.getDefaultIconName()}) $(lock-small) ${objectInfoText}` :
                        `$(${alObject.getDefaultIconName()}) ${objectInfoText}`,
                    description: isCurrentEditor ? '$(eye)' : '',
                    detail: vscode.workspace.asRelativePath(doc.uri),
                    groupID: 0,
                    groupName: '',
                    alOjectType: isCurrentEditor ? 'Current Editor' : alObject.objectTypeCamelCase(),
                    sortKey: objectSortKey(alObject, isCurrentEditor),
                    uri: doc.uri
                });
            }
        } catch (err) {
            console.log(`Unable to read file: ${editor}`, err);
        }
    }

    stack.sort((a, b) =>
        a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true, sensitivity: 'base' })
    );

    // Show object list
    const quickPickItems: objectExplorerItem[] = [];
    let lastObjectType: string = '';

    for (const item of stack) {
        if (lastObjectType !== item.alOjectType) {
            lastObjectType = item.alOjectType;

            quickPickItems.push({
                label: item.alOjectType,
                itemkind: vscode.QuickPickItemKind.Separator,
                groupID: 0,
                groupName: ''
            });
        }

        quickPickItems.push({
            label: item.label,
            description: item.description,
            detail: item.detail,
            groupID: 0,
            groupName: '',
            uri: item.uri
        });
    }

    const picked = await vscode.window.showQuickPick(quickPickItems.map(item => ({
        label: item.label,
        description: item.description,
        detail: item.detail,
        uri: item.uri,
        kind: item.itemkind
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