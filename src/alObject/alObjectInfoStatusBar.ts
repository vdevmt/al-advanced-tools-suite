import * as vscode from 'vscode';
import * as alFileMgr from './alObjectFileMgr';
import * as alObjectExplorer from './alObjectExplorer';
import * as typeHelper from '../typeHelper';
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
        objectInfoStatusBarItem.tooltip = makeTooltip(null, '');
        objectInfoStatusBarItem.command = {
            command: 'ats.ALObjectExplorer',
            title: `ATS: AL Object Explorer`
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
    markdownTooltip.appendMarkdown("### **AL Object Info (ATS)**");
    if (objectInfoText) {
        markdownTooltip.appendText('\n');
        markdownTooltip.appendMarkdown(`${objectInfoText}`);
    }

    if (alObject) {
        if (alObject.extendedObjectName) {
            markdownTooltip.appendText('\n');
            markdownTooltip.appendMarkdown(`Extends: ${typeHelper.addQuotesIfNeeded(alObject.extendedObjectName)}`);
        }

        if (alObject.objectNamespace) {
            markdownTooltip.appendText('\n');
            markdownTooltip.appendMarkdown(`Namespace: ${alObject.objectNamespace}`);
        }

        if (alObject.properties['caption']) {
            markdownTooltip.appendText('\n');
            markdownTooltip.appendMarkdown(`Caption: "${alObject.properties['caption']}"`);
        }

        if (alObject.isTable()) {
            let tableType = alObject.properties['tabletype'] ? alObject.properties['tabletype'] : 'Normal';
            markdownTooltip.appendText('\n');
            markdownTooltip.appendMarkdown(`Table Type: ${tableType}`);
        }

        if (alObject.isPage()) {
            if (alObject.properties['pagetype']) {
                markdownTooltip.appendText('\n');
                markdownTooltip.appendMarkdown(`Page Type: ${alObject.properties['pagetype']}`);
            }
            if (alObject.sourceTableName) {
                markdownTooltip.appendText('\n');
                markdownTooltip.appendMarkdown(`Source Table: ${typeHelper.addQuotesIfNeeded(alObject.sourceTableName)}`);
            }
        }
        if (alObject.isReport()) {
            let reportType = 'Print';
            if (alObject.properties['processingonly'] && (Boolean(alObject.properties['processingonly']) === true)) {
                reportType = 'Processing Only';
            }
            markdownTooltip.appendText('\n');
            markdownTooltip.appendMarkdown(`Report Type: ${reportType}`);
        }
        if (alObject.isCodeunit()) {
            let codeunitType = '';
            if (alObject.properties['subtype']) {
                codeunitType = alObject.properties['subtype'];
            }
            else {
                if (alObject.properties['singleinstance'] && (Boolean(alObject.properties['singleinstance']) === true)) {
                    codeunitType = 'Single Instance';
                }
            }
            if (codeunitType) {
                markdownTooltip.appendText('\n');
                markdownTooltip.appendMarkdown(`Codeunit Type: ${codeunitType}`);
            }

            if (alObject.properties['tableno']) {
                markdownTooltip.appendText('\n');
                markdownTooltip.appendMarkdown(`Source Table: ${alObject.properties['tableno']}`);
            }
        }

        if (alObject.properties['description']) {
            markdownTooltip.appendText('\n');
            markdownTooltip.appendMarkdown(`Description: "${alObject.properties['description']}"`);
        }

        let objectElements = alObjectExplorer.countObjectElements(alObject, true);
        if (objectElements && (objectElements.length > 0)) {
            const counters = objectElements.map(element => (`${element.type}: ${element.count}`));
            markdownTooltip.appendText('\n');
            markdownTooltip.appendMarkdown(`${counters.join(' | ')}`);
        }

        if (alObject.objectFileName) {
            let filePath = vscode.workspace.asRelativePath(alObject.objectFileName);
            markdownTooltip.appendText('\n');
            markdownTooltip.appendMarkdown(`Path: ${filePath}`);
        }
    }

    return markdownTooltip;
}



