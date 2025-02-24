import * as vscode from 'vscode';
import * as regExpr from '../regExpressions';
import * as alFileMgr from '../alObject/alObjectFileMgr';
import * as typeHelper from '../typeHelper';

import { ALObject } from '../alObject/alObject';

//#region AL Events Tools
export class EventIntegrationCodeActionProvider implements vscode.CodeActionProvider {
    static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.CodeAction[] | undefined {
        try {
            if (alFileMgr.isALObjectDocument(document)) {
                let alObject = new ALObject(document);
                if (alObject && alObject.objectName) {
                    let startPosition = findCodeActionsStartPosByCurrentLine(document, range.start.line);
                    if (startPosition > 0) {
                        const fullText = getFullEventDeclaration(document, startPosition);

                        const codeAction = new vscode.CodeAction(
                            'Copy as event subscriber (ATS)',
                            vscode.CodeActionKind.QuickFix
                        );

                        codeAction.command = {
                            command: 'ats.copyAsEventSubscriber',
                            title: 'Copy as Event Subscriber',
                            arguments: [alObject, fullText],
                        };

                        return [codeAction];
                    };
                }
            }
            return undefined;
        }
        catch {
            return undefined;
        }
    }
}

function findCodeActionsStartPosByCurrentLine(document: vscode.TextDocument, currentLine: number): number {
    let startPosition = -1;

    if (document && (currentLine > 0)) {
        if (alFileMgr.isALObjectDocument(document)) {
            let alObject = new ALObject(document);
            if (alObject && alObject.objectName) {
                let currentLineText = document.lineAt(currentLine).text.trim();

                if (alObject.isTable() || alObject.isTableExt()) {
                    if (regExpr.tableField.test(currentLineText)) {
                        startPosition = currentLine;
                    }
                }
                if (alObject.isPage() || alObject.isPageExt()) {
                    if (regExpr.pageField.test(currentLineText)) {
                        startPosition = currentLine;
                    }
                }

                if (startPosition < 0) {
                    if (regExpr.integrationEvent.test(currentLineText)) {
                        startPosition = currentLine;
                    }
                    else {
                        if (currentLine > 0) {
                            if (regExpr.procedure.test(currentLineText)) {
                                currentLineText = document.lineAt(currentLine - 1).text.trim();
                                if (regExpr.integrationEvent.test(currentLineText)) {
                                    startPosition = currentLine - 1;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return startPosition;
}

export function copySelectionAsEventSubscriber() {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    let eventStartPos = -1;

    const alObject = new ALObject(document);

    if (editor.selections) {
        editor.selections.forEach(selection => {
            if (eventStartPos < 0) {
                if (selection.start.line > 0) {
                    for (let i = selection.start.line; i <= selection.end.line; i++) {
                        let currentLineText = document.lineAt(i).text.trim();

                        switch (true) {
                            case (regExpr.integrationEvent.test(currentLineText)): {
                                eventStartPos = i;
                                break;
                            }

                            case (regExpr.tableField.test(currentLineText)): {
                                if (alObject.isTable() || alObject.isTableExt()) {
                                    eventStartPos = i;
                                    break;
                                }
                            }

                            case (regExpr.pageField.test(currentLineText)): {
                                if (alObject.isPage() || alObject.isPageExt()) {
                                    eventStartPos = i;
                                    break;
                                }
                            }
                        }

                        if (eventStartPos > 0) {
                            i = selection.end.line + 1;
                        }
                    }

                    if (eventStartPos < 0) {
                        if (selection.start.line === selection.end.line) {
                            if (alObject.isTable() || alObject.isTableExt()) {
                                eventStartPos = 0;
                            }
                        }
                    }
                }
            }
        });
    }

    if (eventStartPos < 0) {
        vscode.window.showErrorMessage('No event definitions found in the current selection');
        return;
    }

    if (eventStartPos > 0) {
        const fullText = getFullEventDeclaration(document, eventStartPos);
        copyAsEventSubscriber(alObject, fullText);
    }
    else {
        copyAsEventSubscriber(alObject, '');
    }
}

function getFullEventDeclaration(document: vscode.TextDocument, startLine: number): string {
    let blockText = document.lineAt(startLine).text;

    // Scendi verso il basso per trovare le righe successive
    for (let i = startLine + 1; i < document.lineCount; i++) {
        const line = document.lineAt(i).text;
        blockText += '\n' + line;

        if (line.trim().endsWith(')') || line.trim() === 'begin' || line.trim() === '{') {
            break; // Fine del blocco
        }
    }

    return blockText;
}

export async function copyAsEventSubscriber(alObject: ALObject, sourceText: string) {
    const sourceTextLines = sourceText.split('\n');
    let scope = '';

    switch (true) {
        case (regExpr.integrationEvent.test(sourceTextLines[0].trim())): {
            scope = 'integration event';
            break;
        }

        case (regExpr.tableField.test(sourceTextLines[0].trim())): {
            if (alObject.isTable() || alObject.isTableExt()) {
                scope = 'table field';
                break;
            }
        }
        case (regExpr.pageField.test(sourceTextLines[0].trim())): {
            if (alObject.isPage() || alObject.isPageExt()) {
                scope = 'page field';
                break;
            }
        }
    }

    if (scope === '') {
        if (alObject.isTable() || alObject.isTableExt()) {
            scope = 'table';
        }
    }

    if (scope === '') {
        vscode.window.showErrorMessage('No event definitions found in the current selection');
        return;
    }

    const subscriberCode = createEventSubscriberText(alObject, sourceText, scope);
    if (!subscriberCode) {
        vscode.window.showErrorMessage('No event definitions found in the current selection');
        return;
    }

    try {
        await vscode.env.clipboard.writeText(subscriberCode);
        vscode.window.showInformationMessage(`The event subscriber definition is ready to paste!`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create event subscription definition: ${error.message}`);
    }
}


function createEventSubscriberText(alObject: ALObject, sourceText: string, scope: string): string {
    let objectType2 = alObject.objectType;
    if (alObject.isTable()) {
        objectType2 = 'Database';
    }

    sourceText = sourceText.trim();
    const sourceTextLines = sourceText.split('\n');
    const sourceObjectName = typeHelper.addQuotesIfNeeded(alObject.objectName);

    if (scope === '' || scope === 'integration event') {
        const match = sourceText.match(regExpr.integrationEventDefinition);

        if (match) {
            const integrationEventParams = match[2]; // Parametri di definizione IntegrationEvent (es. false, false)
            const eventName = match[4];
            let parameters = match[5];

            if (integrationEventParams.split(',')[0].toLowerCase() === 'true') {
                if (parameters) {
                    parameters += '; ';
                }
                parameters += `var sender: ${alObject.objectType} ${sourceObjectName}`;
            }

            let eventSubscrText = `[EventSubscriber(ObjectType::${alObject.objectType}`;
            eventSubscrText += `, ${objectType2}::${sourceObjectName}`;
            eventSubscrText += `, '${eventName}', '', false, false)]\n`;

            eventSubscrText += `local procedure ${typeHelper.toPascalCase(sourceObjectName)}_${eventName}(${parameters})`;
            eventSubscrText += 'begin\n\n';
            eventSubscrText += 'end;';

            return eventSubscrText;
        }
    }
    if (scope === 'table') {
        let eventSubscrText = `[EventSubscriber(ObjectType::${alObject.objectType}`;
        eventSubscrText += `, ${objectType2}::${sourceObjectName}`;
        eventSubscrText += `, 'OnAfterModifyEvent', '}', false, false)]\n`;

        eventSubscrText += `local procedure ${typeHelper.toPascalCase(sourceObjectName)}_OnAfterModifyEvent(var Rec: Record ${sourceObjectName}; var xRec: Record ${sourceObjectName})\n`;
        eventSubscrText += 'begin\n\n';
        eventSubscrText += 'end;';

        return eventSubscrText;
    }
    if (scope === 'table field') {
        const match = sourceTextLines[0].match(regExpr.tableField);
        if (match) {
            const fieldName = match[2];

            let eventSubscrText = `[EventSubscriber(ObjectType::${alObject.objectType}`;
            eventSubscrText += `, ${objectType2}::${sourceObjectName}`;
            eventSubscrText += `, 'OnAfterValidateEvent', '${typeHelper.removeQuotes(fieldName)}', false, false)]\n`;

            eventSubscrText += `local procedure ${typeHelper.toPascalCase(sourceObjectName)}_${typeHelper.toPascalCase(fieldName)}_OnAfterValidateEvent(var Rec: Record ${sourceObjectName}; var xRec: Record ${sourceObjectName})\n`;
            eventSubscrText += 'begin\n\n';
            eventSubscrText += 'end;';

            return eventSubscrText;

        }
    }
    if (scope === 'page field') {
        const match = sourceTextLines[0].match(regExpr.pageField);
        if (match) {
            const fieldName = match[1];
            let sourceTableName = typeHelper.addQuotesIfNeeded(alObject.sourceTableName);

            let eventSubscrText = `[EventSubscriber(ObjectType::${alObject.objectType}`;
            eventSubscrText += `, ${objectType2}::${sourceObjectName}`;
            eventSubscrText += `, 'OnAfterValidateEvent', '${typeHelper.removeQuotes(fieldName)}', false, false)]\n`;

            if (sourceTableName) {
                eventSubscrText += `local procedure ${typeHelper.toPascalCase(sourceObjectName)}_${typeHelper.toPascalCase(fieldName)}_OnAfterValidateEvent(var Rec: Record ${sourceTableName}; var xRec: Record ${sourceTableName})\n`;
            }
            else {
                eventSubscrText += `local procedure ${typeHelper.toPascalCase(sourceObjectName)}_${typeHelper.toPascalCase(fieldName)}_OnAfterValidateEvent()\n`;
            }
            eventSubscrText += 'begin\n\n';
            eventSubscrText += 'end;';

            return eventSubscrText;

        }
    }

    return null;
    //#endregion AL Events Tools
}