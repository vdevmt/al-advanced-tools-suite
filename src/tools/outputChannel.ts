import * as vscode from 'vscode';

export class ATSOutputChannel {
    private static instance: ATSOutputChannel;
    private readonly channel: vscode.OutputChannel;

    private constructor(name: string) {
        this.channel = vscode.window.createOutputChannel(name);
    }

    /**
     * Singleton accessor — ensures only one instance of the output channel exists.
     */
    public static getInstance(name: string = 'Advanced Tools Suite for AL Language'): ATSOutputChannel {
        if (!ATSOutputChannel.instance) {
            ATSOutputChannel.instance = new ATSOutputChannel(name);
        }
        return ATSOutputChannel.instance;
    }

    public writeInfoMessage(message: string): void {
        this.WriteMessage(`[INFO] ${message}`);
    }

    public writeWarningMessage(message: string): void {
        this.WriteMessage(`[WARNING] ${message}`);
    }

    public writeErrorMessage(message: string, show: boolean = true): void {
        this.WriteMessage(`[ERROR] ${message}`);

        if (show) {
            vscode.window.showErrorMessage(message);
            this.show();
        }
    }

    public WriteMessage(message: string): void {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} `
            + `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        this.channel.appendLine(`[${timestamp}] ${message}`);
    }

    public show(preserveFocus: boolean = true): void {
        this.channel.show(preserveFocus);
    }

    public clear(): void {
        this.channel.clear();
    }

    public dispose(): void {
        this.channel.dispose();
    }
}


