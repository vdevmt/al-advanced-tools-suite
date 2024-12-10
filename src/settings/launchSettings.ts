import * as vscode from 'vscode';
import * as launchMgr from '../fileMgt/launchMgr';

export class LaunchSettings {
    static readonly WebServer = 'WebServer';
    static readonly WebServerInstance = 'WebServerInstance';
    static readonly WebServerInstancePort = 'WebServerInstancePort';
    static readonly PublicWebBaseUrl = 'PublicWebBaseUrl';
    static readonly Tenant = 'Tenant';
    static readonly DefaultRunObjectType = 'DefaultRunObjectType';
    static readonly DefaultRunObjectId = 'DefaultRunObjectId';
    static readonly SandboxName = 'sandboxName';
    static readonly URL = 'URL';

    private static launchconfig: vscode.WorkspaceConfiguration;
    private static LaunchSettingsCollection = {};

    private static loadDefaultSettings(resourceUri: vscode.Uri) {
        this.launchconfig = launchMgr.getWorkspaceConfigurations(resourceUri);
        this.loadConfinguration(this.launchconfig.configurations[0], true);                    
    }    

    public static LoadDefaultLaunchSettings(ResourceUri: vscode.Uri) {
        this.loadDefaultSettings(ResourceUri);

        return this.LaunchSettingsCollection;
    }    
    
    private static loadConfinguration(configuration: vscode.WorkspaceConfiguration, useForwardingRules: boolean) {
        this.LaunchSettingsCollection[this.WebServer] = configuration.server;
        this.LaunchSettingsCollection[this.WebServerInstance] = configuration.serverInstance;
        this.LaunchSettingsCollection[this.Tenant] = configuration.tenant ? configuration.tenant : "default";
        this.LaunchSettingsCollection[this.DefaultRunObjectType] = configuration.startupObjectType;
        this.LaunchSettingsCollection[this.DefaultRunObjectId] = configuration.startupObjectId;
        this.LaunchSettingsCollection[this.SandboxName] = configuration.sandboxName;
        this.LaunchSettingsCollection[this.URL] = launchMgr.makeBcClientURL(configuration,useForwardingRules,null);
    }

    public static LoadConfinguration(configuration: vscode.WorkspaceConfiguration, useForwardingRules: boolean) {
        this.loadConfinguration(configuration,useForwardingRules);

        return this.LaunchSettingsCollection;
    }
}