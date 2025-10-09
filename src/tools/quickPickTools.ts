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

const DEBOUNCE_MS = 200;

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
    quickPick.matchOnDescription = enableSearchOnDescription;
    quickPick.matchOnDetail = enableSearchOnDetails;
    quickPick.value = initialValue;
    quickPick.items = updateItems(allItems, initialValue, enableSearchOnDescription, enableSearchOnDetails, groupValues, false);
    quickPick.ignoreFocusOut = true;

    // ChangeValue: esegue la ricerca
    let debounceHandle: NodeJS.Timeout | undefined;

    const onDidChangeValue = quickPick.onDidChangeValue((value) => {
        if (debounceHandle) { clearTimeout(debounceHandle); }
        quickPick.busy = true;
        debounceHandle = setTimeout(() => {
            quickPick.items = updateItems(allItems, value, enableSearchOnDescription, enableSearchOnDetails, groupValues, false);
            quickPick.busy = false;
        }, DEBOUNCE_MS);
    });

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
            // Prefer a stable id on the button if provided; fallback to tooltip text
            const buttonAny = selected.button as vscode.QuickInputButton & { id?: string };
            const btnKey = buttonAny?.id ?? selected.button.tooltip;
            switch (btnKey) {
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
        }
    });

    const onHide = quickPick.onDidHide(() => {
        onDidChangeValue.dispose();
        onAccept.dispose();
        onBtn.dispose();
        onHide.dispose();
        if (debounceHandle) { clearTimeout(debounceHandle); }
        quickPick.dispose();
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
                        const activeDocUri = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri : undefined;

                        if (selectedItem.documentUri && (selectedItem.documentUri !== activeDocUri)) {
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
                        let docUri = selectedItem.documentUri ? selectedItem.documentUri :
                            vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri :
                                undefined;

                        if (docUri) {
                            const position = new vscode.Position(lineNumber, 0);
                            await vscode.window.showTextDocument(docUri, {
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
                            await vscode.commands.executeCommand(selectedItem.command, ...selectedItem.commandArgs);
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

//#region Items Search
function normalizeText(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // rimuove accenti
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeRegex(lit: string): string {
    return lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildMultiTokenRegex(query: string, wholeWords = false): RegExp | null {
    const tokens = normalizeText(query).split(' ').filter(Boolean);
    if (tokens.length === 0) { return null; }

    const key = (wholeWords ? 'w:' : 'c:') + tokens.join(' ');

    const parts = tokens.map(t => {
        const tok = escapeRegex(t);
        return wholeWords ? `(?=.*\\b${tok}\\b)` : `(?=.*${tok})`;
    });
    const rx = new RegExp(parts.join('') + '.*', 'i');
    return rx;
}

function getNormalizedHay(
    it: atsQuickPickItem,
    onDesc: boolean,
    onDetail: boolean
): string {
    const hayRaw = onDesc && onDetail ? `${it.label ?? ''} ${it.description ?? ''} ${it.detail ?? ''}` :
        onDesc ? `${it.label ?? ''} ${it.description ?? ''}` :
            onDetail ? `${it.label ?? ''} ${it.detail ?? ''}` :
                `${it.label ?? ''}`;
    return normalizeText(hayRaw);
}

function updateItems(
    allItems: atsQuickPickItem[],
    query: string,
    enableSearchOnDescription: boolean,
    enableSearchOnDetails: boolean,
    groupValues?: boolean,
    wholeWords = false,
): atsQuickPickItem[] {
    const trimmed = query.trim();
    if (!trimmed) {
        // query vuota -> restituisci tutti (eventuale raggruppo)
        if (!groupValues) { return allItems.map(i => ({ ...i, alwaysShow: true })); }
        return groupByWithSeparators(allItems);
    }

    if (!trimmed.includes(" ")) {
        // query senza spazi -> restituisci tutti (eventuale raggruppo). La ricerca verrà effettuata in modalità standard
        if (!groupValues) { return allItems.map(i => ({ ...i, alwaysShow: true })); }
        return groupByWithSeparators(allItems);
    }

    const rx = buildMultiTokenRegex(trimmed, wholeWords);
    if (!rx) {
        // query non valida (dopo normalizzazione) -> nessun elemento
        return [];
    }

    // Filtra elementi 
    const filtered = allItems.filter(it => rx.test(getNormalizedHay(it, enableSearchOnDescription, enableSearchOnDetails)));

    if (!groupValues) {
        return filtered.map(i => ({ ...i, alwaysShow: true }));
    }
    return groupByWithSeparators(filtered);
}

// Raggruppa per groupName + separatori, ordinando per groupID, poi alfabetico
function groupByWithSeparators(items: atsQuickPickItem[]): atsQuickPickItem[] {
    const byGroup = new Map<string, atsQuickPickItem[]>();
    for (const it of items) {
        const k = it.groupName ?? 'Other';
        if (!byGroup.has(k)) { byGroup.set(k, []); }
        byGroup.get(k)!.push({ ...it, alwaysShow: true });
    }
    // ordina in-group per sortKey
    for (const arr of byGroup.values()) { arr.sort((a, b) => (a.sortKey ?? '').localeCompare(b.sortKey ?? '')); }

    // ordina gruppi per groupID poi nome
    const groups = Array.from(byGroup.entries()).sort((a, b) => {
        const idA = a[1][0]?.groupID ?? Number.MAX_SAFE_INTEGER;
        const idB = b[1][0]?.groupID ?? Number.MAX_SAFE_INTEGER;
        if (idA !== idB) { return idA - idB; }
        return a[0].localeCompare(b[0]);
    });

    const out: atsQuickPickItem[] = [];
    for (const [name, arr] of groups) {
        out.push({ label: name, kind: vscode.QuickPickItemKind.Separator, alwaysShow: true } as atsQuickPickItem);
        out.push(...arr);
    }
    return out;
}

//#endregion Items Search



