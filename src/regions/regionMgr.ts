import * as vscode from 'vscode';
import * as alFileMgr from '../alObject/alObjectFileMgr';
import { ALObject, ALObjectRegions } from '../alObject/alObject';

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
                    level: item.level ? item.level : 0,
                    iconName: item.iconName
                }));

                alFileMgr.showObjectItems(items, 'Regions');
                return;
            }
        }

        vscode.window.showInformationMessage(`No region found in ${alObject.objectType} ${alObject.objectName}`);
    }
}
//#endregion Regions tools
