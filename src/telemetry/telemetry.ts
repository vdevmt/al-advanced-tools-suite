import * as vscode from 'vscode';
import * as store from './store';
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

    public static getInstance(): TelemetryClient {
        if (!TelemetryClient.instance) {
            TelemetryClient.instance = new TelemetryClient();
        }
        return TelemetryClient.instance;
    }

    public static logCommand(commandName: string) {
        try {
            if (this.isEnabled()) {
                const telemetry = TelemetryClient.getInstance();

                const extVersion = vscode.extensions.getExtension('vdevmt.al-advanced-tools-suite')?.packageJSON.version ?? 'unknown';
                const vscVersion = vscode.version;
                const platform = process.platform;

                telemetry.reporter.sendTelemetryEvent('commandUsed', {
                    command: commandName,
                    extensionVersion: extVersion,
                    vscodeVersion: vscVersion,
                    platform: platform
                });
            }
        } catch (error) {
            console.log(`Error logging telemetry for command '${commandName}'`);
        }
    }


    private static isEnabled(): boolean {
        const level = (vscode.env as any).telemetryLevel as 'all' | 'error' | 'crash' | 'off' | undefined;
        const isDisabled =
            (typeof level === 'string' ? level === 'off' : ((vscode.env as any).isTelemetryEnabled === false));

        if (isDisabled) { return false; }

        const atsSettings = ATSSettings.GetConfigSettings(null);
        if (atsSettings[ATSSettings.EnableTelemetry]) {
            return true;
        }

        return false;
    }

    public dispose() {
        this.reporter?.dispose();
    }
}