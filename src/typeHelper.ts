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