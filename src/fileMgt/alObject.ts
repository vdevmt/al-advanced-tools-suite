import * as vscode from 'vscode';
import * as alFileMgr from './alFileMgr';
import * as alRegionMgr from '../regions/regionMgr';

export class ALObject {
    public objectType: string;
    public objectId: string;
    public objectName: string;
    public extendedObjectName: string;
    public extendedObjectId: string;
    public objectNamespace: string;
    public objectContentText: string;
    public objectFileName: string;

    constructor(content: string, fileName: string) {
        this.initObjectProperties();
        this.objectContentText = content;
        this.objectFileName = fileName;

        if (this.objectContentText) {
            this.loadObjectProperties();
        }
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.extendedObjectId = "";
        this.extendedObjectName = "";
        this.objectNamespace = "";
    }

    private loadObjectProperties(): any {
        this.initObjectProperties();

        // Clean file content            
        var objectTxt = alFileMgr.cleanObjectFileContent(this.objectContentText);

        // Detect Object Type
        var patternObjectType = new RegExp('(codeunit |page |pagecustomization |pageextension |reportextension |permissionset |permissionsetextension |profile |query |report |requestpage |table |tableextension |xmlport |enum |enumextension |controladdin |interface |entitlement)', "i");
        let ObjectTypeArr = objectTxt.match(patternObjectType);
        if (!ObjectTypeArr) {
            return null;
        }

        const objectType = ObjectTypeArr[0].trim().toLowerCase();
        var ObjectNamePattern = '"[^"]*"'; // All characters except "
        var ObjectNameNoQuotesPattern = '[\\w]*';

        switch (objectType) {
            case 'page':
            case 'codeunit':
            case 'query':
            case 'report':
            case 'requestpage':
            case 'table':
            case 'xmlport':
            case 'permissionset':
            case 'enum': {

                var patternObject = new RegExp(`(${ObjectTypeArr[0].trim().toLowerCase()}) +([0-9]+) +(${ObjectNamePattern}|${ObjectNameNoQuotesPattern})([^"\n]*"[^"\n]*)?`, "i");
                let currObject = objectTxt.match(patternObject);
                if (currObject === null) {
                    vscode.window.showErrorMessage(`File '${this.objectFileName}' does not have valid object name. Maybe it got double quotes (") in the object name?`);
                    return null;
                }

                this.objectType = currObject[1];
                this.objectId = currObject[2];
                this.objectName = currObject[3];

                break;
            }
            case 'pageextension':
            case 'tableextension':
            case 'reportextension':
            case 'permissionsetextension':
            case 'enumextension': {
                var patternObject = new RegExp(`(${ObjectTypeArr[0].trim().toLowerCase()}) +([0-9]+) +(${ObjectNamePattern}|${ObjectNameNoQuotesPattern}) +extends +(${ObjectNamePattern}|${ObjectNameNoQuotesPattern})\\s*(\\/\\/\\s*)?([0-9]+)?`, "i");
                let currObject = objectTxt.match(patternObject);
                if (currObject === null) {
                    vscode.window.showErrorMessage(`File '${this.objectFileName}' does not have valid object name. Maybe it got double quotes (") in the object name?`);
                    return null;

                }

                this.objectType = currObject[1];
                this.objectId = currObject[2];
                this.objectName = currObject[3];
                this.extendedObjectName = currObject[4];
                this.extendedObjectId = currObject[6] ? currObject[6] : '';

                break;
            }
            case 'entitlement':
            case 'interface': {
                var patternObject = new RegExp(`(${objectType})( +"?[ a-zA-Z0-9._/&-]+"?)`, "i");
                let currObject = objectTxt.match(patternObject);

                this.objectType = currObject[1];
                this.objectName = currObject[2];

                break;
            }
            case 'profile': {

                var patternObject = new RegExp('(profile)( +"?[ a-zA-Z0-9._/&-]+"?)', "i");
                let currObject = objectTxt.match(patternObject);

                this.objectType = currObject[1];
                this.objectName = currObject[2];

                break;
            }
            case 'controladdin': {
                var patternObject = new RegExp('(controladdin)( +"?[ a-zA-Z0-9._/&-]+"?)', "i");
                let currObject = objectTxt.match(patternObject);

                this.objectType = currObject[1];
                this.objectName = currObject[2];

                break;
            }
            case 'pagecustomization': {

                var patternObject = new RegExp(`(${ObjectTypeArr[0].trim().toLowerCase()})( +"?[ a-zA-Z0-9._/&-]+"?) +customizes( +"?[ a-zA-Z0-9._&-]+\\/?[ a-zA-Z0-9._&-]+"?) (\\/\\/+ *)?([0-9]+)?`, "i");
                let currObject = objectTxt.match(patternObject);

                this.objectType = currObject[1];
                this.objectName = currObject[2];
                this.extendedObjectName = currObject[3];
                this.extendedObjectId = currObject[5] ? currObject[5] : '';

                break;
            }
            default: {
                vscode.window.showErrorMessage('Not able to parse this file');

                return null;
            }
        }
        var patternObject = new RegExp('namespace\\s+([A-Za-z0-9_.]+?)\\s*;', "i");
        var match = objectTxt.match(patternObject);
        if (match && match[1]) {
            this.objectNamespace = match[1];
        }
        this.objectType = this.objectType.trim().toString();
        this.objectId = this.objectId.trim().toString();
        this.objectName = this.objectName.trim().toString().replace(/["]/g, '');
        this.extendedObjectName = this.extendedObjectName.trim().toString().replace(/["]/g, '');
        this.extendedObjectId = this.extendedObjectId.trim().toString();
        this.objectNamespace = this.objectNamespace.trim().toString().replace(/["]/g, '');

        if (!(alFileMgr.IsValidALObjectType(this.objectType))) {
            this.initObjectProperties();
            return null;
        }
    }
}

export class ALObjectFields {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public fields: { id?: number, name: string, type?: string, sourceExpr?: string, startLine: number }[];

    constructor(alObject: ALObject) {
        this.initObjectProperties();
        this.objectType = alObject.objectType;
        this.objectId = alObject.objectId;
        this.objectName = alObject.objectName;

        this.findObjectFields(alObject);
        this.elementsCount = this.fields ? this.fields.length : 0;
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.fields = [];
    }

    private findObjectFields(alObject: ALObject) {
        if (alObject) {
            let validObjectType = ['table', 'tableextension', 'page', 'pageextension'];

            if (validObjectType.includes(alObject.objectType)) {
                if (alObject.objectContentText) {
                    const lines = alObject.objectContentText.split('\n');
                    let insideMultiLineComment: boolean;

                    lines.forEach((lineText, linePos) => {
                        const lineNumber = linePos;

                        // Verifica inizio-fine commento multi-riga
                        if (alFileMgr.isMultiLineCommentStart(lineText)) {
                            insideMultiLineComment = true;
                        }
                        if (alFileMgr.isMultiLineCommentEnd(lineText)) {
                            insideMultiLineComment = false;
                        }

                        // Se la riga è dentro un commento multi-linea o è un commento su singola riga, ignorala
                        if (insideMultiLineComment || alFileMgr.isCommentedLine(lineText)) {
                            return; // Ignora questa riga
                        }

                        let tableField: { id: number, name: string, type: string };
                        tableField = { id: 0, name: '', type: '' };
                        if (alFileMgr.isTableFieldDefinition(lineText, tableField)) {
                            this.fields.push({
                                id: tableField.id,
                                name: tableField.name,
                                type: tableField.type,
                                startLine: lineNumber
                            });

                            return;
                        }

                        let pageField: { name: string, sourceExpr: string };
                        pageField = { name: '', sourceExpr: '' };
                        if (alFileMgr.isPageFieldDefinition(lineText, pageField)) {
                            this.fields.push({
                                id: 0,
                                name: pageField.name,
                                sourceExpr: pageField.sourceExpr,
                                startLine: lineNumber
                            });

                            return;
                        }
                    });

                    if (this.fields) {
                        if (this.fields.length > 0) {
                            // Order by StartLine
                            this.fields.sort((a, b) => a.startLine - b.startLine);
                        }
                    }
                }
            }
        }
    }
}
export class ALObjectProcedures {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public procedures: { name: string, startLine: number }[];

    constructor(alObject: ALObject) {
        this.initObjectProperties();
        this.objectType = alObject.objectType;
        this.objectId = alObject.objectId;
        this.objectName = alObject.objectName;

        this.findObjectProcedures(alObject);
        this.elementsCount = this.procedures ? this.procedures.length : 0;
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.procedures = [];
    }

    private findObjectProcedures(alObject: ALObject) {
        if (alObject.objectContentText) {
            const lines = alObject.objectContentText.split('\n');
            let insideMultiLineComment: boolean;

            lines.forEach((lineText, linePos) => {
                const lineNumber = linePos;

                // Verifica inizio-fine commento multi-riga
                if (alFileMgr.isMultiLineCommentStart(lineText)) {
                    insideMultiLineComment = true;
                }
                if (alFileMgr.isMultiLineCommentEnd(lineText)) {
                    insideMultiLineComment = false;
                }

                // Se la riga è dentro un commento multi-linea o è un commento su singola riga, ignorala
                if (insideMultiLineComment || alFileMgr.isCommentedLine(lineText)) {
                    return; // Ignora questa riga
                }
                const procedureName = alFileMgr.isProcedureDefinition(lineText);
                if (procedureName) {
                    this.procedures.push({ name: procedureName, startLine: lineNumber });
                    return;
                }
            });

            if (this.procedures) {
                if (this.procedures.length > 0) {
                    // Order by StartLine
                    this.procedures.sort((a, b) => a.startLine - b.startLine);
                }
            }
        }
    }
}
export class ALObjectRegions {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public regions: {
        name: string;
        startLine: number;
        endLine?: number;
        level?: number;
    }[];

    constructor(alObject: ALObject) {
        this.initObjectProperties();
        this.objectType = alObject.objectType;
        this.objectId = alObject.objectId;
        this.objectName = alObject.objectName;

        this.findObjectRegions(alObject);
        this.elementsCount = this.regions ? this.regions.length : 0;
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.regions = [];
    }

    private findObjectRegions(alObject: ALObject) {
        if (alObject.objectContentText) {
            const lines = alObject.objectContentText.split('\n');
            const stack: { name: string; startLine: number }[] = [];

            lines.forEach((lineText, linePos) => {
                const lineNumber = linePos;
                if (alRegionMgr.isRegionStartLine(lineText)) {
                    let name = alRegionMgr.getRegionName(lineText);
                    stack.push({ name, startLine: lineNumber });
                    return;
                }

                if (alRegionMgr.isRegionEndLine(lineText)) {
                    if (stack.length > 0) {

                        const lastRegion = stack.pop();
                        if (lastRegion) {
                            const level = stack.length;

                            this.regions.push({
                                name: lastRegion.name,
                                startLine: lastRegion.startLine,
                                endLine: lineNumber,
                                level: level
                            });
                        }
                    }
                }
            });

            if (this.regions.length > 0) {
                // Order by StartLine
                this.regions.sort((a, b) => a.startLine - b.startLine);
            }
        }
    }
}