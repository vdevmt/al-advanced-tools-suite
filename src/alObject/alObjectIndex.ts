import * as vscode from 'vscode';
import * as typeHelper from '../typeHelper';
import * as qpTools from '../tools/quickPickTools';
import * as alFileMgr from './alObjectFileMgr';
import * as alObjectExplorer from './alObjectExplorer';
import { ALObject } from './alObject';

const EXCLUDE_GLOBS = [
    '**/.alpackages/**',
];

export class ALObjectIndex implements vscode.Disposable {
    private items: Map<string, qpTools.atsQuickPickItem> = new Map(); // key: fsPath
    private watcher: vscode.FileSystemWatcher | undefined;
    private disposables: vscode.Disposable[] = [];

    constructor(private readonly output?: vscode.OutputChannel) { }

    async init() {
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
                    this.output?.appendLine(`[ALObjectIndex] New AL object detected: ${item.label}`);
                }
            })
        );

        // Delete
        this.disposables.push(
            this.watcher.onDidDelete((uri) => {
                const existingItem = this.items.get(uri.fsPath);
                this.output?.appendLine(`[ALObjectIndex] AL object removed: ${existingItem.label || uri.fsPath}`);

                this.items.delete(uri.fsPath);
            })
        );

        // (Optional) Update on change
        /*
        this.disposables.push(
            this.watcher.onDidChange(async (uri) => {
                if (this.isExcluded(uri)) return;
                const item = await this.parseFile(uri);
                if (item) this.items.set(uri.fsPath, item);
            })
        );
        */
    }

    getAll(): qpTools.atsQuickPickItem[] {
        return Array.from(this.items.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }

    dispose() {
        this.watcher?.dispose();
        this.disposables.forEach(d => d.dispose());
        this.items.clear();
    }

    private async buildFullIndex() {
        this.output?.appendLine(`[ALObjectIndex] Search for AL objects in the current workspace...`);
        this.items.clear();

        const excludePattern = `{${EXCLUDE_GLOBS.join(',')}}`;
        const uris = await vscode.workspace.findFiles('**/*.al', excludePattern);
        const tasks = uris.map((uri) => this.parseFile(uri));
        const results = await Promise.all(tasks);

        let objectCount = 0;
        for (const item of results) {
            if (item) {
                objectCount++;
                this.items.set(item.documentUri.fsPath, item);
            }
        }
        this.output?.appendLine(`[ALObjectIndex] ${objectCount} objects were detected in the current workspace`);
    }

    private isExcluded(uri: vscode.Uri): boolean {
        // Cheap path-based check to avoid parsing files in dependency folders
        const p = uri.fsPath.replace(/\\/g, '/').toLowerCase();
        return p.includes('/.alpackages/') ||
            p.includes('/packages/') ||
            p.includes('/bin/') ||
            p.includes('/out/');
    }

    private async parseFile(uri: vscode.Uri): Promise<qpTools.atsQuickPickItem | undefined> {
        try {
            if (alFileMgr.isALObjectFile(uri, false)) {
                const document = await vscode.workspace.openTextDocument(uri);
                const alObject = new ALObject(document, false);

                if (alObject) {
                    const objectName = typeHelper.addQuotesIfNeeded(alObject.objectName);
                    if (objectName) {
                        const extendedObjectName = typeHelper.addQuotesIfNeeded(alObject.extendedObjectName);

                        const label = alObject.objectId ? `${alObject.objectType} ${alObject.objectId} ${objectName}` : `${alObject.objectType} ${objectName}`;
                        const detail =
                            alObject.extendedObjectName && alObject.objectNamespace ? `extends ${extendedObjectName}; ${alObject.objectNamespace}` :
                                alObject.extendedObjectName ? `extends ${extendedObjectName}` :
                                    alObject.objectNamespace ? `${alObject.objectNamespace}` : '';

                        const item: qpTools.atsQuickPickItem = {
                            label,
                            description: vscode.workspace.asRelativePath(uri),
                            detail,
                            groupName: alObject.objectType,
                            groupID: alObjectExplorer.getObjectGroupID(alObject, false),
                            documentUri: uri,
                            iconPath: new vscode.ThemeIcon(alObject.getDefaultIconName()),
                            sortKey: `${alObject.objectType.toLowerCase().padEnd(20)}${alObject.objectId.padStart(10, '0')}${alObject.objectName.toLowerCase()}`,
                            command: qpTools.cmdOpenFile,
                            commandArgs: uri
                        };

                        return item;
                    }
                }

                this.output?.appendLine(`[ALObjectIndex] No AL object found in "${uri.fsPath}"`);
            }

            return undefined;
        } catch (err) {
            this.output?.appendLine(`[ALObjectIndex] Failed to parse ${uri.fsPath}: ${String(err)}`);
            return undefined;
        }
    }
}

