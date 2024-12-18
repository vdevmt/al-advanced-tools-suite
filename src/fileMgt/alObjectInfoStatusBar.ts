import * as vscode from 'vscode';
import * as alFileMgr from '../fileMgt/alFileMgr';
import { ALObject } from './alObject';
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
        objectInfoStatusBarItem.tooltip = makeTooltip('', '');
        objectInfoStatusBarItem.command = undefined;
        objectInfoStatusBarItem.show();

        updateObjectInfoStatusBar(objectInfoStatusBarItem);

        return objectInfoStatusBarItem;
    }
    return null;
}

export async function updateObjectInfoStatusBarByDocument(objectInfoStatusBarItem: vscode.StatusBarItem, document: vscode.TextDocument) {
    objectInfoStatusBarItem.text = '';
    objectInfoStatusBarItem.tooltip = makeTooltip('', '');

    if (document) {
        if (alFileMgr.isALObjectDocument(document)) {
            let alObject: ALObject;
            alObject = new ALObject(document.getText(), document.fileName);
            let objectInfoText = `${alFileMgr.capitalizeObjectType(alObject.objectType)} ${alObject.objectId} ${addQuotesIfNeeded(alObject.objectName)}`;

            objectInfoStatusBarItem.tooltip = makeTooltip(objectInfoText, alObject.extendedObjectName);
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

function makeTooltip(objectInfoText: string, extendedObjectName: string): vscode.MarkdownString {
    const markdownTooltip = new vscode.MarkdownString();
    markdownTooltip.appendMarkdown("### **AL Object Info (ATS)**\n\n");
    if (objectInfoText) {
        markdownTooltip.appendMarkdown(`${objectInfoText}\n\n`);

        if (extendedObjectName) {
            markdownTooltip.appendMarkdown(`extends ${addQuotesIfNeeded(extendedObjectName)}\n\n`);
        }
    }

    return markdownTooltip;
}
function addQuotesIfNeeded(text: string): string {
    if (text.includes(" ")) {
        return `"${text}"`;
    }

    return text;
}

