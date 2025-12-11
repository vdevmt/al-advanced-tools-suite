import * as vscode from 'vscode';
import * as launchMgr from './launch/launchMgr';
import * as alSymbols from './alObject/alSymbols';
import * as alObjectExplorer from './alObject/alObjectExplorer';
import * as alObjectStats from './alObject/alObjectStatistics';
import * as regionMgr from './alObject/alObjectRegionMgr';
import * as regionStatusBar from './alObject/alObjectRegionStatusBar';
import * as objectInfoStatusBar from './alObject/alObjectInfoStatusBar';
import * as namespaceMgr from './alObject/alObjectNamespaceMgr';
import * as diagnosticMgr from './diagnostics/diagnosticMgr';
import *  as specialCopyFunct from './tools/specialCopyFunctions';
import *  as appInfo from './tools/appInfo';
import *  as alFileMgr from './alObject/alObjectFileMgr';
import { AtsEventIntegrationCodeActionProvider } from './tools/specialCopyFunctions';
import { AtsNameSpaceDiagnosticsCodeActionProvider } from './alObject/alObjectNamespaceMgr';
import { ALObject } from './alObject/alObject';
import { ALObjectIndex } from './alObject/alObjectIndex';
import { ATSOutputChannel } from './tools/outputChannel';

let regionPathSBDebounceTimeout = null;

export async function activate(context: vscode.ExtensionContext) {
    const output = ATSOutputChannel.getInstance();
    output.writeInfoMessage('Activating ATS Extension...');

    //#region extension status
    vscode.commands.executeCommand('setContext', 'atsExtensionActive', true);
    await reloadExtensionData(context);
    //#endregion extension status

    //#region app.json tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.alPackageNewVersion', appInfo.packageNewVersion));
    //#endregion app.json tools

    //#region launch.json tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.importLaunchFile', launchMgr.importLaunchFile));
    context.subscriptions.push(vscode.commands.registerCommand('ats.exportLaunchFile', launchMgr.exportLaunchFile));
    context.subscriptions.push(vscode.commands.registerCommand('ats.openLaunchFile', launchMgr.openLaunchFile));
    //#endregion launch.json tools

    //#region AL Symbols tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.importAlSymbols', alSymbols.importAlSymbols));
    //#endregion AL Symbols tools

    //#region AL Objects Explorer
    setObjectTypeContext(null);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        setObjectTypeContext(editor);
    }));

    function setObjectTypeContext(editor: vscode.TextEditor) {
        if (!editor) {
            editor = vscode.window.activeTextEditor;
        }

        vscode.commands.executeCommand('setContext', 'ats.isAlObject', false);
        vscode.commands.executeCommand('setContext', 'ats.alObjectType', '');
        if (editor && editor.document) {
            const alObject = new ALObject(editor.document, false);
            if (alObject.objectType) {
                vscode.commands.executeCommand('setContext', 'ats.isAlObject', true);
                vscode.commands.executeCommand('setContext', 'ats.alObjectType', alObject.objectType);
            }
        }
    }

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(e => {
            // Clear AL Object Cache
            alFileMgr.clearALObjectCache();
        }),

        vscode.workspace.onDidCloseTextDocument(doc => {
            // Clear AL Object Cache
            alFileMgr.clearALObjectCache();
        }),
    );

    context.subscriptions.push(vscode.commands.registerCommand('ats.ALObjectExplorer', alObjectExplorer.execALObjectExplorer));
    context.subscriptions.push(vscode.commands.registerCommand('ats.showOpenALObjects', alObjectExplorer.showOpenALObjects));

    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllFields', alObjectExplorer.showAllFields));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyFieldsAsText', alObjectExplorer.copyFieldsAsText));

    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllTableKeys', alObjectExplorer.showAllTableKeys));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyTableKeysAsText', alObjectExplorer.copyTableKeysAsText));

    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllTableFieldGroups', alObjectExplorer.showAllTableFieldGroups));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyTableFieldGroupsAsText', alObjectExplorer.copyTableFieldGroupsAsText));

    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllTriggers', alObjectExplorer.showAllTriggers));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyTriggersAsText', alObjectExplorer.copyTriggersAsText));

    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllProcedures', alObjectExplorer.showAllProcedures));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyProceduresAsText', alObjectExplorer.copyProceduresAsText));

    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllDataItems', alObjectExplorer.showAllDataItems));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyDataItemsAsText', alObjectExplorer.copyDataItemsAsText));

    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllActions', alObjectExplorer.showAllActions));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyActionsAsText', alObjectExplorer.copyActionsAsText));

    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllRegions', alObjectExplorer.showAllRegions));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyRegionsAsText', alObjectExplorer.copyRegionsAsText));

    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllGlobalVariables', alObjectExplorer.showAllGlobalVariables));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyGlobalVariablesAsText', alObjectExplorer.copyGlobalVariablesAsText));

    context.subscriptions.push(vscode.commands.registerCommand('ats.showAllLocalVariables', alObjectExplorer.showAllLocalVariables));

    context.subscriptions.push(vscode.commands.registerCommand('ats.gotoWorkspaceObjects', alObjectExplorer.gotoWorkspaceObjects));
    //#endregion AL Objects Explorer

    //#region Run Business Central       
    context.subscriptions.push(vscode.commands.registerCommand('ats.runBusinessCentral', launchMgr.runBusinessCentral));
    context.subscriptions.push(vscode.commands.registerCommand('ats.changeStartupObjectAndRunBusinessCentral', launchMgr.changeStartupObjectAndRunBusinessCentral));
    //#endregion Run Business Central

    //#region Region tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.createRegionBySelection', regionMgr.createRegionBySelection));
    //#endregion Region tools

    //#region Namespace tools
    context.subscriptions.push(vscode.commands.registerCommand('ats.setObjectNamespace', namespaceMgr.setObjectNamespace));
    context.subscriptions.push(vscode.commands.registerCommand('ats.setNamespaceByFilePath', namespaceMgr.setNamespaceByFilePath));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('al', new namespaceMgr.NamespaceCompletionProvider(), " "));

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { language: 'al', scheme: 'file' },
            new AtsNameSpaceDiagnosticsCodeActionProvider(),
            {
                providedCodeActionKinds: AtsNameSpaceDiagnosticsCodeActionProvider.providedCodeActionKinds,
            }
        )
    );
    //#endregion Namespace tools

    //#region Diagnostic Rules
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('atsDiagnostics');
    context.subscriptions.push(diagnosticCollection);

    diagnosticMgr.subscribeToDocumentChanges(context, diagnosticCollection);

    // Scansiona tutti i file AL nel workspace all'avvio
    diagnosticMgr.ValidateAllFiles(diagnosticCollection);
    //#endregion Diagnostic Rules

    //#region AL Object Info Status Bar
    const objectInfoStatusBarItem = objectInfoStatusBar.createObjectInfoStatusBarItem();
    if (objectInfoStatusBarItem) {
        context.subscriptions.push(objectInfoStatusBarItem);

        // Update status bar on editor change
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(refreshObjectInfoStatusBar));

        // Update status bar on document save
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(refreshObjectInfoStatusBar));

        // Update status bar on document close
        context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(refreshObjectInfoStatusBar));
    }

    function refreshObjectInfoStatusBar() {
        objectInfoStatusBar.updateObjectInfoStatusBar(objectInfoStatusBarItem);
    }
    //#endregion AL Object Info Status Bar

    //#region Region Status Bar
    const regionStatusBarItem = regionStatusBar.createRegionsStatusBarItem();
    if (regionStatusBarItem) {
        context.subscriptions.push(regionStatusBarItem);

        // Update status bar on editor change
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(refreshRegionsStatusBar));
        context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateRegionsStatusBarText));

        // Update status bar on document save
        context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(refreshRegionsStatusBar));

        // Clear status bar cache on document close
        context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((event) => {
            regionStatusBar.clearRegionsCache(event.fileName);
        }));
    }

    function updateRegionsStatusBarText() {
        regionStatusBar.updateRegionsStatusBar(regionStatusBarItem, false);
    }
    function refreshRegionsStatusBar() {
        regionStatusBar.updateRegionsStatusBar(regionStatusBarItem, true);
    }


    // Update ATS status bar items on document change
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(refreshStatusBarItemsOnChange));

    function refreshStatusBarItemsOnChange() {
        if (regionStatusBarItem) {
            // Cancella il timeout precedente, se presente
            if (regionPathSBDebounceTimeout) {
                clearTimeout(regionPathSBDebounceTimeout);
            }

            // Imposta un nuovo timeout per l'aggiornamento della status bar
            regionPathSBDebounceTimeout = setTimeout(() => {
                refreshRegionsStatusBar();
            }, 3000); // 3000ms di attesa prima di invocare l'aggiornamento del controllo su status bar               
        }
    }
    //#endregion Region Status Bar

    //#region Special Copy
    context.subscriptions.push(vscode.commands.registerCommand('ats.copySelectionAsEventSubscriber', specialCopyFunct.copySelectionAsEventSubscriber));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copySelectionAsEventIntegration', specialCopyFunct.copySelectionAsEventIntegration));

    context.subscriptions.push(vscode.commands.registerCommand('ats.copySelectionAsProcedure', specialCopyFunct.copySelectionAsProcedure));

    context.subscriptions.push(vscode.commands.registerCommand('ats.copyAsRecordInsertStatement', specialCopyFunct.copyRecordInsertStatement));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyAsRecordInsertStatementWithValidation', specialCopyFunct.copyRecordInsertStatementWithValidation));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyAsRecordModifyStatement', specialCopyFunct.copyRecordModifyStatement));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyAsRecordModifyStatementWithValidation', specialCopyFunct.copyRecordModifyStatementWithValidation));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyAsRecordDeleteStatement', specialCopyFunct.copyRecordDeleteStatement));

    context.subscriptions.push(vscode.commands.registerCommand('ats.copyRecordAsPageFields', specialCopyFunct.copyRecordAsPageFields));
    context.subscriptions.push(vscode.commands.registerCommand('ats.copyRecordAsReportColumns', specialCopyFunct.copyRecordAsReportColumns));

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { language: 'al', scheme: 'file' },
            new AtsEventIntegrationCodeActionProvider(),
            {
                providedCodeActionKinds: AtsEventIntegrationCodeActionProvider.providedCodeActionKinds,
            }
        )
    );

    const generateSubscriberCommand = vscode.commands.registerCommand(
        'ats.copyAsEventSubscriber',
        (alObject: ALObject, sourceText: string) => {
            specialCopyFunct.copyAsEventSubscriber(alObject, sourceText);
        }
    );

    context.subscriptions.push(generateSubscriberCommand);
    //#endregion Special Copy

    //#region Objects Statistics
    context.subscriptions.push(vscode.commands.registerCommand('ats.viewALObjectsSummary', alObjectStats.viewALObjectsSummary));
    context.subscriptions.push(vscode.commands.registerCommand('ats.exportObjectsAssignmentDetailsAsCSV', alObjectStats.exportObjectsAssignmentDetailsAsCSV));
    //#endregion Objects Statistics

    output.writeInfoMessage('ATS Extension successfully activated');
}

export function deactivate() {
    vscode.commands.executeCommand('setContext', 'atsExtensionActive', false);

    vscode.commands.executeCommand('setContext', 'ats.isAlObject', false);
    vscode.commands.executeCommand('setContext', 'ats.alObjectType', '');

    alFileMgr.clearALObjectCache();

    const output = ATSOutputChannel.getInstance();
    output.writeInfoMessage('ATS Extension deactivated.');
}

async function reloadExtensionData(context: vscode.ExtensionContext) {
    //#region Go to AL Object command
    const alObjectIndex = await ALObjectIndex.getInstance();
    context.subscriptions.push(alObjectIndex);
    //#endregion Go to AL Object command
}