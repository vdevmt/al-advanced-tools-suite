import * as vscode from 'vscode';

export async function execAlPackage(refreshTranslations: boolean): Promise<Boolean> {
    if (checkExtensionInstalled('ms-dynamics-smb.al')) {
        await vscode.commands.executeCommand('al.package');

        if (refreshTranslations) {
            refreshAllTranslationFiles();
        }

        return true;
    }

    return false;
}

export async function refreshAllTranslationFiles(): Promise<Boolean> {
    try {
        if (checkExtensionInstalled('nabsolutions.nab-al-tools')) {
            await vscode.commands.executeCommand('nab.RefreshXlfFilesFromGXlf');
            return true;
        }
    }
    catch {
        return false;
    }

    return false;
}

function checkExtensionInstalled(extensionId: string): boolean {
    // Verifica se l'estensione è installata
    const externalExtension = vscode.extensions.getExtension(extensionId);
    if (externalExtension) {
        if (externalExtension.isActive) {
            return true;
        }
    }

    return false;
}


