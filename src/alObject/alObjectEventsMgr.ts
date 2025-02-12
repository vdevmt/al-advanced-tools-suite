import * as vscode from 'vscode';
import * as regExpr from '../regExpressions';
import * as alFileMgr from './alObjectFileMgr';
import * as typeHelper from '../typeHelper';

import { ALObject } from './alObject';

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
                let alObject: ALObject;
                alObject = new ALObject(document);
                if (alObject) {
                    let currentLinePos = range.start.line;
                    let currentLineText = document.lineAt(currentLinePos).text;

                    let isValidLine: boolean = regExpr.integrationEventDef.test(currentLineText.trim());
                    if (!isValidLine) {
                        if (regExpr.procedure.test(currentLineText.trim())) {
                            currentLinePos -= 1;
                            currentLineText = document.lineAt(currentLinePos).text;
                            isValidLine = regExpr.integrationEventDef.test(currentLineText.trim());
                        }
                    }
                    if (isValidLine) {
                        const fullText = this.getFullBlockText(document, currentLinePos);

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

    private getFullBlockText(document: vscode.TextDocument, startLine: number): string {
        let blockText = document.lineAt(startLine).text;

        // Scendi verso il basso per trovare le righe successive
        for (let i = startLine + 1; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;
            blockText += '\n' + line;

            if (line.trim().endsWith(')') || line.trim() === 'begin') {
                break; // Fine del blocco
            }
        }

        return blockText;
    }
}

export async function copyAsEventSubscriber(alObject: ALObject, integrationEvent: string) {
    const subscriberCode = createEventSubscriberText(alObject, integrationEvent);

    if (!subscriberCode) {
        vscode.window.showErrorMessage('Failed to create Event Subscriber code');
        return;
    }

    try {
        await vscode.env.clipboard.writeText(subscriberCode);
        vscode.window.showInformationMessage(`The event subscriber definition is ready to paste!`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create event subscription definition: ${error.message}`);
    }
}


function createEventSubscriberText(alObject: ALObject, intEventText: string): string {
    let objectType2 = alObject.objectType;
    if (alObject.isTable()) {
        objectType2 = 'Database';
    }
    const regex = /\[(IntegrationEvent\(([^)]+)\))\]\s*(local|internal|)\s*procedure\s+(\w+)\(([^)]*)\)/i;
    const match = intEventText.match(regex);

    if (match) {
        const integrationEventParams = match[2]; // Parametri di definizione IntegrationEvent (es. false, false)
        const eventName = match[4];
        let parameters = match[5];

        if (integrationEventParams.split(',')[0].toLowerCase() === 'true') {
            if (parameters) {
                parameters += '; ';
            }
            parameters += `var sender: ${alObject.objectType} ${typeHelper.addQuotesIfNeeded(alObject.objectName)}`;
        }

        let eventSubscriber = `[EventSubscriber(ObjectType::${alObject.objectType}`;
        eventSubscriber += `, ${objectType2}::${typeHelper.addQuotesIfNeeded(alObject.objectName)}`;
        eventSubscriber += `, '${eventName}', '', false, false)]\n`;

        eventSubscriber += `local procedure ${typeHelper.toPascalCase(alObject.objectName)}_${eventName}(${parameters})`;
        eventSubscriber += 'begin\n\n';
        eventSubscriber += 'end;';

        return eventSubscriber;
    }

    return null;
}