import * as vscode from 'vscode';
import * as typeHelper from '../typeHelper';
import * as qpTools from '../tools/quickPickTools';
import * as alFileMgr from './alObjectFileMgr';
import * as alObjectExplorer from './alObjectExplorer';
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

    constructor() { }

    static async getInstance(): Promise<ALObjectIndex> {
        if (!this.instance) {
            this.instance = new ALObjectIndex();
            await this.instance.init();
        }

        return this.instance;
    }

    async init() {
        const output = ATSOutputChannel.getInstance();

        await this.buildFullIndex();

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
            this.watcher.onDidDelete((uri) => {
                const existingItem = this.items.get(uri.fsPath);
                output.writeInfoMessage(`[AL Object Index] AL object removed: ${existingItem.objectType} ${existingItem.objectId} ${existingItem.objectName}`);
                this.items.delete(uri.fsPath);
            })
        );

        // Save AL object file
        // Update on save (only when the user saves an AL file)
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument(async (document) => {
                if (document.languageId !== 'al') {return;}
                const uri = document.uri;

                if (this.isExcluded(uri)) {return;}

                try {
                    // Se esiste già un oggetto indicizzato, lo rimuovo
                    const existingItem = this.items.get(uri.fsPath);
                    if (existingItem) {
                        this.items.delete(uri.fsPath);

                        output.writeInfoMessage(`[AL Object Index] Removed outdated entry: ${existingItem.objectType} ${existingItem.objectId} ${existingItem.objectName}`);
                    }

                    // Reindicizzo il file appena salvato
                    const updatedItem = await this.parseFile(uri);
                    if (updatedItem) {
                        this.items.set(uri.fsPath, updatedItem);
                        output.writeInfoMessage(`[AL Object Index] Updated AL object: ${updatedItem.objectType} ${updatedItem.objectId} ${updatedItem.objectName}`);
                    } else {
                        output.writeInfoMessage(`[AL Object Index] No AL object found after save: ${uri.fsPath}`);
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

            const label = alObject.objectId
                ? `${alObject.objectType} ${alObject.objectId} ${alObject.objectName}`
                : `${alObject.objectType} ${alObject.objectName}`;

            const detail = [
                alObject.extendedObjectName ? `extends ${extendedObjectName}` : '',
                alObject.objectNamespace ?? ''
            ].filter(Boolean).join('; ');

            return {
                label,
                description: vscode.workspace.asRelativePath(alObject.objectFileUri.fsPath),
                detail,
                groupName: alObject.objectType,
                groupID: alObjectExplorer.getObjectGroupID(alObject, false),
                documentUri: alObject.objectFileUri,
                iconPath: new vscode.ThemeIcon(alObject.getDefaultIconName()),
                sortKey: `${alObject.objectType.toLowerCase().padEnd(20)}${alObject.objectId?.toString().padStart(10, '0') ?? ''}${alObject.objectName.toLowerCase()}`,
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

        const excludePattern = `{${EXCLUDE_GLOBS.join(',')}}`;
        const uris = await vscode.workspace.findFiles('**/*.al', excludePattern);
        const tasks = uris.map((uri) => this.parseFile(uri));
        const results = await Promise.all(tasks);

        let objectCount = 0;
        for (const item of results) {
            if (item) {
                objectCount++;
                this.items.set(item.objectFileUri.fsPath, item);
            }
        }

        output.writeInfoMessage(`${objectCount} objects were detected in the current workspace`);
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
                const alObject = new ALObject(document, false);

                if (alObject) {
                    const objectName = typeHelper.addQuotesIfNeeded(alObject.objectName);
                    if (objectName) {
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

