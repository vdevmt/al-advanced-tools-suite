import * as vscode from 'vscode';

export class DocumentCacheManager<T> {
    private cachedALObject: T | null = null;
    private cachedAlObjectDocVersion: number = -1;
    private cachedAlObjectDocUri: string = '';

    /**
     * Tenta di recuperare l'oggetto dalla cache. Se il documento è lo stesso
     * e la versione non è cambiata, restituisce l'oggetto in cache.
     * Altrimenti, restituisce null.
    */
    public getCachedALObject(document: vscode.TextDocument): T | null {
        if (
            this.cachedALObject &&
            this.cachedAlObjectDocVersion === document.version &&
            this.cachedAlObjectDocUri === document.uri.toString()
        ) {
            return this.cachedALObject;
        }
        return null;
    }

    /**
     * Imposta un nuovo oggetto nella cache, aggiornando anche l'URI e la versione del documento.
    */
    public setCache(document: vscode.TextDocument, object: T): void {
        this.cachedALObject = object;
        this.cachedAlObjectDocVersion = document.version;
        this.cachedAlObjectDocUri = document.uri.toString();
    }

    public clearCache(): void {
        this.cachedALObject = null;
        this.cachedAlObjectDocVersion = -1;
        this.cachedAlObjectDocUri = '';
    }
}