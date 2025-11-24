import * as vscode from 'vscode';

export async function getCurrentGitBranchName(): Promise<string | undefined> {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!gitExtension || !gitExtension.isActive) {
        return undefined;
    }

    const git = gitExtension.exports;
    const api = git.getAPI(1);
    const repo = api.repositories[0];
    return repo?.state?.HEAD?.name;
}

export async function getGitBranchesSignature(): Promise<string | undefined> {
    const gitExtension = vscode.extensions.getExtension<any>('vscode.git');
    if (!gitExtension || !gitExtension.isActive) {
        return undefined;
    }

    const git = gitExtension.exports;
    const api = git.getAPI(1);

    const items = api.repositories.map((repo: any) => {
        const root = repo.rootUri.fsPath;
        const branch = repo.state.HEAD?.name ?? "";
        return `${root}:${branch}`;
    });

    items.sort();
    return items.join("|");
}