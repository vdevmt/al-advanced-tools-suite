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
        objectInfoStatusBarItem.tooltip = 'AL Object Info (ATS)';
        objectInfoStatusBarItem.command = undefined;
        objectInfoStatusBarItem.show();

        updateObjectInfoStatusBar(objectInfoStatusBarItem);

        return objectInfoStatusBarItem;
    }
    return null;
}

export async function updateObjectInfoStatusBarByDocument(objectInfoStatusBarItem: vscode.StatusBarItem, document: vscode.TextDocument) {
    objectInfoStatusBarItem.text = '';

    if (document) {
        if (alFileMgr.isALObjectDocument(document)) {
            let alObject: ALObject;
            alObject = new ALObject(document.getText(), document.fileName);

            objectInfoStatusBarItem.text = `$(info) ${capitalizeObjectType(alObject.objectType)} ${alObject.objectId} ${alObject.objectName}`;
            objectInfoStatusBarItem.show();
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

function capitalizeObjectType(objectType: string): string {
    if (objectType) {
        if (objectType === 'tableextension') {
            return 'TableExtension';
        }
        if (objectType === 'pageextension') {
            return 'PageExtension';
        }
        if (objectType === 'reportextension') {
            return 'ReportExtension';
        }

        return objectType.charAt(0).toUpperCase() + objectType.slice(1).toLowerCase();
    }

    return '';
}