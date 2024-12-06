// Thanks to Waldo for this class!!

import * as vscode from 'vscode';
import * as alFileMgr from './alFileMgr';


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

    private initObjectProperties(){
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
        if (!ObjectTypeArr){
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

        if (!(this.IsValidObjectType(this.objectType))) {
            this.initObjectProperties();
            return null;
        }        
    }

    private IsValidObjectType(objectType: string): boolean {
        switch (objectType.toLowerCase()) {
            case 'codeunit':
            case 'page':
            case 'pagecustomization':
            case 'pageextension':
            case 'reportextension':
            case 'profile':
            case 'query':
            case 'report':
            case 'requestpage':
            case 'table':
            case 'tableextension':
            case 'xmlport':
            case 'enum':
            case 'enumextension':
            case 'controladdin':
            case 'interface':
            case 'permissionset':
            case 'permissionsetextension':
            case 'entitlement':
                return true;
            default: return false;
        }
    }
}