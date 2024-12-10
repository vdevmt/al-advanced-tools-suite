import * as vscode from 'vscode';

export class ATSSettings {
    private static CONFIGKEY: string = 'ATS';
    static readonly DefaultLaunchArchiveFolder = 'DefaultLaunchArchiveFolder';
    static readonly UseObjectFilePathAsNamespace = 'UseObjectFilePathAsNamespace';
    static readonly RootNamespace = 'RootNamespace';
    static readonly DefaultNamespaces = 'DefaultNamespaces';
    static readonly EnableNamespaceDiagnostics = 'EnableNamespaceDiagnostics';
    static readonly NamespaceMandatory = 'NamespaceMandatory';
    static readonly MaxNamespaceSize = 'MaxNamespaceSize';
    static readonly URLForwardingRules = 'URLForwardingRules';
    static readonly ShowRegionsOnStatusBar = 'ShowRegionsOnStatusBar';
    
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

        this.SettingCollection[this.DefaultLaunchArchiveFolder] = this.getSetting(this.DefaultLaunchArchiveFolder);
        this.SettingCollection[this.UseObjectFilePathAsNamespace] = this.getSetting(this.UseObjectFilePathAsNamespace);
        this.SettingCollection[this.RootNamespace] = this.getSetting(this.RootNamespace);
        this.SettingCollection[this.DefaultNamespaces] = this.getSetting(this.DefaultNamespaces);
        this.SettingCollection[this.EnableNamespaceDiagnostics] = this.getSetting(this.EnableNamespaceDiagnostics);
        this.SettingCollection[this.NamespaceMandatory] = this.getSetting(this.NamespaceMandatory);
        this.SettingCollection[this.MaxNamespaceSize] = this.getSetting(this.MaxNamespaceSize);
        this.SettingCollection[this.URLForwardingRules] = this.getSetting(this.URLForwardingRules);
        this.SettingCollection[this.ShowRegionsOnStatusBar] = this.getSetting(this.ShowRegionsOnStatusBar);
    }

    public static GetConfigSettings(ResourceUri: vscode.Uri) {
        this.getConfigSettings(ResourceUri);

        return this.SettingCollection;
    }
}