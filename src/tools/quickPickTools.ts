import * as vscode from 'vscode';
import { ALObject } from '../alObject/alObject';
import * as ALObjectExplorer from '../alObject/alObjectExplorer';

export const cmdGoToLine = 'GoToLine';
export const cmdGoToLineOnSide = 'GoToLineOnSide';
export const cmdOpenFile = 'OpenFile';
export const cmdOpenFileOnSide = 'OpenFileOnSide';
export const cmdExecALObjectExplorer = 'ALObjectExplorer';

export const btnCmdCopyAsText = 'Copy as text';
export const btnCmdExecObjectExplorer = 'AL Object Explorer';
export const btnCmdOpenToSide = 'Open to the Side';

export interface atsQuickPickItem extends vscode.QuickPickItem {
    iconName?: string;
    itemStartLine?: number;
    itemEndLine?: number;
    groupID?: number;
    groupName?: string;
    sortIndex?: number;
    sortKey?: string;
    level?: number;
    documentUri?: vscode.Uri;
    command?: string;
    commandArgs?: any;
    alwaysShow?: boolean;
}

//#region Quick Pick Functions
export async function showQuickPick(
    allItems: atsQuickPickItem[],
    title: string,
    placeholder: string,
    enableSearchOnDescription: boolean,
    enableSearchOnDetails: boolean,
    initialValue: string,
    groupValues?: boolean
) {
    const quickPick = vscode.window.createQuickPick<atsQuickPickItem>();

    quickPick.title = title;
    quickPick.placeholder = placeholder;

    // Modalità iniziale decisa dalla query iniziale
    const hasSpaces = initialValue.trim().includes(' ');

    // Se usiamo filtro nativo: abilita match su description/detail secondo i flag passati
    // Se usiamo filtro custom (multi-token): disabilita i match nativi
    quickPick.matchOnDescription = hasSpaces ? false : enableSearchOnDescription;
    quickPick.matchOnDetail = hasSpaces ? false : enableSearchOnDetails;
    quickPick.value = initialValue;

    // Primo popolamento lista
    if (hasSpaces) {
        // custom (multi-token)
        quickPick.items = buildItemsForQuery(allItems, initialValue, enableSearchOnDescription, enableSearchOnDetails, groupValues);
    } else {
        // nativo
        if (groupValues) {
            const groups = [...new Map(allItems.map(item =>
                [item['groupName'], { id: item.groupID, name: item.groupName }]
            )).values()].sort((a, b) => a.id - b.id);

            if (groups) {
                let groupedItems: atsQuickPickItem[] = [];
                groups.forEach(group => {
                    groupedItems.push({
                        label: group.name,
                        kind: vscode.QuickPickItemKind.Separator
                    } as atsQuickPickItem);
                    groupedItems.push(...allItems.filter(item => (item.groupName === group.name)));
                });
                quickPick.items = groupedItems;
            }
        } else {
            quickPick.items = allItems;
        }
    }

    // Toggle dinamico tra nativo (un token) e custom (multi-token)
    let debounce: NodeJS.Timeout | undefined;
    const onChange = quickPick.onDidChangeValue(value => {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
            const multi = value.trim().includes(' ');

            if (multi) {
                // CUSTOM multi-token
                quickPick.matchOnDescription = false;
                quickPick.matchOnDetail = false;
                quickPick.busy = true;
                quickPick.items = buildItemsForQuery(allItems, value, enableSearchOnDescription, enableSearchOnDetails, groupValues);
                quickPick.busy = false;
            } else {
                quickPick.matchOnDescription = enableSearchOnDescription;
                quickPick.matchOnDetail = enableSearchOnDetails;

                if (groupValues) {
                    const groups = [...new Map(allItems.map(item =>
                        [item['groupName'], { id: item.groupID, name: item.groupName }]
                    )).values()].sort((a, b) => a.id - b.id);

                    if (groups) {
                        let groupedItems: atsQuickPickItem[] = [];
                        groups.forEach(group => {
                            groupedItems.push({
                                label: group.name,
                                kind: vscode.QuickPickItemKind.Separator
                            } as atsQuickPickItem);
                            groupedItems.push(...allItems.filter(item => (item.groupName === group.name)));
                        });
                        quickPick.items = groupedItems;
                    }
                } else {
                    quickPick.items = allItems;
                }
            }
        }, 60);
    });

    const disposables: vscode.Disposable[] = [onChange];
    const cleanup = () => disposables.forEach(d => d.dispose());

    // Accept: esegue il comando dell'item
    const onAccept = quickPick.onDidAccept(async () => {
        const selectedItem = quickPick.selectedItems[0] as atsQuickPickItem;
        if (selectedItem) {
            await executeQuickPickItemCommand(selectedItem);
        }
        quickPick.hide();
    });

    // Click su bottone item
    const onBtn = quickPick.onDidTriggerItemButton(async (selected) => {
        const selectedItem = selected.item as atsQuickPickItem | undefined;
        quickPick.hide();

        if (selectedItem) {
            switch (selected.button.tooltip) {
                case btnCmdOpenToSide: {
                    switch (selectedItem.command) {
                        case cmdGoToLine: { selectedItem.command = cmdGoToLineOnSide; break; }
                        case cmdOpenFile: { selectedItem.command = cmdOpenFileOnSide; break; }
                    }
                    break;
                }
                case btnCmdExecObjectExplorer: { selectedItem.command = cmdExecALObjectExplorer; break; }
                case btnCmdCopyAsText: {
                    switch (selectedItem.command) {
                        case 'ats.showAllFields': selectedItem.command = 'ats.copyFieldsAsText'; break;
                        case 'ats.showAllTableKeys': selectedItem.command = 'ats.copyTableKeysAsText'; break;
                        case 'ats.showAllTableFieldGroups': selectedItem.command = 'ats.copyTableFieldGroupsAsText'; break;
                        case 'ats.showAllTriggers': selectedItem.command = 'ats.copyTriggersAsText'; break;
                        case 'ats.showAllProcedures': selectedItem.command = 'ats.copyProceduresAsText'; break;
                        case 'ats.showAllDataItems': selectedItem.command = 'ats.copyDataItemsAsText'; break;
                        case 'ats.showAllActions': selectedItem.command = 'ats.copyActionsAsText'; break;
                        case 'ats.showAllRegions': selectedItem.command = 'ats.copyRegionsAsText'; break;
                        case 'ats.showAllGlobalVariables': selectedItem.command = 'ats.copyGlobalVariablesAsText'; break;
                    }
                }
            }
            await executeQuickPickItemCommand(selectedItem);
            cleanup();
        }
    });

    const onHide = quickPick.onDidHide(() => {
        quickPick.dispose();
        onAccept.dispose();
        onBtn.dispose();
        onHide.dispose();
        cleanup();
    });

    quickPick.show();
}

async function executeQuickPickItemCommand(selectedItem: atsQuickPickItem) {
    if (selectedItem) {
        if (selectedItem.command) {
            switch (selectedItem.command) {
                case cmdGoToLine: {
                    let lineNumber: number = Number(selectedItem.commandArgs);
                    if (lineNumber >= 0) {
                        if (selectedItem.documentUri && (selectedItem.documentUri !== vscode.window.activeTextEditor.document.uri)) {
                            const position = new vscode.Position(lineNumber, 0);
                            await vscode.window.showTextDocument(selectedItem.documentUri, {
                                viewColumn: vscode.ViewColumn.Active,
                                preserveFocus: false,
                                selection: new vscode.Selection(position, position)
                            });
                        }
                        else {
                            const editor = vscode.window.activeTextEditor;
                            if (editor) {
                                const position = new vscode.Position(lineNumber, 0);
                                editor.selection = new vscode.Selection(position, position);
                                editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
                            }
                        }
                    }

                    break;
                }
                case cmdGoToLineOnSide: {
                    let lineNumber: number = Number(selectedItem.commandArgs);
                    if (lineNumber >= 0) {
                        let docUri = selectedItem.documentUri || vscode.window.activeTextEditor.document.uri;
                        if (docUri) {
                            const position = new vscode.Position(lineNumber, 0);
                            await vscode.window.showTextDocument(selectedItem.documentUri, {
                                viewColumn: vscode.ViewColumn.Beside,
                                preserveFocus: false,
                                selection: new vscode.Selection(position, position)
                            });
                        }
                    }

                    break;
                }

                case cmdOpenFile: {
                    if (selectedItem.commandArgs) {
                        vscode.window.showTextDocument(selectedItem.commandArgs);
                    }

                    break;
                }

                case cmdOpenFileOnSide: {
                    if (selectedItem.commandArgs) {
                        // Nuovo editor laterale 
                        const document = await vscode.workspace.openTextDocument(selectedItem.commandArgs);
                        vscode.window.showTextDocument(document, {
                            viewColumn: vscode.ViewColumn.Beside, // Split editor a destra
                            preserveFocus: false,
                            preview: false,
                        });
                    }

                    break;
                }

                case cmdExecALObjectExplorer: {
                    if (selectedItem.commandArgs) {
                        const document = await vscode.workspace.openTextDocument(selectedItem.commandArgs);
                        const alObject: ALObject = new ALObject(document, true);
                        ALObjectExplorer.execALObjectExplorer(alObject);
                    }

                    break;
                }

                default: {
                    if (selectedItem.command) {
                        if (Array.isArray(selectedItem.commandArgs)) {
                            vscode.commands.executeCommand(selectedItem.command, ...selectedItem.commandArgs);
                        } else {
                            await vscode.commands.executeCommand(selectedItem.command, selectedItem.commandArgs);
                        }
                    }

                    break;
                }
            }
        }
    }
}
//#endregion Quick Pick Functions

//#region Helpers di ricerca
function normalizeText(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // rimuove accenti
        .replace(/\s+/g, ' ')
        .trim();
}

// parole del testo (lettere/numeri/underscore)
function wordsOf(s: string): string[] {
    return normalizeText(s).split(/[^a-z0-9_]+/).filter(Boolean);
}

// acronimo: iniziali delle parole ("Sales Line Archive" -> "sla")
function acronymOf(s: string): string {
    return wordsOf(s).map(w => w[0]).join('');
}

// fuzzy subsequence: tutti i caratteri di pat compaiono in ordine in txt
function isFuzzySubsequence(txt: string, pat: string): boolean {
    let i = 0, j = 0;
    while (i < txt.length && j < pat.length) {
        if (txt[i] === pat[j]) j++;
        i++;
    }
    return j === pat.length;
}

/**
 * Match multi-token robusto:
 * - ogni token deve matchare (AND)
 * - match per parola: prefix o substring
 * - fallback fuzzy su testo intero e acronimo
 */
function multiTokenMatch(haystack: string, query: string): boolean {
    const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;

    const whole = normalizeText(haystack);
    const words = wordsOf(haystack);
    const acro = acronymOf(haystack);
    const wholeNoSpace = whole.replace(/\s+/g, '');

    return tokens.every(tok => {
        if (words.some(w => w.startsWith(tok))) return true;  // prefix parola
        if (words.some(w => w.includes(tok))) return true;   // substring parola
        if (isFuzzySubsequence(wholeNoSpace, tok)) return true;
        if (isFuzzySubsequence(acro, tok)) return true;
        return false;
    });
}

/** Costruisce items (flat oppure raggruppati con separatori) secondo query custom. */
function buildItemsForQuery(
    allItems: atsQuickPickItem[],
    query: string,
    enableSearchOnDescription: boolean,
    enableSearchOnDetails: boolean,
    groupValues: boolean | undefined
): atsQuickPickItem[] {
    const filtered = allItems.filter(it => {
        const hay = enableSearchOnDescription && enableSearchOnDetails ? `${it.label ?? ''} ${it.description ?? ''} ${it.detail ?? ''}` :
            enableSearchOnDescription ? `${it.label ?? ''} ${it.description ?? ''}` :
                enableSearchOnDetails ? `${it.label ?? ''} ${it.detail ?? ''}` :
                    `${it.label ?? ''}`;

        return multiTokenMatch(hay, query);
    });

    if (!groupValues) {
        return filtered.map(it => ({ ...it, alwaysShow: true }));
    }

    // Raggruppa per groupName e ordina per groupID poi alfabetico
    const byGroup = new Map<string, atsQuickPickItem[]>();
    for (const it of filtered) {
        const key = it.groupName ?? 'Other';
        if (!byGroup.has(key)) byGroup.set(key, []);
        byGroup.get(key)!.push(it);
    }
    // ordina in-group per sortKey se presente
    for (const arr of byGroup.values()) {
        arr.sort((a, b) => (a.sortKey ?? '').localeCompare(b.sortKey ?? ''));
    }
    const groups = Array.from(byGroup.entries()).sort((a, b) => {
        const idA = a[1][0]?.groupID ?? Number.MAX_SAFE_INTEGER;
        const idB = b[1][0]?.groupID ?? Number.MAX_SAFE_INTEGER;
        if (idA !== idB) return idA - idB;
        return a[0].localeCompare(b[0]);
    });

    const out: atsQuickPickItem[] = [];
    for (const [groupName, items] of groups) {
        if (items.length === 0) continue;
        out.push({
            label: groupName,
            kind: vscode.QuickPickItemKind.Separator,
            alwaysShow: true
        } as atsQuickPickItem);
        out.push(...items.map(it => ({ ...it, alwaysShow: true })));
    }
    return out;
}

//#endregion Helpers di ricerca
