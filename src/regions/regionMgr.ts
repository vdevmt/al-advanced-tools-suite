import * as vscode from 'vscode';
import * as alFileMgr from '../fileMgt/alFileMgr';
import { ATSSettings } from '../settings/atsSettings';

//#region Regions tools
export async function createRegionBySelection() {
    const editor = vscode.window.activeTextEditor;

    // Verifica la presenza di un editor attivo
    if (!editor) {
        return;
    }

    // Richiesta del nome della region da creare
    const regionName = await vscode.window.showInputBox({ prompt: 'Region name:' });
    if (regionName === undefined) {
        return;
    }

    const startRegionTxt = `#region ${regionName}`;
    const endRegionTxt = `#endregion ${regionName}`;

    const { selections } = editor;
    editor.edit(editBuilder => {
        selections.forEach(selection => {
            const selectedText = editor.document.getText(selection);

            // Calcolo il livello di indentatura della prima riga
            const startLine = editor.document.lineAt(selection.start.line);
            const indentation = startLine.firstNonWhitespaceCharacterIndex;
            const indentString = " ".repeat(indentation);

            // Inserisco il testo selezionato nella nuova region
            editBuilder.replace(selection, `${indentString}${startRegionTxt}\n\n${selectedText}\n\n${indentString}${endRegionTxt}`);
        });
    });
}
//#endregion Regions tools

//#region Status Bar
const regionsCache: { [uri: string]: string[] } = {};

export function regionPathStatusBarEnabled(): boolean {
    const atsSettings = ATSSettings.GetConfigSettings(null);
    return atsSettings[ATSSettings.ShowRegionsOnStatusBar];
}

export async function refreshDocumentRegions(document: vscode.TextDocument) {
    clearRegionsCache(document.fileName);

    if (alFileMgr.isALObjectDocument(document)) {
        const lines = document.getText().split('\n');
        const openedRegions: string[] = [];
        const regionsMap: string[] = [];

        lines.forEach((lineText, linePos) => {
            findRegionsOfDocument(lineText, linePos, openedRegions, regionsMap);
        });

        // Memorizza la mappa nel cache
        regionsCache[cacheDictionaryKey(document)] = regionsMap;
    }
}

export async function refreshDocumentRegionsForChanges(document: vscode.TextDocument, changes: vscode.TextDocumentContentChangeEvent[]) {
    // Aggiornamento cache per le sole righe modificate
    if (alFileMgr.isALObjectDocument(document)) {
        const openedRegions: string[] = [];
        const regionsMap = regionsCache[cacheDictionaryKey(document)] || [];

        changes.forEach(change => {
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;

            for (let linePos = startLine; linePos <= endLine; linePos++) {
                const lineText = document.lineAt(linePos).text.trim();
                findRegionsOfDocument(lineText, linePos, openedRegions, regionsMap);
            }
        });

        regionsCache[cacheDictionaryKey(document)] = regionsMap;
    }
}

function findRegionsOfDocument(currentLineText: string, currentLinePos: number, openedRegions: string[], regionsMap: string[]) {
    const regionRegex = /#(end)?region(\s+(.+))?/i;
    const match = regionRegex.exec(currentLineText.trim());
    let removeLast = false;

    if (match) {
        if (match[1] === 'end') {
            // Match for #endregion
            removeLast = true;
        } else {
            // Match for #region and capture the region name
            const regionName = match[3] ? match[3].trim() : '';
            openedRegions.push(regionName);
        }
    }
    // Save the current path in the map
    regionsMap[currentLinePos] = openedRegions.join(' > ');

    if (removeLast) {
        openedRegions.pop();
    }
}

export async function clearRegionsCache(fileName: string) {
    const uri = vscode.Uri.parse(fileName);
    if (alFileMgr.isALObjectFile(uri)) {
        delete regionsCache[uri.toString()];
    }
}

export async function getRegionPathFromCache(document: vscode.TextDocument, line: number, rebuildCache: boolean): Promise<string> {
    if (alFileMgr.isALObjectDocument(document)) {

        if (rebuildCache) {
            await clearRegionsCache(document.fileName);
        }

        if (!regionsCache[cacheDictionaryKey(document)]) {
            refreshDocumentRegions(document);
        }

        const regions = regionsCache[cacheDictionaryKey(document)];
        return regions[line] || '';
    }
}

function cacheDictionaryKey(document: vscode.TextDocument): string {
    return vscode.Uri.parse(document.fileName).toString();
}

export function findRegionStartLine(document: vscode.TextDocument, regionPath: string, currentPosition: number): number {
    let regions = regionPath.split('>');
    if (regions) {
        let regionName = regions[regions.length - 1].trimEnd();
        const lines = document.getText().split('\n');
        const regionRegex = new RegExp(`^#region.*\\b${regionName}\\b`, 'i');
        for (let i = currentPosition; i >= 0; i--) {
            if (regionRegex.test(lines[i].trim())) {
                return i;
            }
        }
    }
    return -1; // Region not found
}

export function truncateRegionPath(regionPath: string, maxLength: number): string {
    if (regionPath.length <= maxLength) {
        return regionPath;
    }

    const rightLength = Math.floor((maxLength - 3) / 2); // Calcola la lunghezza che può essere mantenuta dalla parte destra
    const leftLength = maxLength - rightLength - 3; // Resto della lunghezza da mantenere a sinistra, meno 3 per "..."

    // Tronca la parte iniziale e mantiene la parte destra visibile
    const truncatedText = `${regionPath.slice(0, leftLength)}...${regionPath.slice(-rightLength)}`;
    return truncatedText;
}

export function goToRegionStartLine(regionStartLine: number) {
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

    vscode.window.showInformationMessage('No region found for the current position.');
}

//#endregion Status Bar