import * as vscode from 'vscode';
import { ALObject } from '../alObject/alObject';
import * as ALObjectExplorer from '../alObject/alObjectExplorer';
import * as alFileMgr from '../alObject/alObjectFileMgr';

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
    additionalItem?: boolean;
}

//#region Quick Pick Functions
export async function showQuickPick(
    allItems: atsQuickPickItem[],
    title: string,
    placeholder: string,
    enableSearchOnDescription: boolean,
    enableSearchOnDetails: boolean,
    initialValue: string,
    groupValues: boolean,
    enableFilterByGroup: boolean,
    goBackCommand: string
) {
    type ButtonId = 'filter' | 'clear' | 'goback';
    type Btn = vscode.QuickInputButton & { id: ButtonId };

    const BTN_FILTER: Btn = { id: 'filter', iconPath: new vscode.ThemeIcon('filter'), tooltip: 'Filter by type' };
    const BTN_CLEAR: Btn = { id: 'clear', iconPath: new vscode.ThemeIcon('close'), tooltip: 'Clear filters' };
    const BTN_GOBACK: Btn = { id: 'goback', iconPath: new vscode.ThemeIcon('home'), tooltip: 'Go back' };

    const qp = vscode.window.createQuickPick<atsQuickPickItem>();
    const disposables: vscode.Disposable[] = [];
    let isGroupMenu = false;
    let activeGroupId: number | undefined;

    // ——— helpers ———
    const getFilteredSource = (value: string) => {
        const base = activeGroupId == null ? allItems : allItems.filter(i => i.groupID === activeGroupId);
        return updateItems(base, value, enableSearchOnDescription, enableSearchOnDetails, groupValues, false);
    };

    const originalTitle = title;
    const originalPlaceholder = placeholder;

    let itemGroups: ReturnType<typeof getGroupsList> = [];
    let groupMenuItems: atsQuickPickItem[] = [];

    if (enableFilterByGroup) {
        itemGroups = getGroupsList(allItems);
        if (!itemGroups || itemGroups.length <= 1) {
            enableFilterByGroup = false;
        } else {
            // pre-build static group menu once
            groupMenuItems = [
                { label: 'All types', description: 'Show all items', groupID: undefined },
                ...itemGroups.map(g => ({
                    label: g.groupName ?? String(g.groupID),
                    description: `${g.count} item(s)`,
                    groupID: g.groupID
                }))
            ];
        }
    }

    const refreshButtons = () => {
        const btns: vscode.QuickInputButton[] = [];
        if (goBackCommand) { btns.push(BTN_GOBACK); }
        if (enableFilterByGroup) {
            btns.push(BTN_FILTER);
            qp.title = originalTitle;
            if (activeGroupId != null) {
                btns.push(BTN_CLEAR);
                const label = itemGroups.find(g => g.groupID === activeGroupId)?.groupName ?? String(activeGroupId);
                qp.title = `${originalTitle} — Filter: ${label}`;
            }
        }
        qp.buttons = btns;
    };

    const showMainList = (keepValue = true) => {
        isGroupMenu = false;
        qp.placeholder = originalPlaceholder;
        qp.title = originalTitle;
        refreshButtons();
        qp.items = getFilteredSource(keepValue ? qp.value : '');
    };

    const showGroupMenu = () => {
        isGroupMenu = true;
        qp.placeholder = 'Filter by group/type (Enter to apply)';
        qp.title = `${originalTitle} — Choose group/type`;
        qp.buttons = goBackCommand ? [BTN_GOBACK, BTN_CLEAR] : [BTN_CLEAR];
        qp.items = groupMenuItems;

        // pre-select current
        const idx = groupMenuItems.findIndex(it => it.groupID === activeGroupId);
        qp.activeItems = [qp.items[Math.max(0, idx)]];
    };

    // ——— quick pick setup ———
    qp.title = title;
    qp.placeholder = placeholder;
    qp.matchOnDescription = enableSearchOnDescription;
    qp.matchOnDetail = enableSearchOnDetails;
    qp.value = initialValue;
    qp.items = updateItems(allItems, initialValue, enableSearchOnDescription, enableSearchOnDetails, groupValues, false);
    qp.ignoreFocusOut = true;
    refreshButtons();

    if (enableFilterByGroup) {
        qp.buttons = goBackCommand ? [BTN_GOBACK, BTN_FILTER] : [BTN_FILTER];
    }

    // ——— debounced search ———
    let debounceHandle: NodeJS.Timeout | undefined;
    const DEBOUNCE_MS = 120; // usa il tuo valore se già definito altrove

    disposables.push(
        qp.onDidChangeValue((value) => {
            if (debounceHandle) { clearTimeout(debounceHandle); }
            qp.busy = true;
            debounceHandle = setTimeout(() => {
                try {
                    if (isGroupMenu) {
                        const q = value.toLowerCase().trim();
                        qp.items = q ? groupMenuItems.filter(x => x.label.toLowerCase().includes(q)) : groupMenuItems;
                    } else {
                        qp.items = getFilteredSource(value);
                    }
                } finally {
                    qp.busy = false;
                }
            }, DEBOUNCE_MS);
        })
    );

    // ——— accept ———
    disposables.push(
        qp.onDidAccept(async () => {
            if (isGroupMenu) {
                // apply group filter
                const sel = qp.selectedItems[0] as atsQuickPickItem | undefined;
                activeGroupId = sel?.groupID;
                showMainList(true);
                return;
            }
            const selectedItem = qp.selectedItems[0] as atsQuickPickItem | undefined;
            if (!selectedItem) { return; }
            await executeQuickPickItemCommand(selectedItem);
            qp.hide();
        })
    );

    // ——— item buttons ———
    disposables.push(
        qp.onDidTriggerItemButton(async (selected) => {
            const selectedItem = selected.item as atsQuickPickItem | undefined;
            if (!selectedItem) { return; }
            qp.hide();

            // preferisci id stabile sul bottone se disponibile; fallback a tooltip per retrocompatibilità
            const buttonAny = selected.button as vscode.QuickInputButton & { id?: string };
            const btnKey = buttonAny?.id ?? selected.button.tooltip;

            switch (btnKey) {
                case btnCmdOpenToSide: {
                    switch (selectedItem.command) {
                        case cmdGoToLine: selectedItem.command = cmdGoToLineOnSide; break;
                        case cmdOpenFile: selectedItem.command = cmdOpenFileOnSide; break;
                    }
                    break;
                }
                case btnCmdExecObjectExplorer:
                    selectedItem.command = cmdExecALObjectExplorer;
                    break;
                case btnCmdCopyAsText: {
                    // mapping compatto
                    const map: Record<string, string | undefined> = {
                        'ats.showAllFields': 'ats.copyFieldsAsText',
                        'ats.showAllTableKeys': 'ats.copyTableKeysAsText',
                        'ats.showAllTableFieldGroups': 'ats.copyTableFieldGroupsAsText',
                        'ats.showAllTriggers': 'ats.copyTriggersAsText',
                        'ats.showAllProcedures': 'ats.copyProceduresAsText',
                        'ats.showAllDataItems': 'ats.copyDataItemsAsText',
                        'ats.showAllActions': 'ats.copyActionsAsText',
                        'ats.showAllRegions': 'ats.copyRegionsAsText',
                        'ats.showAllGlobalVariables': 'ats.copyGlobalVariablesAsText',
                    };
                    selectedItem.command = map[selectedItem.command ?? ''] ?? selectedItem.command;
                    break;
                }
            }
            await executeQuickPickItemCommand(selectedItem);
        })
    );

    // ——— title bar buttons ———
    if (enableFilterByGroup || goBackCommand) {
        disposables.push(
            qp.onDidTriggerButton(async (btn) => {
                const id = (btn as Btn).id as ButtonId | undefined;
                if (id === 'filter') {
                    qp.busy = true;
                    try {
                        showGroupMenu();
                    } finally {
                        qp.busy = false;
                    }
                } else if (id === 'clear') {
                    activeGroupId = undefined;
                    showMainList(true);
                } else if (id === 'goback') {
                    qp.hide();
                    qp.dispose();
                    await vscode.commands.executeCommand(goBackCommand);
                }
            })
        );
    }

    // ——— lifecycle ———
    disposables.push(
        qp.onDidHide(() => {
            if (debounceHandle) { clearTimeout(debounceHandle); }
            disposables.forEach(d => { try { d.dispose(); } catch { /* noop */ } });
            qp.dispose();
        })
    );

    qp.show();
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
                        const alObject = alFileMgr.parseALObject(document);
                        if (alObject) {
                            ALObjectExplorer.execALObjectExplorer(alObject);
                        }
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

function getGroupsList(allItems: atsQuickPickItem[]) {
    const groups = new Map<number, { groupName: string; count: number }>();

    for (const item of allItems) {
        // Escludi separatori
        if ((item as vscode.QuickPickItem).kind === vscode.QuickPickItemKind.Separator) {
            continue;
        }

        const id = item.groupID ?? -1;
        const name = item.groupName ?? '(No group)';
        const entry = groups.get(id);

        if (entry) {
            entry.count++;
        } else {
            groups.set(id, { groupName: name, count: 1 });
        }
    }

    // Ordina per groupID e restituisci come array di oggetti
    return Array.from(groups.entries())
        .sort(([a], [b]) => a - b)
        .map(([groupID, info]) => ({
            groupID,
            groupName: info.groupName,
            count: info.count
        }));
}

//#endregion Items Search



