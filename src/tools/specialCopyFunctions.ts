import * as vscode from 'vscode';
import * as regExpr from '../regExpressions';
import * as alFileMgr from '../alObject/alObjectFileMgr';
import * as typeHelper from '../typeHelper';

import { ALObject, ALObjectFields } from '../alObject/alObject';

//#region Integration Events
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
}
//#endregion Integration Events

//#region Record insert statement
export async function copyRecordInsertStatement(docUri?: vscode.Uri, validateFields?: boolean) {
    let document: vscode.TextDocument;

    if (docUri) {
        document = await vscode.workspace.openTextDocument(docUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    const alObject = new ALObject(document);

    let statementText = '';

    if (alObject.isTable() || alObject.isTableExt()) {
        const alTableFields = new ALObjectFields(alObject);
        const recVariableName = await askRecordVariableName(typeHelper.toPascalCase(alObject.objectName));

        statementText = `${recVariableName}.Init();\n`;

        if (alObject.isTable()) {
            let pkFields = alTableFields.fields
                .filter(item => item.pkIndex > 0)
                .sort((a, b) => a.pkIndex - b.pkIndex);

            pkFields.forEach(field => {
                statementText += `${createFieldAssignmentStatement(recVariableName, field.name, field.type, validateFields)}\n`;
            });

            if (validateFields) {
                statementText += `${recVariableName}.Insert(true);\n`;
            }
            statementText += `\n`;
        }

        let fields = alTableFields.fields
            .filter(item => item.pkIndex === 0)
            .sort((a, b) => a.id - b.id);

        fields.forEach(field => {
            let isValidField = true;
            if (field.properties['fieldclass']) {
                if (['flowfield', 'flowfilter'].includes(field.properties['fieldclass'].toLowerCase())) {
                    isValidField = false;
                }
            }

            if (isValidField) {
                statementText += `${createFieldAssignmentStatement(recVariableName, field.name, field.type, validateFields)}\n`;
            }
        });

        if (validateFields) {
            if (alObject.isTable()) {
                statementText += `${recVariableName}.Modify(true);\n`;
            }
            else {
                statementText += `${recVariableName}.Insert(true);\n`;
            }
        }
        else {
            statementText += `${recVariableName}.Insert(false);\n`;
        }
    }

    if (statementText) {
        try {
            await vscode.env.clipboard.writeText(statementText);
            vscode.window.showInformationMessage(`The Record Insert statement is ready to paste!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create Record Insert statement: ${error.message}`);
        }
    }
    else {
        vscode.window.showErrorMessage(`Unable to retrieve list of fields for the current table`);
    }

}

export function copyRecordInsertStatementWithValidation(docUri?: vscode.Uri) {
    copyRecordInsertStatement(docUri, true);
}

function createFieldAssignmentStatement(recVariableName: string, fieldName: string, fieldType: string, withValidate: boolean): string {
    let statementText = '';

    let fieldValue = fieldType;
    if (fieldValue.toLowerCase().startsWith('enum ')) {
        fieldValue = fieldValue.replace(/Enum\s+"(.*?)"/gi, 'Enum::"$1"');
    }
    else {
        fieldValue = fieldValue.replace('[', '_');
        fieldValue = fieldValue.replace(']', '');
        fieldValue = typeHelper.toPascalCase(fieldValue);
    }

    if (withValidate) {
        statementText += `${recVariableName}.Validate(${typeHelper.addQuotesIfNeeded(fieldName)}, ${fieldValue});`;
    }
    else {
        statementText += `${recVariableName}.${typeHelper.addQuotesIfNeeded(fieldName)} := ${fieldValue};`;
    }

    return statementText;
}

async function askRecordVariableName(defaultName: string): Promise<string> {
    const userInput = await vscode.window.showInputBox({
        prompt: 'Type your record variable name',
        placeHolder: `Type your record variable name or leave blank to use the default name`,
        value: defaultName,
        validateInput: (value) => {
            // Opzionale: aggiungi una funzione per validare l'input
            if (value.trim().length > 50) {
                return 'Value too long';
            }
            return null; // Nessun errore
        }
    });

    if (userInput) {
        return userInput;
    }

    return defaultName;
}
//#endregion Record insert statement

//#region Record modify statement
export async function copyRecordModifyStatement(docUri?: vscode.Uri, validateFields?: boolean) {
    let document: vscode.TextDocument;

    if (docUri) {
        document = await vscode.workspace.openTextDocument(docUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    const alObject = new ALObject(document);

    let statementText = '';

    if (alObject.isTable() || alObject.isTableExt()) {
        const alTableFields = new ALObjectFields(alObject);
        const recVariableName = await askRecordVariableName(typeHelper.toPascalCase(alObject.objectName));

        statementText = `if ${recVariableName}.Get(`;

        if (alObject.isTable()) {
            let pkFields = alTableFields.fields
                .filter(item => item.pkIndex > 0)
                .sort((a, b) => a.pkIndex - b.pkIndex);

            let isFirstElement = true;
            pkFields.forEach(field => {
                if (!isFirstElement) {
                    statementText += ', ';
                }

                statementText += typeHelper.toPascalCase(field.name);
                isFirstElement = false;
            });
        }

        statementText += ') then begin';
        statementText += `\n`;

        let fields = alTableFields.fields
            .filter(item => item.pkIndex === 0)
            .sort((a, b) => a.id - b.id);

        fields.forEach(field => {
            let isValidField = true;
            if (field.properties['fieldclass']) {
                if (['flowfield', 'flowfilter'].includes(field.properties['fieldclass'].toLowerCase())) {
                    isValidField = false;
                }
            }

            if (isValidField) {
                statementText += `  ${createFieldAssignmentStatement(recVariableName, field.name, field.type, validateFields)}\n`;
            }
        });

        if (validateFields) {
            statementText += `  ${recVariableName}.Modify(true);\n`;
        }
        else {
            statementText += `  ${recVariableName}.Modify(false);\n`;
        }
        statementText += 'end;';
    }

    if (statementText) {
        try {
            await vscode.env.clipboard.writeText(statementText);
            vscode.window.showInformationMessage(`The Record Modify statement is ready to paste!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create Record Modify statement: ${error.message}`);
        }
    }
    else {
        vscode.window.showErrorMessage(`Unable to retrieve list of fields for the current table`);
    }
}

export function copyRecordModifyStatementWithValidation(docUri?: vscode.Uri) {
    copyRecordModifyStatement(docUri, true);
}
//#endregion Record modify statement

//#region Record delete statement
export async function copyRecordDeleteStatement(docUri?: vscode.Uri) {
    let document: vscode.TextDocument;

    if (docUri) {
        document = await vscode.workspace.openTextDocument(docUri);
    }
    else {
        const editor = vscode.window.activeTextEditor;
        document = editor.document;
    }

    const alObject = new ALObject(document);

    let statementText = '';

    if (alObject.isTable() || alObject.isTableExt()) {
        const alTableFields = new ALObjectFields(alObject);
        const recVariableName = await askRecordVariableName(typeHelper.toPascalCase(alObject.objectName));

        statementText = `if ${recVariableName}.Get(`;

        if (alObject.isTable()) {
            let pkFields = alTableFields.fields
                .filter(item => item.pkIndex > 0)
                .sort((a, b) => a.pkIndex - b.pkIndex);

            let isFirstElement = true;
            pkFields.forEach(field => {
                if (!isFirstElement) {
                    statementText += ', ';
                }

                statementText += typeHelper.toPascalCase(field.name);
                isFirstElement = false;
            });
        }

        statementText += ') then begin';
        statementText += `\n`;
        statementText += `  ${recVariableName}.Delete(true);\n`;
        statementText += 'end;';
    }

    if (statementText) {
        try {
            await vscode.env.clipboard.writeText(statementText);
            vscode.window.showInformationMessage(`The Record Delete statement is ready to paste!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create Record Delete statement: ${error.message}`);
        }
    }
    else {
        vscode.window.showErrorMessage(`Unable to retrieve list of fields for the current table`);
    }
}
//#endregion Record delete statement