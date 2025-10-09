import * as vscode from 'vscode';

export async function getCurrentGitBranchName(): Promise<string | undefined> {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!gitExtension) {
        return undefined; // Git extension not available
    }

    const api = gitExtension.getAPI(1);
    const repo = api.repositories[0];
    return repo?.state?.HEAD?.name;
}
