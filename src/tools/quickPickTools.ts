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
    groupValues: boolean,
    enableFilterByGroup: boolean
) {
    // Elenco gruppi
    let itemGroups: ReturnType<typeof getGroupsList> = [];

    //Stato filtro per groupID (se abilitato)
    let activeGroupId: number | undefined;
    let isGroupMenu = false;

    // Pulsanti per gestione filtro per group
    const BTN_FILTER: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('filter'),
        tooltip: 'Filter by type'
    };

    const BTN_CLEAR: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Clear filters'
    };

    // Applica filtro corrente (activeGroupId) + ricerca corrente
    const getFilteredSource = (value: string) => {
        const base = activeGroupId == null
            ? allItems
            : allItems.filter(i => i.groupID === activeGroupId);
        return updateItems(base, value, enableSearchOnDescription, enableSearchOnDetails, groupValues, false);
    };

    // Aggiorna i pulsanti in base allo stato del filtro
    const refreshButtons = () => {
        if (!enableFilterByGroup) {return;}
        quickPick.buttons = activeGroupId == null ? [BTN_FILTER] : [BTN_FILTER, BTN_CLEAR];
        // (opzionale) feedback nel titolo
        quickPick.title = activeGroupId == null
            ? title
            : `${title} — Filter: ${itemGroups.find(g => g.groupID === activeGroupId)?.groupName ?? activeGroupId}`;
    };


    const quickPick = vscode.window.createQuickPick<atsQuickPickItem>();

    quickPick.title = title;
    quickPick.placeholder = placeholder;
    quickPick.matchOnDescription = enableSearchOnDescription;
    quickPick.matchOnDetail = enableSearchOnDetails;
    quickPick.value = initialValue;
    quickPick.items = updateItems(allItems, initialValue, enableSearchOnDescription, enableSearchOnDetails, groupValues, false);
    quickPick.ignoreFocusOut = true;

    if (enableFilterByGroup) {
        // Prepara l’elenco dei gruppi e mostra il pulsante di filtro
        itemGroups = getGroupsList(allItems);

        // Se non ci sono gruppi o ce n'è solo uno, disattiva il filtro
        if (!itemGroups || itemGroups.length <= 1) {
            enableFilterByGroup = false;
        } else {
            // Altrimenti mostra il pulsante "Filter"
            quickPick.buttons = [BTN_FILTER];
        }
    }

    // ChangeValue: esegue la ricerca
    let debounceHandle: NodeJS.Timeout | undefined;

    const onDidChangeValue = quickPick.onDidChangeValue((value) => {
        if (debounceHandle) { clearTimeout(debounceHandle); }
        quickPick.busy = true;
        debounceHandle = setTimeout(() => {
            if (!isGroupMenu) {
                // solo nella lista principale
                quickPick.items = getFilteredSource(value);
            } else {
                // opzionale: permetti filtro sul menu gruppi
                const q = value.toLowerCase().trim();
                const base = buildGroupItems();
                quickPick.items = q ? base.filter(x => x.label.toLowerCase().includes(q)) : base;
            }
            quickPick.busy = false;
        }, DEBOUNCE_MS);
    });

    // Accept: esegue il comando dell'item
    const onAccept = quickPick.onDidAccept(async () => {
        if (isGroupMenu) {return;}

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

    // Gestione dei pulsanti di filtro della title bar (filter / clear)
    const buildGroupItems = (): atsQuickPickItem[] => [
        { label: 'All types', description: 'Show all items', groupID: undefined },
        ...itemGroups.map(g => ({
            label: g.groupName ?? String(g.groupID),
            description: `${g.count} item(s)`,
            groupID: g.groupID
        }))
    ];

    const onTitleBtn = enableFilterByGroup
        ? quickPick.onDidTriggerButton(async (btn) => {
            if (btn === BTN_FILTER) {
                // Entra in modalità "selezione gruppo" riusando lo stesso QuickPick
                isGroupMenu = true; // [NUOVO]
                quickPick.busy = true;

                // Salva/aggiorna UI del menu gruppi
                const prevPlaceholder = quickPick.placeholder;
                quickPick.placeholder = 'Filter by group/type (Enter to apply)';
                quickPick.title = `${title} — Choose group/type`;
                quickPick.buttons = [BTN_CLEAR]; // mentre scegli un gruppo, mostra solo "clear"

                // Mostra i gruppi come items del quickPick stesso
                quickPick.items = buildGroupItems();

                // Pre-seleziona il gruppo coerente con il filtro attivo (se presente)
                const idx = buildGroupItems().findIndex(it => it.groupID === activeGroupId);
                if (idx >= 0) {
                    // @ts-ignore: activeItems accetta QuickPickItem
                    quickPick.activeItems = [quickPick.items[idx]];
                } else {
                    // @ts-ignore
                    quickPick.activeItems = [quickPick.items[0]]; // "All types"
                }

                quickPick.busy = false;

                // [NUOVO] Intercetta l'accept in "group mode" SENZA chiudere il QuickPick
                const acceptOnce = quickPick.onDidAccept(() => {
                    if (!isGroupMenu) {return;} // ignora se nel frattempo è uscita dalla group mode
                    const sel = quickPick.selectedItems[0] as atsQuickPickItem | undefined;
                    activeGroupId = sel?.groupID;

                    // Torna alla lista oggetti filtrata
                    isGroupMenu = false;
                    quickPick.title = title;
                    quickPick.placeholder = prevPlaceholder;
                    refreshButtons(); // ripristina pulsanti (Filter / Clear in base allo stato)
                    quickPick.items = getFilteredSource(quickPick.value); // mantiene la query corrente
                    acceptOnce.dispose(); // cleanup handler one-shot
                });

            } else if (btn === BTN_CLEAR) {
                // Rimuovi filtro e (se eri nel menu gruppi) esci e torna alla lista
                activeGroupId = undefined;
                isGroupMenu = false; // [NUOVO]
                quickPick.title = title;
                refreshButtons();
                quickPick.items = getFilteredSource(quickPick.value);
            }
        })
        : { dispose() {/* no-op when disabled */ } };

    const onHide = quickPick.onDidHide(() => {
        onDidChangeValue.dispose();
        onAccept.dispose();
        onBtn.dispose();
        onHide.dispose();
        onTitleBtn.dispose();
        if (debounceHandle) { clearTimeout(debounceHandle); }
        quickPick.dispose();
    });

    // Aggiorna stato pulsanti all'avvio
    refreshButtons();

    // Apre la Quick Pick
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



