import * as vscode from 'vscode';
import * as alFileMgr from './alObjectFileMgr';
import { ALObject, ALObjectActions, ALObjectDataItems, ALTableFieldGroups, ALObjectFields, ALObjectProcedures, ALObjectRegions, ALTableKeys } from './alObject';

export interface QuickPickItem {
    label: string;
    description?: string;
    detail?: string;
    sortKey?: string;
    uri?: vscode.Uri;
    alObject?: ALObject;
    alOjectType?: string,
    iconName?: string;
    level?: number;
    startLine?: number;
    endLine?: number;
    command?: string;
    itemkind?: vscode.QuickPickItemKind;
}

//#region AL Object Explorer
export async function execALObjectExplorer() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let items: QuickPickItem[] = [];

        try {
            let alObjectDataItems: ALObjectDataItems;
            alObjectDataItems = new ALObjectDataItems(alObject);
            if (alObjectDataItems) {
                if (alObjectDataItems.elementsCount > 0) {
                    items.push({
                        label: `Dataitems: ${alObjectDataItems.elementsCount}`,
                        iconName: 'symbol-class',
                        command: 'ats.showAllDataItems'
                    });
                }
            }
        }
        catch {
            console.log(`No dataItems found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
        }

        try {
            let alObjectFields: ALObjectFields;
            alObjectFields = new ALObjectFields(alObject);
            if (alObjectFields) {
                if (alObjectFields.elementsCount > 0) {
                    items.push({
                        label: `Fields: ${alObjectFields.elementsCount}`,
                        iconName: 'symbol-field',
                        command: 'ats.showAllFields'
                    });
                }
            }
        }
        catch {
            console.log(`No fields found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
        }

        try {
            let alTableKeys: ALTableKeys;
            alTableKeys = new ALTableKeys(alObject);
            if (alTableKeys) {
                if (alTableKeys.elementsCount > 0) {
                    items.push({
                        label: `Keys: ${alTableKeys.elementsCount}`,
                        iconName: 'key',
                        command: 'ats.showAllTableKeys'
                    });
                }
            }
        }
        catch {
            console.log(`No fields found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
        }

        try {
            let alTableFieldGroups: ALTableFieldGroups;
            alTableFieldGroups = new ALTableFieldGroups(alObject);
            if (alTableFieldGroups) {
                if (alTableFieldGroups.elementsCount > 0) {
                    items.push({
                        label: `Field Groups: ${alTableFieldGroups.elementsCount}`,
                        iconName: 'group-by-ref-type',
                        command: 'ats.showAllTableFieldGroups'
                    });
                }
            }
        }
        catch {
            console.log(`No fields found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
        }

        try {
            let alObjectProcedures: ALObjectProcedures;
            alObjectProcedures = new ALObjectProcedures(alObject);
            if (alObjectProcedures) {
                if (alObjectProcedures.elementsCount > 0) {
                    items.push({
                        label: `Procedures: ${alObjectProcedures.elementsCount}`,
                        iconName: 'code',
                        command: 'ats.showAllProcedures'
                    });
                }
            }
        }
        catch {
            console.log(`No procedure found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
        }

        try {
            let alObjectRegions: ALObjectRegions;
            alObjectRegions = new ALObjectRegions(alObject);
            if (alObjectRegions) {
                if (alObjectRegions.elementsCount > 0) {
                    items.push({
                        label: `Regions: ${alObjectRegions.elementsCount}`,
                        iconName: 'symbol-number',
                        command: 'ats.showAllRegions'
                    });
                }
            }
        }
        catch {
            console.log(`No regions found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
        }

        try {
            let alObjectActions: ALObjectActions;
            alObjectActions = new ALObjectActions(alObject);
            if (alObjectActions) {
                if (alObjectActions.actionsCount > 0) {
                    items.push({
                        label: `Page Actions: ${alObjectActions.actionsCount}`,
                        iconName: 'symbol-event',
                        command: 'ats.showAllActions'
                    });
                }
            }
        }
        catch {
            console.log(`No actions found in ${alFileMgr.makeALObjectDescriptionText(alObject)}`);
        }

        if (items) {
            if (items.length > 0) {
                const picked = await vscode.window.showQuickPick(items.map(item => ({
                    label: `$(${item.iconName}) ${item.label}`,
                    description: item.description,
                    detail: item.detail,
                    command: item.command
                })), {
                    placeHolder: `${alFileMgr.makeALObjectDescriptionText(alObject)}`,
                    matchOnDescription: false,
                    matchOnDetail: false,
                });

                if (picked) {
                    if (picked.command) {
                        vscode.commands.executeCommand(picked.command);
                    }
                }
            }
        }
    }
}

export async function showObjectItems(items: QuickPickItem[], title: string, enableSearchOnDescription: boolean, enableSearchOnDetails: boolean) {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (items) {
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

        const picked = await vscode.window.showQuickPick(items.map(item => ({
            label: ((item.level > 0) && (item.iconName)) ? `${'    '.repeat(item.level)}   $(${item.iconName}) ${item.label}` :
                (item.level > 0) ? `${'    '.repeat(item.level)} ${item.label}` :
                    (item.iconName) ? `$(${item.iconName}) ${item.label}` :
                        `${item.label}`,
            description: (item.startLine === currItemStartLine) ? `${item.description} $(eye)` : item.description,
            detail: (item.detail && (item.level > 0)) ? `${'    '.repeat(item.level)} ${item.detail}` : item.detail,
            startLine: item.startLine,
            kind: item.itemkind
        })), {
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
//#endregion AL Object Explorer

//#region AL Object Fields
export async function showAllFields() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    let enableSearchOnDescription = true;
    let enableSearchOnDetails = true;
    let lastGroupName = '';

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alObjectFields: ALObjectFields;
        alObjectFields = new ALObjectFields(alObject);
        if (alObjectFields.fields) {
            if (alObjectFields.elementsCount > 0) {
                let items: QuickPickItem[] = [];
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

                        if (field.properties) {
                            if (('fieldclass' in field.properties) &&
                                (['flowfield', 'flowfilter'].includes(field.properties['fieldclass'].toLowerCase()))) {
                                description += ` <${field.properties['fieldclass']}>`;
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
                            label = `${field.type}(${field.name})`;
                            itemkind = vscode.QuickPickItemKind.Separator;
                            field.iconName = '';
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
                        if (field.sourceExpr) {
                            if (field.properties && ('method' in field.properties)) {
                                description = `${field.properties['method'].toUpperCase()}(${field.sourceExpr})`;
                            }
                            else {
                                description = field.sourceExpr;
                            }
                        }

                        if (field.dataItem !== lastGroupName) {
                            items.push({
                                label: field.dataItem,
                                itemkind: vscode.QuickPickItemKind.Separator
                            });
                            lastGroupName = field.dataItem;
                        }
                    }

                    if (alObject.isReport() || alObject.isReportExt()) {
                        if (field.sourceExpr) {
                            description = field.sourceExpr;
                        }

                        if (field.dataItem !== lastGroupName) {
                            items.push({
                                label: field.dataItem,
                                itemkind: vscode.QuickPickItemKind.Separator
                            });
                            lastGroupName = field.dataItem;
                        }
                    }

                    items.push({
                        label: label,
                        description: description,
                        detail: detail,
                        startLine: field.startLine ? field.startLine : 0,
                        endLine: 0,
                        level: field.level,
                        iconName: field.iconName,
                        itemkind: itemkind
                    });
                }

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Fields`, enableSearchOnDescription, enableSearchOnDetails);
                return;
            }
        }

        vscode.window.showInformationMessage(`No field found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
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
                let items: QuickPickItem[] = alTableKeys.keys.map(item => ({
                    label: item.fieldsList,
                    description: item.isPrimaryKey ? `${item.name} [PK]` : item.name,
                    detail: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: 0,
                    level: 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Keys`, true, false);
                return;
            }
        }

        vscode.window.showInformationMessage(`No key found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
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
                let items: QuickPickItem[] = alTableFieldGroups.fieldgroups.map(item => ({
                    label: item.fieldsList,
                    description: '',
                    detail: item.name,
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: 0,
                    level: 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Keys`, false, true);
                return;
            }
        }

        vscode.window.showInformationMessage(`No field group found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}
//#endregion AL Table Field Groups


//#region AL Object Procedures
export async function showAllProcedures() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alObjectProcedures: ALObjectProcedures;
        alObjectProcedures = new ALObjectProcedures(alObject);
        if (alObjectProcedures.procedures) {
            if (alObjectProcedures.elementsCount > 0) {
                let items: QuickPickItem[] = alObjectProcedures.procedures.map(item => ({
                    label: item.name,
                    description: '',
                    detail: (item.regionPath && item.sourceEvent) ? `Region: ${item.regionPath} | Event: ${item.sourceEvent}` :
                        (item.regionPath) ? `Region: ${item.regionPath}` :
                            (item.sourceEvent) ? `Event: ${item.sourceEvent}` : '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: 0,
                    level: 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Procedures`, false, true);
                return;
            }
        }

        vscode.window.showInformationMessage(`No procedure found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
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
                let items: QuickPickItem[] = alObjectDataItems.dataItems.map(item => ({
                    label: item.name,
                    description: item.sourceExpression,
                    detail: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: item.endLine ? item.endLine : 0,
                    level: item.level,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Dataitems`, true, false);
                return;
            }
        }

        vscode.window.showInformationMessage(`No Dataitem found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
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
                let items: QuickPickItem[] = alObjectActions.actions.map(item => ({
                    label: item.name,
                    description: item.sourceAction ? `Ref: ${item.sourceAction}` :
                        (item.properties && item.properties['caption']) ? `${item.properties['caption']}` : '',
                    detail: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: 0,
                    level: item.level,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Page Actions`, true, true);
                return;
            }
        }

        vscode.window.showInformationMessage(`No action found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
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
                let items: QuickPickItem[] = alObjectRegions.regions.map(item => ({
                    label: item.name,
                    description: '',
                    detail: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: item.endLine ? item.endLine : 0,
                    level: item.level ? item.level : 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Regions`, false, false);
                return;
            }
        }

        vscode.window.showInformationMessage(`No region found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}
//#endregion AL Object Regions

//#region Open AL Objects
export async function showOpenALObjects() {
    const activeEditor = vscode.window.activeTextEditor;
    const activeUri = activeEditor?.document.uri.toString();

    // Recupera i tab aperti
    const openEditors = vscode.window.tabGroups.all.flatMap(group => group.tabs);

    const stack: QuickPickItem[] = [];

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
    const quickPickItems: QuickPickItem[] = [];
    let lastObjectType: string = '';

    for (const item of stack) {
        if (lastObjectType !== item.alOjectType) {
            lastObjectType = item.alOjectType;

            quickPickItems.push({
                label: item.alOjectType,
                itemkind: vscode.QuickPickItemKind.Separator
            });
        }

        quickPickItems.push({
            label: item.label,
            description: item.description,
            detail: item.detail,
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