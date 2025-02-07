//#region String
export function toPascalCase(text: string): string {
    if (text) {
        return text
            .replace(/([-_ ]+)([a-z])/g, (_, __, letter) => letter.toUpperCase()) // Uppercase after separators
            .replace(/^[a-z]/, letter => letter.toUpperCase())                   // Uppercase first letter
            .replace(/[-_ ]+/g, '');                                             // Remove separators
    }

    return text;
}

export function addQuotesIfNeeded(text: string): string {
    if (text) {
        if (!text.startsWith('"')) {
            const specialChars = /[ #&%\\\/()$;,-]/;

            // Verifica se il testo contiene spazi o caratteri speciali
            if (/\s/.test(text) || specialChars.test(text)) {
                return `"${text}"`;
            }
        }
    }

    return text;
}
//#endregion String

//#region AL Obejct Type
export function objectTypeToPascalCase(objectType: string): string {
    if (objectType) {
        switch (objectType.toLowerCase()) {
            case 'requestpage': {
                return 'RequestPage';
            }
            case 'permissionset': {
                return 'PermissionSet';
            }
            case 'pageextension': {
                return 'PageExtension';
            }
            case 'tableextension': {
                return 'TableExtension';
            }
            case 'reportextension': {
                return 'ReportExtension';
            }
            case 'permissionsetextension': {
                return 'PermissionSetExtension';
            }
            case 'enumextension': {
                return 'EnumExtension';
            }
            case 'controladdin': {
                return 'ControlAddin';
            }
            case 'pagecustomization': {
                return 'PageCustomization';
            }
        }
    }

    return toPascalCase(objectType);
}

export function isALObjectType(text: string): boolean {
    if (text) {
        const alObjectTypeList = ['TableData',
            'Table',
            'Report',
            'Codeunit',
            'XMLport',
            'MenuSuite',
            'Page',
            'Query',
            'System',
            'FieldNumber',
            'PageExtension',
            'TableExtension',
            'Enum',
            'EnumExtension',
            'Profile',
            'ProfileExtension',
            'PermissionSet',
            'PermissionSetExtension',
            'ReportExtension',
            'Record',
            'RecordRef',
            'FieldRef',
            'KeyRef'];
        return alObjectTypeList.some(value => text.toLowerCase().includes(value.toLowerCase()));
    }

    return false;
}
//#endregion AL Obejct Type