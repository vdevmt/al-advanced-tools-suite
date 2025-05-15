import * as vscode from 'vscode';
import * as alFileMgr from '../alObject/alObjectFileMgr';
import * as appInfo from '../tools/appInfo';
import { ALObject } from './alObject';
import * as typeHelper from '../typeHelper';

type ObjectRange = { from: number; to: number; count: number };

export async function exportObjectsAssignmentDetailsAsCSV() {
    const ranges = await findObjectIDRangesInWorkspace();

    const csvLines: string[] = ['Object Type,From ID,To ID,Count'];

    for (const [objectType, objectRanges] of ranges.entries()) {
        for (const range of objectRanges) {
            csvLines.push(`${objectType},${range.from},${range.to},${range.count}`);
        }
    }

    const csvContent = csvLines.join('\n');

    // Crea un file virtuale in un editor
    const newFile = await vscode.workspace.openTextDocument({
        content: csvContent,
        language: 'csv', // Specifica il linguaggio per evidenziazione della sintassi
    });

    // Mostra il documento all'utente
    await vscode.window.showTextDocument(newFile);
}

export async function viewALObjectsSummary() {
    // Estrai gli oggetti e ID dal workspace
    const ranges = await findObjectIDRangesInWorkspace();
    const objectsCount = countObjectsByType(ranges);

    // Crea il contenuto HTML della tabella
    const htmlContent = createObjectsSummaryWebView(appInfo.appName(), objectsCount, ranges);

    // Crea una WebView Panel
    const panel = vscode.window.createWebviewPanel(
        'ats.objectRanges', // Identificatore del tipo di webview
        `${appInfo.appName()}`, // Titolo della webview
        vscode.ViewColumn.One, // Colonna in cui mostrare la webview
        {
            enableScripts: true,
            retainContextWhenHidden: true,
        }
    );

    // Imposta il contenuto HTML della WebView
    panel.webview.html = htmlContent;
}


async function findObjectIDRangesInWorkspace(): Promise<Map<string, ObjectRange[]>> {
    const objectRanges = new Map<string, number[]>();

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: 'AL Object analysis in progress..',
            cancellable: false,
        },
        async (progress) => {
            // Trova tutti i file AL nel workspace corrente
            const files = await vscode.workspace.findFiles('**/*.al');
            let processedFiles = 0;

            for (const file of files) {
                if (file) {
                    const document = await vscode.workspace.openTextDocument(file);
                    if (alFileMgr.isALObjectDocument(document)) {
                        const alObject: ALObject = new ALObject(document, false);
                        const objectType = alObject.objectType;
                        const objectId = parseInt(alObject.objectId, 10);

                        if (isNaN(objectId)) {
                            console.warn(`Invalid object ID in file: ${file.fsPath}`);
                            continue;
                        }

                        if (!objectRanges.has(objectType)) {
                            objectRanges.set(objectType, []);
                        }

                        const ids = objectRanges.get(objectType);
                        if (ids && !ids.includes(objectId)) {
                            ids.push(objectId);
                        }
                    }

                    processedFiles++;
                    progress.report({
                        message: `Processed ${processedFiles} of ${files.length} files`,
                        increment: (100 / files.length),
                    });
                }
            }
        }
    );

    // Calcola i range
    return calculateObjectIDRanges(objectRanges);
}

function calculateObjectIDRanges(objectRanges: Map<string, number[]>): Map<string, ObjectRange[]> {
    const ranges = new Map<string, ObjectRange[]>();

    for (const [objectType, ids] of objectRanges.entries()) {
        // Rimuove duplicati e ordina
        const uniqueIds = Array.from(new Set(ids));
        uniqueIds.sort((a, b) => a - b);

        const currentRanges: ObjectRange[] = [];
        let start = uniqueIds[0];
        let end = uniqueIds[0];
        let count = 1;

        for (let i = 1; i < uniqueIds.length; i++) {
            if (uniqueIds[i] === end + 1) {
                // ID consecutivo
                end = uniqueIds[i];
                count++;
            } else {
                // Aggiungi range
                currentRanges.push({ from: start, to: end, count });
                start = uniqueIds[i];
                end = uniqueIds[i];
                count = 1;
            }
        }

        // Aggiungi l'ultimo range
        currentRanges.push({ from: start, to: end, count });
        ranges.set(objectType, currentRanges);
    }

    // Ordina il map per Tipo oggetto e From ID
    const sortedRangesArray = Array.from(ranges.entries()).sort(([typeA, rangesA], [typeB, rangesB]) => {
        if (getObjectTypeSortingKey(typeA) < getObjectTypeSortingKey(typeB)) return -1;
        if (getObjectTypeSortingKey(typeA) > getObjectTypeSortingKey(typeB)) return 1;

        // Se il tipo è lo stesso, ordina per From ID
        const minA = Math.min(...rangesA.map((range) => range.from));
        const minB = Math.min(...rangesB.map((range) => range.from));
        return minA - minB;
    });

    // Ricrea il Map ordinato
    return new Map(sortedRangesArray);
}

function getObjectTypeSortingKey(objectType: string): Number {
    return typeHelper.getObjectTypeSortingKey(objectType);
}

function countObjectsByType(objectRanges: Map<string, ObjectRange[]>): Map<string, number> {
    const objectsCount = new Map<string, number>();

    for (const [objectType, ranges] of objectRanges.entries()) {
        // Calcola il numero totale di oggetti per ogni tipo
        const totalObjects = ranges.reduce((count, range) => count + range.count, 0);
        objectsCount.set(objectType, totalObjects);
    }

    return objectsCount;
}

function createObjectsSummaryWebView(
    title: string,
    objectsCount: Map<string, number>,
    objectRanges: Map<string, ObjectRange[]>
): string {
    // Preparazione del contenuto da copiare
    const objectsCountLines: string[] = ['Object Type\tCount'];
    let totalCount = 0;
    for (const [objectType, count] of objectsCount.entries()) {
        objectsCountLines.push(`${objectType}\t${count}`);
        totalCount += count;
    }
    objectsCountLines.push(`TOTAL\t${totalCount}`);
    const objectsCountContent = objectsCountLines.join('\n');

    const objectRangesLines: string[] = ['Object Type\tFrom ID\tTo ID\tCount'];
    for (const [objectType, ranges] of objectRanges.entries()) {
        for (const range of ranges) {
            objectRangesLines.push(`${objectType}\t${range.from}\t${range.to}\t${range.count}`);
        }
    }
    const objectRangesContent = objectRangesLines.join('\n');

    const bootstrapCDN = `
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    `;

    let html = `
        <html>
        <head>
            ${bootstrapCDN}
            <style>
                body {
                    padding: 15px;
                }
                table {
                    width: 100%;
                    table-layout: fixed;
                    border-collapse: collapse;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .col-left {
                    text-align: left;
                }
                .col-right {
                    text-align: right;
                }
                .copy-button {
                    margin-bottom: 15px;
                }
                .btn-copied {
                    background-color: #28a745 !important;
                    color: white !important;
                }
                .table-container {
                    overflow-x: auto;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>${title}</h1>
                
                <h3>Objects Count</h3>
                <div class="d-flex justify-content-end mb-3">
                    <button id="copyCountButton" class="btn btn-primary copy-button">Copy</button>
                </div>
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th class="col-left">Object Type</th>
                            <th class="col-right">Count</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    for (const [objectType, count] of objectsCount.entries()) {
        html += `
            <tr>
                <td class="col-left">${objectType}</td>
                <td class="col-right">${count}</td>
            </tr>
        `;
    }

    // Aggiungi riga totale
    html += `
            <tr>
                <td class="col-left"><strong>TOTAL</strong></td>
                <td class="col-right"><strong>${totalCount}</strong></td>
            </tr>
        `;

    html += `
                    </tbody>
                </table>

                <h3>Object Ranges</h3>
                <div class="d-flex justify-content-end mb-3">
                    <button id="copyRangesButton" class="btn btn-primary copy-button">Copy</button>
                </div>
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th class="col-left">Object Type</th>
                            <th class="col-right">From ID</th>
                            <th class="col-right">To ID</th>
                            <th class="col-right">Count</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    for (const [objectType, ranges] of objectRanges.entries()) {
        for (const range of ranges) {
            html += `
                <tr>
                    <td class="col-left">${objectType}</td>
                    <td class="col-right">${range.from}</td>
                    <td class="col-right">${range.to}</td>
                    <td class="col-right">${range.count}</td>
                </tr>
            `;
        }
    }

    html += `
                    </tbody>
                </table>
            </div>

            <script>
                // Copy to clipboard functionality
                function copyToClipboard(buttonId, content) {
                    navigator.clipboard.writeText(content).then(() => {
                        const button = document.getElementById(buttonId);
                        button.textContent = 'Copied';
                        button.classList.add('btn-copied');
                        setTimeout(() => {
                            button.textContent = 'Copy';
                            button.classList.remove('btn-copied');
                        }, 2000)
                    }).catch(err => {
                        alert('Failed to copy content.');
                    });
                }

                document.getElementById('copyCountButton').addEventListener('click', () => {
                    copyToClipboard('copyCountButton', \`${objectsCountContent}\`);
                });

                document.getElementById('copyRangesButton').addEventListener('click', () => {
                    copyToClipboard('copyRangesButton', \`${objectRangesContent}\`);
                });
            </script>
        </body>
        </html>
    `;

    return html;
}

function createObjectsSummaryWebView_OLD(title: string, objectsCount: Map<string, number>, objectRanges: Map<string, ObjectRange[]>): string {

    // Preparazione testo da copiare
    const lines: string[] = [title];
    lines.push('Object Type\tFrom ID\tTo ID\tCount');
    for (const [objectType, ranges] of objectRanges.entries()) {
        for (const range of ranges) {
            lines.push(`${objectType}\t${range.from}\t${range.to}\t${range.count}`);
        }
    }
    const formattedContent = lines.join('\n');

    const bootstrapCDN = `
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    `;

    let html = `
        <html>
        <head>
            ${bootstrapCDN}
            <style>
                body {
                    padding: 15px;
                }
                table {
                    width: 100%;
                    table-layout: fixed;
                    border-collapse: collapse;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                }
                th {
                    background-color: #f2f2f2;
                    font-weight: bold;
                }
                .col-left {
                    text-align: left;
                }
                .col-right {
                    text-align: right;
                }
                .copy-button {
                    margin-bottom: 15px;
                }
                .table-container {
                    overflow-x: auto;
                }
            </style>            
        </head>
        <body>
            <div class="container">
                <h2>${title}</h2>
                <div class="d-flex justify-content-end mb-3">
                    <button id="copyButton" class="btn btn-primary copy-button">Copy</button>
                </div>
                <table class="table-container">
                    <thead>
                        <tr>
                            <th class="col-left">Object Type</th>
                            <th class="col-right">From ID</th>
                            <th class="col-right">To ID</th>
                            <th class="col-right">Count</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    for (const [objectType, ranges] of objectRanges.entries()) {
        for (const range of ranges) {
            html += `
                <tr>
                    <td class="col-left">${objectType}</td>
                    <td class="col-right">${range.from}</td>
                    <td class="col-right">${range.to}</td>
                    <td class="col-right">${range.count}</td>
                </tr>
            `;
        }
    }

    html += `
                    </tbody>
                </table>
            </div>           

            <script>
                // Copy to clipboard functionality
                document.getElementById('copyButton').addEventListener('click', () => {
                    navigator.clipboard.writeText(\`${formattedContent}\`).then(() => {
                        alert('CSV content copied to clipboard!');
                    }).catch(err => {
                        alert('Failed to copy content to clipboard.');
                    });
                });
            </script>                  
        </body>
        </html>
    `;

    return html;
}


