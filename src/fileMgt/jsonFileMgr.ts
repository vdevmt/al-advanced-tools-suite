import * as vscode from 'vscode';
import stripJsonComments = require("strip-json-comments");

function normalizeJsonData(jsonData: string): string {
    try {
        // Eliminazione commenti presenti nel file json
        let normalizedJsonData = stripJsonComments(jsonData);

        // Aggiunge virgolette a numeri e boolean
        normalizedJsonData = normalizedJsonData.replace(/(\s*:\s*)(\b\d+\b|\btrue\b|\bfalse\b)(\s*[,\n\r}])/g, '$1"$2"$3');

        // Eliminazione virgole non consentite prima di una parentesi di chiusura '}' o ']'   
        normalizedJsonData = normalizedJsonData.replace(/,\s*(\}|\])\s*/g, '$1');

        // Eliminazione righe vuote
        normalizedJsonData = normalizedJsonData.replace(/^\s*[\r\n]/gm, '');

        return normalizedJsonData;
    } catch (e) {
        vscode.window.showErrorMessage('Error parsing launch.json');
    }
}
