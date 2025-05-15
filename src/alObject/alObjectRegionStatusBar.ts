import * as vscode from 'vscode';
import * as regionMgr from './alObjectRegionMgr';
import { ATSSettings } from '../settings/atsSettings';
import { ALObject, ALObjectRegions } from './alObject';

var alObject: ALObject;
var alObjectRegions: ALObjectRegions;
var currDocumentKey: string;

export function createRegionsStatusBarItem(): vscode.StatusBarItem {
    const atsSettings = ATSSettings.GetConfigSettings(null);
    if ((atsSettings[ATSSettings.RegionInfoOnStatusBar] !== 'Hide')) {
        var alignment = vscode.StatusBarAlignment.Left;
        if (atsSettings[ATSSettings.RegionInfoOnStatusBar] === 'Show on Right') {
            alignment = vscode.StatusBarAlignment.Right;
        }

        const regionStatusBarItem = vscode.window.createStatusBarItem(alignment);
        regionStatusBarItem.text = '';
        regionStatusBarItem.tooltip = makeTooltip('');

        regionStatusBarItem.command = {
            command: 'ats.showAllRegions',
            title: `ATS: Show all regions`
        };

        regionStatusBarItem.show();

        return regionStatusBarItem;
    }

    return null;
}

function makeTooltip(regionInfoText: string): vscode.MarkdownString {
    const markdownTooltip = new vscode.MarkdownString();
    markdownTooltip.appendMarkdown("### **Region Info (ATS)**\n\n");
    if (regionInfoText) {
        markdownTooltip.appendMarkdown(`${regionInfoText}\n\n`);
    }

    return markdownTooltip;
}

export async function clearRegionsCache(fileName: string) {
    alObject = new ALObject(null, false);
    alObjectRegions = new ALObjectRegions(alObject);
}

export async function updateRegionsStatusBar(regionStatusBarItem: vscode.StatusBarItem, rebuildCache: boolean) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        regionStatusBarItem.text = '';
        regionStatusBarItem.tooltip = makeTooltip('');

        return;
    }

    const document = editor.document;
    const currentLine = editor.selection.active.line;

    regionStatusBarItem.text = '$(loading~spin) Searching regions';

    if (!rebuildCache) {
        rebuildCache = ((!alObjectRegions) || (alObjectRegions.objectName === '')) || (currDocumentKey !== makeDocumentKey(document));
    }

    if (rebuildCache) {
        alObject = new ALObject(document, true);
        alObjectRegions = new ALObjectRegions(alObject);
        currDocumentKey = makeDocumentKey(document);
    }

    let regionPath = regionMgr.findOpenRegionsPathByDocLine(alObjectRegions, currentLine);
    regionStatusBarItem.tooltip = makeTooltip(regionPath);
    regionStatusBarItem.text = regionPath ? `$(symbol-number) ${truncateRegionPath(regionPath, -1)}` : '';
}

function makeDocumentKey(document: vscode.TextDocument): string {
    return vscode.Uri.parse(document.fileName).toString();
}

function truncateRegionPath(regionPath: string, maxLength: number): string {
    if (maxLength < 0) {
        maxLength = 100; // Default value
    }

    if (regionPath.length <= maxLength) {
        return regionPath;
    }

    const rightLength = Math.floor((maxLength - 3) / 2); // Calcola la lunghezza che può essere mantenuta dalla parte destra
    const leftLength = maxLength - rightLength - 3; // Resto della lunghezza da mantenere a sinistra, meno 3 per "..."

    // Tronca la parte iniziale e mantiene la parte destra visibile
    const truncatedText = `${regionPath.slice(0, leftLength)}...${regionPath.slice(-rightLength)}`;
    return truncatedText;
}

