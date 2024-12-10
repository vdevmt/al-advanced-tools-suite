import * as vscode from 'vscode';
import {ATSSettings} from '../settings/atsSettings';

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

export function regionPathStatusBarEnabled(): boolean {
    const atsSettings = ATSSettings.GetConfigSettings(null);
    return atsSettings[ATSSettings.ShowRegionsOnStatusBar];
}

export function getRegionPath(document: vscode.TextDocument, line: number): string {
    const regions: string[] = [];

    for (let i = 0; i <= line; i++) {
        const lineText = document.lineAt(i).text.trim();

        if (lineText.startsWith('#region')) {
            const regionName = lineText.replace('#region', '').trim();
            regions.push(regionName);
        } else if (lineText.startsWith('#endregion')) {
            regions.pop();
        }
    }

    return regions.join(' > ');
}

export function findRegionStartLine(document: vscode.TextDocument, regionPath: string): number {
    let regions = regionPath.split('>');
    if (regions) {
        let regionName = regions[regions.length - 1];
        const lines = document.getText().split('\n');
        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i].trim();
            if (lineText.startsWith('#region') && lineText.includes(regionName)) {
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

export function goToRegionStartLine(currentLine: number) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        if (currentLine !== -1) {
            const position = new vscode.Position(currentLine, 0);
            const newSelection = new vscode.Selection(position, position);
            editor.selection = newSelection;
            editor.revealRange(new vscode.Range(position, position));

            return;
        }
    } 
    
    vscode.window.showInformationMessage('No region found for the current position.');    
}