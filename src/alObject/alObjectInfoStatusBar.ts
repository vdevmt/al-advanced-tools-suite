import * as vscode from 'vscode';
import * as alFileMgr from './alObjectFileMgr';
import { ALObject, ALObjectActions, ALObjectDataItems, ALObjectFields, ALObjectProcedures, ALObjectRegions } from './alObject';
import { ATSSettings } from '../settings/atsSettings';

export function createObjectInfoStatusBarItem(): vscode.StatusBarItem {
    const atsSettings = ATSSettings.GetConfigSettings(null);
    if ((atsSettings[ATSSettings.ObjectInfoOnStatusBar] !== 'Hide')) {
        var alignment = vscode.StatusBarAlignment.Left;
        if (atsSettings[ATSSettings.ObjectInfoOnStatusBar] === 'Show on Right') {
            alignment = vscode.StatusBarAlignment.Right;
        }

        const objectInfoStatusBarItem = vscode.window.createStatusBarItem(alignment);
        objectInfoStatusBarItem.text = `$(info)`;
        objectInfoStatusBarItem.tooltip = makeTooltip(null, '');
        objectInfoStatusBarItem.command = {
            command: 'ats.showOpenALObjects',
            title: `ATS: Show open AL Objects`
        };

        objectInfoStatusBarItem.show();

        updateObjectInfoStatusBar(objectInfoStatusBarItem);

        return objectInfoStatusBarItem;
    }
    return null;
}

export async function updateObjectInfoStatusBarByDocument(objectInfoStatusBarItem: vscode.StatusBarItem, document: vscode.TextDocument) {
    objectInfoStatusBarItem.text = '';
    objectInfoStatusBarItem.tooltip = makeTooltip(null, '');

    if (document) {
        if (alFileMgr.isALObjectDocument(document)) {
            let alObject: ALObject;
            alObject = new ALObject(document);
            let objectInfoText = alFileMgr.makeALObjectDescriptionText(alObject);
            objectInfoStatusBarItem.tooltip = makeTooltip(alObject, objectInfoText);
            objectInfoStatusBarItem.text = `$(info) ${objectInfoText}`;
        }
    }
}
export async function updateObjectInfoStatusBar(objectInfoStatusBarItem: vscode.StatusBarItem) {
    const editor = vscode.window.activeTextEditor;
    objectInfoStatusBarItem.text = '';

    if (editor) {
        const document = editor.document;
        updateObjectInfoStatusBarByDocument(objectInfoStatusBarItem, document);
    }
}

function makeTooltip(alObject: ALObject, objectInfoText: string): vscode.MarkdownString {
    const markdownTooltip = new vscode.MarkdownString();
    markdownTooltip.appendMarkdown("### **AL Object Info (ATS)**\n\n");
    if (objectInfoText) {
        markdownTooltip.appendMarkdown(`${objectInfoText}\n\n`);
    }

    if (alObject) {
        if (alObject.extendedObjectName) {
            markdownTooltip.appendMarkdown(`extends ${alFileMgr.addQuotesIfNeeded(alObject.extendedObjectName)}\n\n`);
        }

        if (alObject.objectNamespace) {
            markdownTooltip.appendMarkdown(`Namespace: ${alObject.objectNamespace}\n\n`);
        }

        let alObjectDataItems: ALObjectDataItems;
        alObjectDataItems = new ALObjectDataItems(alObject);

        let alObjectFields: ALObjectFields;
        alObjectFields = new ALObjectFields(alObject);

        let alObjectProcedures: ALObjectProcedures;
        alObjectProcedures = new ALObjectProcedures(alObject);

        let alObjectRegions: ALObjectRegions;
        alObjectRegions = new ALObjectRegions(alObject);

        let alObjectActions: ALObjectActions;
        alObjectActions = new ALObjectActions(alObject);

        const counters = [
            alObjectDataItems.elementsCount > 0 ? `Dataitems: ${alObjectDataItems.elementsCount}` : '',
            alObjectFields.elementsCount > 0 ? `Fields: ${alObjectFields.elementsCount}` : '',
            alObjectActions.elementsCount > 0 ? `Actions: ${alObjectActions.elementsCount}` : '',
            alObjectProcedures.elementsCount > 0 ? `Procedures: ${alObjectProcedures.elementsCount}` : '',
            alObjectRegions.elementsCount > 0 ? `Regions: ${alObjectRegions.elementsCount}` : ''
        ]
            .filter(Boolean)
            .join(' | ');

        if (counters.length > 0) {
            markdownTooltip.appendMarkdown(`${counters}\n\n`);
        }

        if (alObject.objectFileName) {
            let filePath = vscode.workspace.asRelativePath(alObject.objectFileName);
            markdownTooltip.appendMarkdown(`Path: ${filePath}\n\n`);
        }
    }

    return markdownTooltip;
}



