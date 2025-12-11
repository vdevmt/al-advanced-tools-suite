import * as vscode from 'vscode';
import * as typeHelper from '../tools/typeHelper';
import * as qpTools from '../tools/quickPickTools';
import * as alFileMgr from './alObjectFileMgr';
import * as appInfo from '../tools/appInfo';
import * as gitInfo from '../tools/gitInfo';
import { ATSOutputChannel } from '../tools/outputChannel';
import { ALObject } from './alObject';

const EXCLUDE_GLOBS = [
    '**/.alpackages/**',
];

export class ALObjectIndex implements vscode.Disposable {
    private items: Map<string, ALObject> = new Map(); // key: fsPath
    private watcher: vscode.FileSystemWatcher | undefined;
    private disposables: vscode.Disposable[] = [];
    private static instance: ALObjectIndex | undefined;
    private gitBranchSignature: string;
    private multiRoot: boolean;

    constructor() { }

    static async getInstance(): Promise<ALObjectIndex> {
        if (!this.instance) {
            this.instance = new ALObjectIndex();
            await this.instance.init();
        }
        else {
            let rebuildRequired = false;

            const currBranchSignature = await gitInfo.getGitBranchesSignature();
            if (this.instance.gitBranchSignature !== currBranchSignature) {
                rebuildRequired = true;
            }

            if (rebuildRequired) {
                const output = ATSOutputChannel.getInstance();
                output.writeInfoMessage(`Rebuilding AL object index...`);

                this.instance.dispose();
                this.instance = new ALObjectIndex();
                await this.instance.init();
            }
        }

        return this.instance;
    }

    async init() {
        const output = ATSOutputChannel.getInstance();

        await this.buildFullIndex();
        this.gitBranchSignature = await gitInfo.getGitBranchesSignature();

        // Watch only *.al files in the workspace
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*.al', false, false, false);

        // Add
        this.disposables.push(
            this.watcher.onDidCreate(async (uri) => {
                if (this.isExcluded(uri)) { return; }
                const item = await this.parseFile(uri);
                if (item) {
                    this.items.set(uri.fsPath, item);
                    output.writeInfoMessage(`[AL Object Index] New AL object detected: ${item.objectType} ${item.objectId} ${item.objectName}`);
                }
            })
        );

        // Delete
        this.disposables.push(
            this.watcher.onDidDelete(async (uri) => {
                const existingItem = this.items?.get(uri.fsPath);
                if (existingItem) {
                    output.writeInfoMessage(`[AL Object Index] AL object removed: ${existingItem.objectType} ${existingItem.objectId} ${existingItem.objectName}`);
                    this.items.delete(uri.fsPath);
                }
            })
        );

        // Save AL object file
        // Update on save (only when the user saves an AL file)
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(async (document) => {
                if (document.languageId !== 'al') { return; }
                const uri = document.uri;

                if (this.isExcluded(uri)) { return; }

                try {
                    // Se esiste già un oggetto indicizzato, lo rimuovo
                    const existingItem = this.items.get(uri.fsPath);
                    if (existingItem) {
                        this.items.delete(uri.fsPath);
                    }

                    // Reindicizzo il file appena salvato
                    const updatedItem = await this.parseFile(uri);
                    if (updatedItem) {
                        this.items.set(uri.fsPath, updatedItem);
                    }
                } catch (err) {
                    output.writeInfoMessage(`[AL Object Index] Failed to update ${uri.fsPath} on save: ${String(err)}`);
                }
            })
        );
    }

    getAllObjects(): ALObject[] {
        return Array.from(this.items.values());
    }

    getAllFilePath(): string[] {
        return Array.from(this.items.keys());
    }

    toQuickPickItems(): qpTools.atsQuickPickItem[] {
        const quickPickItems: qpTools.atsQuickPickItem[] = [...this.items.values()].map(alObject => {
            const extendedObjectName = typeHelper.addQuotesIfNeeded(alObject.extendedObjectName);

            let detail = [
                alObject.extendedObjectName ? `extends ${extendedObjectName}` : '',
                alObject.objectNamespace ?? ''
            ].filter(Boolean).join('; ');

            if (this.multiRoot) {
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(alObject.objectFileUri);
                const wfDescription = appInfo.appName(workspaceFolder) || workspaceFolder.name;
                if (wfDescription) {
                    detail = `[${wfDescription}] ${detail}`;
                }
            }

            let groupName = alObject.objectType;
            let groupId = alObject.objectTypeIndex;

            switch (true) {
                case alObject.isTemporaryTable(): {
                    groupName = 'Table (Temporary)';
                    groupId++;
                    break;
                }
                case alObject.isProcessingOnlyReport(): {
                    groupName = 'Report (ProcessingOnly)';
                    groupId++;
                    break;
                }
                case alObject.isTestCodeunit(): {
                    groupName = 'Codeunit (Test)';
                    groupId++;
                    break;
                }
            }

            return {
                label: alObject.description,
                description: vscode.workspace.asRelativePath(alObject.objectFileUri.fsPath),
                detail,
                groupName: groupName,
                groupID: groupId,
                documentUri: alObject.objectFileUri,
                iconPath: new vscode.ThemeIcon(alObject.getDefaultIconName()),
                sortKey: `${alObject.objectType.toLowerCase().padEnd(20)}${alObject.objectName.toLowerCase()}`,
                command: qpTools.cmdOpenFile,
                commandArgs: alObject.objectFileUri,
                buttons: [
                    {
                        iconPath: new vscode.ThemeIcon("symbol-misc"),
                        tooltip: qpTools.btnCmdExecObjectExplorer,
                    },
                    {
                        iconPath: new vscode.ThemeIcon("layout-sidebar-right"),
                        tooltip: qpTools.btnCmdOpenToSide,
                    }
                ]
            } as qpTools.atsQuickPickItem;
        });

        return quickPickItems.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }

    dispose() {
        this.watcher?.dispose();
        this.disposables.forEach(d => d.dispose());
        this.items.clear();
    }

    private async buildFullIndex() {
        const output = ATSOutputChannel.getInstance();
        output.writeInfoMessage('Searching AL objects in the current workspace...');

        this.items.clear();
        this.multiRoot = false;

        const excludePattern = `{${EXCLUDE_GLOBS.join(',')}}`;
        const uris = await vscode.workspace.findFiles('**/*.al', excludePattern);
        const results = await Promise.all(uris.map(uri => this.parseFile(uri)));

        let objectCount = 0;
        let workspaceFolder = undefined;

        const objectTypeCount = new Map<string, number>();
        for (const item of results) {
            if (item) {
                objectCount++;
                this.items.set(item.objectFileUri.fsPath, item);

                const current = objectTypeCount.get(item.objectType) || 0;
                objectTypeCount.set(item.objectType, current + 1);

                if (!this.multiRoot) {
                    if (workspaceFolder && (workspaceFolder !== vscode.workspace.getWorkspaceFolder(item.objectFileUri))) {
                        this.multiRoot = true;
                    }
                    workspaceFolder = vscode.workspace.getWorkspaceFolder(item.objectFileUri);
                }
            }
        }

        let summary = `${objectCount} AL objects detected`;
        if (objectTypeCount.size > 0) {
            const sortedTypes = Array.from(objectTypeCount.entries())
                .sort(([a], [b]) => typeHelper.getObjectTypeSortingKey(a) - typeHelper.getObjectTypeSortingKey(b));

            const details = sortedTypes
                .map(([type, count]) => `\n- ${type}: ${count}`)
                .join(''); // niente virgole, solo newline

            summary += details;
        }

        output.writeInfoMessage(summary);
    }

    private isExcluded(uri: vscode.Uri): boolean {
        // Cheap path-based check to avoid parsing files in dependency folders
        const p = uri.fsPath.replace(/\\/g, '/').toLowerCase();
        return p.includes('/.alpackages/') ||
            p.includes('/packages/') ||
            p.includes('/bin/') ||
            p.includes('/out/');
    }

    private async parseFile(uri: vscode.Uri): Promise<ALObject | undefined> {
        const output = ATSOutputChannel.getInstance();

        try {
            if (alFileMgr.isALObjectFile(uri, false)) {
                const document = await vscode.workspace.openTextDocument(uri);
                const alObject = alFileMgr.parseALObject(document);

                if (alObject) {
                    if (alObject.objectName) {
                        return alObject;
                    }
                }

                output.writeWarningMessage(`No AL object found in "${uri.fsPath}"`);
            }

            return undefined;
        } catch (err) {
            output.writeErrorMessage(`Failed to parse ${uri.fsPath}: ${String(err)}`, false);
            return undefined;
        }
    }
}

