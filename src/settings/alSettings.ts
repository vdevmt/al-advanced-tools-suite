import * as vscode from 'vscode';

export class ALSettings {
    private static CONFIGKEY: string = 'al';
    static readonly rootNamespace = 'rootNamespace';
    
    private static config: vscode.WorkspaceConfiguration;
    private static SettingCollection = {};
    
    private static getSetting(key: string) {
        if (!this.config.has(key)) {
            return null;
        } else {
            return this.config.get(key);
        }
    }

    private static getConfigSettings(ResourceUri: vscode.Uri) {
        this.config = ResourceUri ?
            vscode.workspace.getConfiguration(this.CONFIGKEY, ResourceUri) :
            vscode.window.activeTextEditor ?
                vscode.workspace.getConfiguration(this.CONFIGKEY, vscode.window.activeTextEditor.document.uri) :
                vscode.workspace.workspaceFolders ?
                    vscode.workspace.getConfiguration(this.CONFIGKEY, vscode.workspace.workspaceFolders[0].uri) :
                    vscode.workspace.getConfiguration(this.CONFIGKEY, null);

        this.SettingCollection[this.rootNamespace] = this.getSetting(this.rootNamespace);
    }

    public static GetConfigSettings(ResourceUri: vscode.Uri) {
        this.getConfigSettings(ResourceUri);

        return this.SettingCollection;
    }
}