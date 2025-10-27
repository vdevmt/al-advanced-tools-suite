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
        if (isNABToolsExtensionInstalled()) {
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

function isNABToolsExtensionInstalled(): boolean {
    if (checkExtensionInstalled('nabsolutions.nab-al-tools')) {
        return true;
    }

    return false;
}

export function isCRSExtensionInstalled(): boolean {
    if (checkExtensionInstalled('waldo.crs-al-language-extension')) {
        return true;
    }

    return false;
}


