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
    quickPick.matchOnDescription = enableSearchOnDescription;
    quickPick.matchOnDetail = enableSearchOnDetails;
    quickPick.value = initialValue;

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
        }
    });

    const onHide = quickPick.onDidHide(() => {
        quickPick.dispose();
        onAccept.dispose();
        onBtn.dispose();
        onHide.dispose();
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
