import * as vscode from 'vscode';
import * as alFileMgr from '../fileMgt/alFileMgr';
import { ALObject, ALObjectRegions } from '../fileMgt/alObject';

interface RegionInfo {
    name: string;
    startLine: number;
    endLine?: number;
    level?: number;
}

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

export function documentHasRegion(document: vscode.TextDocument): boolean {
    const documentText = document.getText();
    const lines = documentText.split('\n');

    // Verifica se almeno una riga contiene '#region'
    return lines.some(line => line.includes('#region'));
}

export function isRegionStartLine(lineText: string): boolean {
    const regionStartRegex = /^\s*#region\b.*$/i;

    return regionStartRegex.test(lineText.trim());
}
export function isRegionEndLine(lineText: string): boolean {
    const regionEndRegex = /^\s*#endregion\b.*$/i;

    return regionEndRegex.test(lineText.trim());
}
export function getRegionName(lineText: string): string {
    if (isRegionStartLine(lineText)) {

        const regionRegex = /#region(\s+(.+))?/i;
        const match = regionRegex.exec(lineText.trim());
        var regionName = match[2] ? match[2].trim() : '';

        if (!regionName) {
            regionName = 'Region';
        }

        return regionName;
    }

    return '';
}

export function findOpenRegionsPathByDocLine(alObjectRegions: ALObjectRegions, documentLine: number): string {
    if (alObjectRegions && (documentLine > 0)) {
        if (alObjectRegions.regions.length > 0) {
            let openRegions = alObjectRegions.regions.filter(region => (region.startLine <= documentLine && region.endLine >= documentLine));
            if (openRegions) {
                if (openRegions.length > 0) {
                    return openRegions.map(region => region.name).join(' > ');
                }
            }
        }
    }

    return '';
}
export function findCurrentRegionStartLine(alObjectRegions: ALObjectRegions, documentLine: number): number {
    if (alObjectRegions && (documentLine > 0)) {
        if (alObjectRegions.regions.length > 0) {
            let openRegions = alObjectRegions.regions.filter(region => (region.startLine <= documentLine && region.endLine >= documentLine));
            if (openRegions) {
                return openRegions[openRegions.length - 1].startLine;
            }
        }
    }

    return 0;
}

export async function showAllRegions() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;

    if (alFileMgr.isALObjectDocument(document)) {
        if (documentHasRegion(document)) {
            let alObject: ALObject;
            alObject = new ALObject(document);

            let alObjectRegions: ALObjectRegions;
            alObjectRegions = new ALObjectRegions(alObject);

            if (alObjectRegions.regions.length > 0) {
                let currRegionStartLine = 0;
                try {
                    const currentLine = editor.selection.active.line;
                    currRegionStartLine = findCurrentRegionStartLine(alObjectRegions, currentLine);
                }
                catch {
                    currRegionStartLine = 0;
                }

                const picked = await vscode.window.showQuickPick(alObjectRegions.regions.map(item => ({
                    label: (item.level === 0) ? `$(symbol-number) ${item.name}` : `└──${'───'.repeat(item.level - 1)} $(symbol-number) ${item.name}`,
                    description: (item.startLine === currRegionStartLine) ? `$(eye)` : '',
                    detail: '',
                    regionStartLine: item.startLine
                })), {
                    placeHolder: 'Regions',
                    matchOnDescription: false,
                    matchOnDetail: false,
                });

                if (picked) {
                    const position = new vscode.Position(picked.regionStartLine, 0);
                    const newSelection = new vscode.Selection(position, position);
                    editor.selection = newSelection;
                    editor.revealRange(new vscode.Range(position, position));
                }
            }
            else {
                vscode.window.showInformationMessage(`No regions found in ${alObject.objectType} ${alObject.objectName}`);
            }
        }
        else {
            vscode.window.showInformationMessage('No regions found in the current document');
        }
    }
}
//#endregion Regions tools
