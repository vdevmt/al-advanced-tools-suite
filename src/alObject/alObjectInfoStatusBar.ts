import * as vscode from 'vscode';
import * as alFileMgr from './alObjectFileMgr';
import * as alObjectExplorer from './alObjectExplorer';
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
            markdownTooltip.appendMarkdown(`Extends: ${alFileMgr.addQuotesIfNeeded(alObject.extendedObjectName)}`);
        }

        if (alObject.objectNamespace) {
            markdownTooltip.appendText('\n');
            markdownTooltip.appendMarkdown(`Namespace: ${alObject.objectNamespace}`);
        }

        if (alObject.properties) {
            if (alObject.properties['caption']) {
                markdownTooltip.appendText('\n');
                markdownTooltip.appendMarkdown(`Caption: "${alObject.properties['caption']}"`);
            }

            if (alObject.properties['description']) {
                markdownTooltip.appendText('\n');
                markdownTooltip.appendMarkdown(`Description: "${alObject.properties['description']}"`);
            }

            if (alObject.isTable()) {
                if (alObject.properties['tabletype']) {
                    markdownTooltip.appendText('\n');
                    markdownTooltip.appendMarkdown(`Type: ${alObject.properties['tabletype']}`);
                }
            }

            if (alObject.isPage()) {
                if (alObject.properties['pagetype']) {
                    markdownTooltip.appendText('\n');
                    markdownTooltip.appendMarkdown(`Type: ${alObject.properties['pagetype']}`);
                }
            }
            if (alObject.isReport()) {
                if (alObject.properties['processingonly'] && (Boolean(alObject.properties['processingonly']) === true)) {
                    markdownTooltip.appendText('\n');
                    markdownTooltip.appendMarkdown(`Type: ProcessingOnly`);
                }
            }
        }

        let objectElements = alObjectExplorer.countObjectElements(alObject);
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



