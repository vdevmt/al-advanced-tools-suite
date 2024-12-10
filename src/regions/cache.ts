import * as vscode from 'vscode';
import * as alFileMgr from '../fileMgt/alFileMgr';

const regionCache: { [uri: string]: string[] } = {};

// Aggiornamento cache per il documento
 export async function updateDocumentRegionCache(document: vscode.TextDocument) {
    if (alFileMgr.isALObjectDocument(document)) {
        const lines = document.getText().split('\n');
        const regions: string[] = [];
        const lineToRegionMap: string[] = []; // Mappa riga -> percorso delle regioni

        lines.forEach((lineText, index) => {
            const trimmed = lineText.trim();
            if (trimmed.startsWith('#region')) {
                const regionName = trimmed.replace('#region', '').trim();
                regions.push(regionName);
            } else if (trimmed.startsWith('#endregion')) {
                regions.pop();
            }
            // Salva il percorso corrente nella mappa
            lineToRegionMap[index] = regions.join(' > ');
        });

        // Memorizza la mappa nel cache
        regionCache[document.uri.toString()] = lineToRegionMap;
    }
}

// Aggiornamento cache per le sole righe modificate
export async function updateRegionCacheForChanges(document: vscode.TextDocument, changes: vscode.TextDocumentContentChangeEvent[]) {
    if (alFileMgr.isALObjectDocument(document)) {
        const uri = document.uri.toString();
        const lineToRegionMap = regionCache[uri] || [];
        const regions: string[] = [];

        changes.forEach(change => {
            const startLine = change.range.start.line;
            const endLine = change.range.end.line;

            for (let i = startLine; i <= endLine; i++) {
                const lineText = document.lineAt(i).text.trim();

                if (lineText.startsWith('#region')) {
                    const regionName = lineText.replace('#region', '').trim();
                    regions.push(regionName);
                } else if (lineText.startsWith('#endregion')) {
                    regions.pop();
                }

                lineToRegionMap[i] = regions.join(' > ');
            }
        });

        regionCache[uri] = lineToRegionMap;
    }
}

// Ricerca percorso tramite cache
export async function getRegionPathFromCache(document: vscode.TextDocument, line: number, rebuildCache: boolean): Promise<string> {
    if (alFileMgr.isALObjectDocument(document)) {
        if ((!regionCache[document.uri.toString()]) || (rebuildCache)) {
            updateDocumentRegionCache(document);
        }

        const regions = regionCache[document.uri.toString()];
        return regions[line] || ''; 
    }
}
