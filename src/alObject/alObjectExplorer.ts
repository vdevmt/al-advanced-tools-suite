import * as vscode from 'vscode';
import * as alFileMgr from './alObjectFileMgr';
import { ALObject, ALObjectActions, ALObjectDataItems, ALObjectFields, ALObjectProcedures, ALObjectRegions, ALTableKeys } from './alObject';

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
                if (alObjectActions.elementsCount > 0) {
                    items.push({
                        label: `Page Actions: ${alObjectActions.elementsCount}`,
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

export async function showAllFields() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        let alObject: ALObject;
        alObject = new ALObject(document);

        let alObjectFields: ALObjectFields;
        alObjectFields = new ALObjectFields(alObject);
        if (alObjectFields.fields) {
            if (alObjectFields.elementsCount > 0) {
                let items: QuickPickItem[] = alObjectFields.fields.map(item => ({
                    label: item.id > 0 ? `[${item.id}]  ${item.name}` : `${item.name}`,
                    description: item.type,
                    detail: item.dataItem ? item.dataItem : '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: 0,
                    level: 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Fields`);
                return;
            }
        }

        vscode.window.showInformationMessage(`No field found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}

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
                    label: `${item.name}: ${item.fieldsList}`,
                    description: item.isPrimaryKey ? 'Primary Key' : '',
                    detail: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: 0,
                    level: 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Keys`);
                return;
            }
        }

        vscode.window.showInformationMessage(`No field found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}

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

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Procedures`);
                return;
            }
        }

        vscode.window.showInformationMessage(`No procedure found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}

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
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: item.endLine ? item.endLine : 0,
                    level: item.level,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Dataitems`);
                return;
            }
        }

        vscode.window.showInformationMessage(`No Dataitem found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}

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
                    description: item.sourceAction,
                    detail: item.area ? `Area: ${item.area}` : '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: 0,
                    level: 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Page Actions`);
                return;
            }
        }

        vscode.window.showInformationMessage(`No action found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}

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
                let items: alFileMgr.QuickPickItem[] = alObjectRegions.regions.map(item => ({
                    label: item.name,
                    description: '',
                    detail: '',
                    startLine: item.startLine ? item.startLine : 0,
                    endLine: item.endLine ? item.endLine : 0,
                    level: item.level ? item.level : 0,
                    iconName: item.iconName
                }));

                showObjectItems(items, `${alFileMgr.makeALObjectDescriptionText(alObject)}: Regions`);
                return;
            }
        }

        vscode.window.showInformationMessage(`No region found in ${alObject.objectTypeCamelCase()} ${alObject.objectName}`);
    }
}

export async function showObjectItems(items: QuickPickItem[], title: string) {
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
            label: ((item.level > 0) && (item.iconName)) ? `${'....'.repeat(item.level)}   $(${item.iconName}) ${item.label}` :
                (item.level > 0) ? `${'....'.repeat(item.level)} ${item.label}` :
                    (item.iconName) ? `$(${item.iconName}) ${item.label}` :
                        `${item.label}`,
            description: (item.startLine === currItemStartLine) ? `${item.description} $(eye)` : item.description,
            detail: item.detail,
            startLine: item.startLine
        })), {
            placeHolder: `${title}`,
            matchOnDescription: true,
            matchOnDetail: true,
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