import * as vscode from 'vscode';
import * as externalTools from '../tools/externalTools';
import * as appInfo from '../tools/appInfo';

export class CRSSettings {
    private static CONFIGKEY: string = 'CRS';
    static readonly ObjectNamePrefix = 'ObjectNamePrefix';
    static readonly RemovePrefixFromFilename = 'RemovePrefixFromFilename';

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
        if (externalTools.isCRSExtensionInstalled()) {
            const workspaceFolder = appInfo.getWorkspaceFolder(ResourceUri);

            this.config = ResourceUri ?
                vscode.workspace.getConfiguration(this.CONFIGKEY, ResourceUri) :
                vscode.window.activeTextEditor ?
                    vscode.workspace.getConfiguration(this.CONFIGKEY, vscode.window.activeTextEditor.document.uri) :
                    vscode.workspace.workspaceFolders ?
                        vscode.workspace.getConfiguration(this.CONFIGKEY, workspaceFolder.uri) :
                        vscode.workspace.getConfiguration(this.CONFIGKEY, null);

            this.SettingCollection[this.ObjectNamePrefix] = this.getSetting(this.ObjectNamePrefix);
            this.SettingCollection[this.RemovePrefixFromFilename] = this.getSetting(this.RemovePrefixFromFilename);
        }
        else {
            this.SettingCollection[this.ObjectNamePrefix] = "";
            this.SettingCollection[this.RemovePrefixFromFilename] = false;
        }
    }

    public static GetConfigSettings(ResourceUri: vscode.Uri) {
        this.getConfigSettings(ResourceUri);

        return this.SettingCollection;
    }
}