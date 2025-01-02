import * as vscode from 'vscode';
import * as alFileMgr from '../fileMgt/alFileMgr';
import * as regionMgr from './regionMgr';
import { ATSSettings } from '../settings/atsSettings';

var docRegionsCache: RegionInfo[] = [];

interface RegionInfo {
    documentKey?: string;
    name?: string;
    startLine?: number;
    endLine?: number;
    level?: number;
}

interface LineRegionInfo {
    regionPath: string,
    lastRegionStartPos: number
    lastRegionEndPos: number
}

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
        regionStatusBarItem.command = undefined;
        regionStatusBarItem.show();

        return regionStatusBarItem;
    }

    return null;
}

export async function updateRegionsStatusBar(regionStatusBarItem: vscode.StatusBarItem, rebuildCache: boolean) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        regionStatusBarItem.text = '';
        regionStatusBarItem.tooltip = makeTooltip('');
        regionStatusBarItem.command = undefined;
        return;
    }

    const document = editor.document;
    const currentLine = editor.selection.active.line;

    regionStatusBarItem.text = '$(loading~spin) Searching regions';

    let regionInfo = getRegionsInfoByDocumentLine(document, currentLine, rebuildCache);
    if (regionInfo) {
        regionStatusBarItem.tooltip = makeTooltip(regionInfo.regionPath);
        regionStatusBarItem.text = `$(symbol-number) ${truncateRegionPath(regionInfo.regionPath, -1)}`;

        // Registra un comando per ogni regione
        regionStatusBarItem.command = {
            command: 'ats.browseDocumentRegions',
            arguments: [regionInfo.lastRegionStartPos],
            title: `ATS: Go to Region start position`
        };
    }
    else {
        if (regionMgr.documentHasRegion(document)) {
            regionStatusBarItem.text = `$(symbol-number) Out of Region`;
        }
        else {
            regionStatusBarItem.text = '';
        }
    }
}

export async function findDocumentRegions(document: vscode.TextDocument) {
    const documentKey = makeDocumentKey(document);
    removeDocumentRegionsFromCache(documentKey);

    var docRegions: RegionInfo[] = [];

    if (alFileMgr.isALObjectDocument(document)) {
        const lines = document.getText().split('\n');
        const stack: { name: string; startLine: number }[] = [];

        lines.forEach((lineText, linePos) => {
            const lineNumber = linePos;
            if (regionMgr.isRegionStartLine(lineText)) {
                let name = regionMgr.getRegionName(lineText);
                console.log(`Found region start: ${name} at line ${lineNumber}`);
                stack.push({ name, startLine: lineNumber });
                return;
            }

            if (regionMgr.isRegionEndLine(lineText)) {
                if (stack.length > 0) {

                    const lastRegion = stack.pop();
                    if (lastRegion) {
                        const level = stack.length;

                        docRegions.push({
                            documentKey: documentKey,
                            name: lastRegion.name,
                            startLine: lastRegion.startLine,
                            endLine: lineNumber,
                            level: level
                        });

                        console.log(`Region added: ${lastRegion.name}, from ${lastRegion.startLine} to ${lineNumber}, level: ${level}`);
                    }
                }
            }
        });

        if (docRegions.length > 0) {
            // Order by StartLine
            docRegions.sort((a, b) => a.startLine - b.startLine);

            // Cache new regions
            docRegionsCache.push(...docRegions);
        }
    }
}

function truncateRegionPath(regionPath: string, maxLength: number): string {
    if (maxLength < 0) {
        maxLength = 60; // Default value
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


function makeDocumentKey(document: vscode.TextDocument): string {
    return vscode.Uri.parse(document.fileName).toString();
}

export async function clearRegionsCache(fileName: string) {
    const uri = vscode.Uri.parse(fileName);
    if (alFileMgr.isALObjectFile(uri)) {
        removeDocumentRegionsFromCache(uri.toString());
    }
}

function findDocumentRegionsFromCache(documentKey: string): RegionInfo[] {
    if (documentKey) {
        return docRegionsCache.filter(region => region.documentKey === documentKey);
    }

    return null;
}

function existsDocumentRegionsInCache(documentKey: string): boolean {
    let docRegions = findDocumentRegionsFromCache(documentKey);
    return (docRegions.length > 0);
}

function findOpenRegionsByDocLine(documentKey: string, documentLine: number): RegionInfo[] {
    if (documentKey && (documentLine > 0)) {
        let docRegions = findDocumentRegionsFromCache(documentKey);

        if (docRegions.length > 0) {
            docRegions = docRegions.filter(region => region.startLine <= documentLine);
            let openRegions: RegionInfo[] = [];

            for (const region of docRegions) {
                if (documentLine >= region.startLine && documentLine <= region.endLine) {
                    openRegions.push(region);
                }
            }

            return openRegions;
        }
    }

    return null;
}

function removeDocumentRegionsFromCache(documentKey: string) {
    if (docRegionsCache.length > 0) {
        docRegionsCache = docRegionsCache.filter(region => region.documentKey !== documentKey);
    }
}

function getRegionsInfoByDocumentLine(document: vscode.TextDocument, line: number, rebuildCache: boolean): LineRegionInfo {
    if (alFileMgr.isALObjectDocument(document)) {
        let documentKey = makeDocumentKey(document);

        if (!regionMgr.documentHasRegion(document)) {
            clearRegionsCache(document.fileName);
            return null;
        }

        if (rebuildCache) {
            clearRegionsCache(document.fileName);
        }

        if (!existsDocumentRegionsInCache(documentKey)) {
            findDocumentRegions(document);
        }

        let openRegions = findOpenRegionsByDocLine(documentKey, line);
        if (openRegions) {
            let lastRegionStartLine = 0;
            let lastRegionEndLine = 0;
            if (openRegions.length > 0) {
                let regions: string[] = [];
                for (const region of openRegions) {
                    regions.push(region.name);
                    lastRegionStartLine = region.startLine;
                    lastRegionEndLine = region.endLine;
                }

                let regionInfo: LineRegionInfo = {
                    regionPath: regions.join(' > '),
                    lastRegionStartPos: lastRegionStartLine,
                    lastRegionEndPos: lastRegionEndLine
                };

                return regionInfo;
            }
        }
    }

    return null;
}

export function goToRegionStartLine(regionStartLine: number, regionPath: string) {
    if (regionPath) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (regionStartLine >= 0) {
                const position = new vscode.Position(regionStartLine, 0);
                const newSelection = new vscode.Selection(position, position);
                editor.selection = newSelection;
                editor.revealRange(new vscode.Range(position, position));

                return;
            }
        }

        vscode.window.showInformationMessage(`Unable to find the start position of Region: ${regionPath}`);
    }
}


function makeTooltip(regionInfoText: string): vscode.MarkdownString {
    const markdownTooltip = new vscode.MarkdownString();
    markdownTooltip.appendMarkdown("### **Region Info (ATS)**\n\n");
    if (regionInfoText) {
        markdownTooltip.appendMarkdown(`${regionInfoText}\n\n`);
    }

    return markdownTooltip;
}

export async function browseDocumentRegions(currRegionStartLine: number) {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        if (regionMgr.documentHasRegion(document)) {
            let documentKey = makeDocumentKey(document);

            clearRegionsCache(document.fileName);
            findDocumentRegions(document);

            let docRegions = findDocumentRegionsFromCache(documentKey);
            if (docRegions.length > 0) {
                const picked = await vscode.window.showQuickPick(docRegions.map(item => ({
                    label:
                        ((item.startLine === currRegionStartLine) && (item.level === 0)) ? `$(symbol-number) $(eye) ${item.name}` :
                            ((item.startLine === currRegionStartLine) && (item.level > 0)) ? `└─${'─'.repeat(item.level)} $(eye) ${item.name}` :
                                ((item.startLine !== currRegionStartLine) && (item.level === 0)) ? `$(symbol-number) ${item.name}` :
                                    ((item.startLine !== currRegionStartLine) && (item.level > 0)) ? `└─${'─'.repeat(item.level)} ${item.name}` :
                                        item.name,
                    description: '',
                    detail: '',
                    regionStartLine: item.startLine
                })), {
                    placeHolder: 'Regions',
                    matchOnDescription: true,
                    matchOnDetail: true,
                });

                if (picked) {
                    const position = new vscode.Position(picked.regionStartLine, 0);
                    const newSelection = new vscode.Selection(position, position);
                    editor.selection = newSelection;
                    editor.revealRange(new vscode.Range(position, position));
                }
            }
        }
    }
}
