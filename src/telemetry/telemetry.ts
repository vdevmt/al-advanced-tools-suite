import * as vscode from 'vscode';
import * as store from './store';
import * as appInfo from '../tools/appInfo';
import { ATSSettings } from '../settings/atsSettings';
import { TelemetryReporter } from '@vscode/extension-telemetry';

export class TelemetryClient {
    private static instance: TelemetryClient;
    private readonly appInsightsConnectionString: string;
    private readonly reporter: TelemetryReporter;

    private constructor() {
        this.appInsightsConnectionString = store.appInsightsConnectionString;

        // Inizializza il reporter
        this.reporter = new TelemetryReporter(this.appInsightsConnectionString);
    }

    private static getInstance(): TelemetryClient {
        if (!TelemetryClient.instance) {
            TelemetryClient.instance = new TelemetryClient();
        }
        return TelemetryClient.instance;
    }

    public static async logCommand(commandName: string) {
        try {
            if (this.isEnabled()) {
                const telemetry = TelemetryClient.getInstance();
                telemetry.reporter.sendTelemetryEvent('commandUsed', {
                    command: commandName,
                    extensionVersion: this.getExtVersion(),
                    vscodeVersion: vscode.version,
                    platform: process.platform
                });
            }
        } catch (error) {
            console.log(`Error logging telemetry for command '${commandName}'`);
        }
    }

    private static getExtVersion(): string {
        return vscode.extensions.getExtension('vdevmt.al-advanced-tools-suite')?.packageJSON.version ?? 'unknown';
    }

    private static isEnabled(): boolean {
        const level = (vscode.env as any).telemetryLevel as 'all' | 'error' | 'crash' | 'off' | undefined;
        const isDisabled =
            (typeof level === 'string' ? level === 'off' : ((vscode.env as any).isTelemetryEnabled === false));

        if (isDisabled) { return false; }

        const baseWorkspaceFolder = appInfo.getWorkspaceFolder(undefined);
        const atsSettings = ATSSettings.GetConfigSettings(baseWorkspaceFolder.uri);
        if (atsSettings[ATSSettings.EnableTelemetry]) {
            return true;
        }

        return false;
    }

    public dispose() {
        this.reporter?.dispose();
    }
}