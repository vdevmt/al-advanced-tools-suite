//#region String
export function toPascalCase(text: string): string {
    if (text) {
        return text
            .replace(/([-_. ]+)([a-z])/g, (_, __, letter) => letter.toUpperCase())      // Uppercase after separators
            .replace(/^[a-z]/, letter => letter.toUpperCase())                          // Uppercase first letter
            .replace(/[-_.,;/&%\/()/" ]+/g, '');                                        // Remove separators and special characters
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

export function removeQuotes(text: string): string {
    return text.replace(/"/g, '');
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
            'Interface',
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

export function getObjectTypeSortingKey(objectType: string): number {
    if (objectType) {
        switch (objectType.toLowerCase()) {
            case 'tabledata':
                return 0;

            case 'table':
                return 10;

            case 'tableextension':
                return 15;

            case 'page':
                return 20;

            case 'pageextension':
                return 25;

            case 'codeunit':
                return 30;

            case 'report':
                return 40;

            case 'reportextension':
                return 45;

            case 'xmlport':
                return 50;

            case 'query':
                return 60;

            case 'enum':
                return 70;

            case 'enumextension':
                return 75;

            case 'profile':
                return 80;

            case 'profileextension':
                return 85;

            case 'permissionset':
                return 90;

            case 'permissionsetextension':
                return 95;

            case 'interface':
                return 98;

        }
    }

    return 99;
}

//#endregion AL Obejct Type