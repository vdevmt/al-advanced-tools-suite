import * as vscode from 'vscode';
import * as alFileMgr from './alObjectFileMgr';
import * as typeHelper from '../typeHelper';
import { CRSSettings } from '../settings/crsSettings';

//#region AL Object Definition
export class ALObject {
    public objectType: string;
    public objectTypeIndex: number;
    public objectId: string;
    public objectName: string;
    public description: string;
    public sourceTableName: string;
    public extendedObjectName?: string;
    public extendedObjectId?: string;
    public objectNamespace?: string;
    public objectContentText?: string;
    public objectFileName?: string;
    public objectFileUri?: vscode.Uri;
    public properties: { [key: string]: string };
    public sortKey: string;

    constructor(document: vscode.TextDocument, loadAllInfos: boolean) {
        this.initObjectProperties();
        this.objectContentText = '';
        this.objectFileName = '';
        this.objectFileUri = null;

        if (document) {
            if (alFileMgr.isALObjectDocument(document)) {
                this.objectContentText = document.getText();
                this.objectFileName = document.fileName;
                this.objectFileUri = document.uri;

                if (this.objectContentText) {
                    this.loadObjectProperties(loadAllInfos);
                }

                if (!loadAllInfos) {
                    this.objectContentText = '';
                }
            }
        }
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectTypeIndex = 0;
        this.objectId = "";
        this.objectName = "";
        this.description = "";
        this.sourceTableName = "";
        this.sortKey = "";
        this.extendedObjectId = "";
        this.extendedObjectName = "";
        this.objectNamespace = "";
        this.properties = {};
    }

    private loadObjectProperties(loadAllInfos: boolean): any {
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

        this.objectType = typeHelper.objectTypeToPascalCase(this.objectType.trim());
        if (alFileMgr.IsValidALObjectType(this.objectType)) {
            this.objectId = this.objectId.trim().toString();
            this.objectName = this.objectName.trim().toString().replace(/["]/g, '');
            this.extendedObjectName = this.extendedObjectName.trim().toString().replace(/["]/g, '');
            this.extendedObjectId = this.extendedObjectId.trim().toString();
            this.objectNamespace = this.objectNamespace.trim().toString().replace(/["]/g, '');
            this.description = alFileMgr.makeObjectDescriptionText(this.objectType, this.objectId, this.objectName);
            this.objectTypeIndex = typeHelper.getObjectTypeSortingKey(this.objectType);
            this.sortKey = `${this.objectTypeIndex.toString().padStart(10, '0')}${this.objectId?.toString().padStart(10, '0') ?? ''}${this.objectName.toLowerCase()}`;

            if (loadAllInfos) {
                let objectDefTxt = '';
                if (["permissionset", "permissionsetextension", "profile", "controladdin"].includes(this.objectType.toLowerCase())) {
                    objectDefTxt = objectTxt;
                }
                else {
                    objectDefTxt = alFileMgr.extractElementDefinitionFromObjectText(objectTxt, 0, false);
                }

                alFileMgr.findObjectProperties(this.objectType, objectDefTxt, this.properties);

                if (this.isPage()) {
                    if (this.properties['sourcetable']) {
                        this.sourceTableName = this.properties['sourcetable'];
                    }
                }
            }
        }
        else {
            this.initObjectProperties();
            return null;
        }
    }

    public isTable(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'table');
        }

        return false;
    }
    public isTemporaryTable(): boolean {
        if (this.isTable()) {
            if (this.properties['tabletype']) {
                return (this.properties['tabletype'].toLowerCase() === 'temporary');
            }
        }

        return false;
    }
    public isTableExt(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'tableextension');
        }

        return false;
    }
    public isPage(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'page');
        }

        return false;
    }
    public isPageExt(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'pageextension');
        }

        return false;
    }
    public isReport(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'report');
        }

        return false;
    }
    public isReportExt(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'reportextension');
        }

        return false;
    }
    public isCodeunit(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'codeunit');
        }

        return false;
    }
    public isEnum(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'enum');
        }

        return false;
    }
    public isEnumExt(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'enumextension');
        }

        return false;
    }
    public isQuery(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'query');
        }

        return false;
    }
    public isXmlPort(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'xmlport');
        }

        return false;
    }
    public isInterface(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'interface');
        }

        return false;
    }
    public isEntitlement(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'entitlement');
        }

        return false;
    }
    public isControlAddin(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'controladdin');
        }

        return false;
    }
    public isPermissionSet(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'permissionset');
        }

        return false;
    }

    public getDefaultIconName(): string {
        switch (true) {
            case this.isTable(): {
                return 'database';
            }
            case this.isTableExt(): {
                return 'database';
            }
            case this.isCodeunit(): {
                return 'code';
            }
            case this.isPage(): {
                return 'preview';
            }
            case this.isPageExt(): {
                return 'preview';
            }
            case this.isQuery(): {
                return 'graph';
            }
            case this.isReport(): {
                return 'file-pdf';
            }
            case this.isReportExt(): {
                return 'file-pdf';
            }
            case this.isEnum(): {
                return 'symbol-enum';
            }
            case this.isEnumExt(): {
                return 'symbol-enum';
            }
            case this.isXmlPort(): {
                return 'globe';
            }
            case this.isInterface(): {
                return 'symbol-interface';
            }
            case this.isEntitlement(): {
                return 'symbol-interface';
            }
        }

        return 'symbol-misc';
    }
}
//#endregion AL Object Definition

//#region AL Object Fields
export class ALObjectFields {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public fieldsCount: number;
    public fields: {
        id?: number,
        name: string,
        section: string,
        isfield: boolean,
        type?: string,
        externalFieldExt?: boolean,
        pkIndex?: number,
        properties?: { [key: string]: string },
        sourceExpr?: string,
        dataItem?: string,
        level: number,
        iconName?: string,
        startLine: number
    }[];

    constructor(alObject: ALObject | undefined) {
        this.initObjectProperties();

        if (alObject) {
            this.objectType = alObject.objectType;
            this.objectId = alObject.objectId;
            this.objectName = alObject.objectName;

            this.findElements(alObject);
            if (this.fields) {
                this.elementsCount = this.fields.length;
                this.fieldsCount = this.fields.filter(item => item.isfield === true).length;
            }
        }
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.fieldsCount = 0;
        this.fields = [];
    }

    private findElements(alObject: ALObject) {
        if (alObject) {
            switch (true) {
                case (alObject.isTable() || alObject.isTableExt()): {
                    alFileMgr.findTableFields(alObject, this);
                    break;
                }

                case (alObject.isPage() || alObject.isPageExt()): {
                    alFileMgr.findPageFields(alObject, this);
                    break;
                }

                case (alObject.isReport() || alObject.isReportExt()): {
                    alFileMgr.findReportColumns(alObject, this);
                    alFileMgr.findRequestPageFields(alObject, this);
                    break;
                }
                case (alObject.isQuery()): {
                    alFileMgr.findQueryColumns(alObject, this);
                    break;
                }

                default: {
                    alFileMgr.findObjectFields(alObject, this);
                    break;
                }
            }
        }
    }
}
//#endregion AL Object Fields

//#region AL Object Procedures
export class ALObjectProcedures {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public procedures: {
        scope?: string,
        name: string,
        sourceEvent?: string,
        groupName: string,
        iconName?: string,
        regionPath?: string,
        startLine: number
    }[];

    constructor(alObject: ALObject | undefined) {
        this.initObjectProperties();

        if (alObject) {
            this.objectType = alObject.objectType;
            this.objectId = alObject.objectId;
            this.objectName = alObject.objectName;

            this.findElements(alObject);
            this.elementsCount = this.procedures ? this.procedures.length : 0;
        }
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.procedures = [];
    }

    private findElements(alObject: ALObject) {
        if (alObject) {
            alFileMgr.findObjectProcedures(alObject, this);
        }
    }
}
//#endregion AL Object Procedures

//#region AL Object Triggers
export class ALObjectTriggers {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public triggers: {
        scope?: string,
        name: string,
        sortIndex: number,
        groupIndex: number,
        groupName: string,
        iconName?: string,
        startLine: number
    }[];

    constructor(alObject: ALObject | undefined) {
        this.initObjectProperties();

        if (alObject) {
            this.objectType = alObject.objectType;
            this.objectId = alObject.objectId;
            this.objectName = alObject.objectName;

            this.findElements(alObject);
            this.elementsCount = this.triggers ? this.triggers.length : 0;
        }
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.triggers = [];
    }

    private findElements(alObject: ALObject) {

        if (alObject) {
            switch (true) {
                case (alObject.isTable() || alObject.isTableExt()): {
                    alFileMgr.findTableTriggers(alObject, this);
                    break;
                }
                case (alObject.isPage() || alObject.isPageExt()): {
                    alFileMgr.findPageTriggers(alObject, this);
                    break;
                }
                case (alObject.isReport() || alObject.isReportExt()): {
                    alFileMgr.findReportTriggers(alObject, this);
                    break;
                }
                case (alObject.isQuery()): {
                    alFileMgr.findQueryTriggers(alObject, this);
                    break;
                }

                default: {
                    alFileMgr.findObjectTriggers(alObject, this);
                    break;
                }
            }
        }
    }
}
//#endregion AL Object Procedures

//#region AL Object Regions
export class ALObjectRegions {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public regions: {
        name: string;
        startLine: number;
        endLine?: number;
        iconName?: string;
        level?: number;
    }[];

    constructor(alObject: ALObject | undefined) {
        this.initObjectProperties();

        if (alObject) {
            this.objectType = alObject.objectType;
            this.objectId = alObject.objectId;
            this.objectName = alObject.objectName;

            this.findElements(alObject);
            this.elementsCount = this.regions ? this.regions.length : 0;
        }
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.regions = [];
    }

    private findElements(alObject: ALObject) {
        if (alObject) {
            alFileMgr.findObjectRegions(alObject, this);
        }
    }
}
//#endregion AL Object Regions

//#region AL Object Page Actions
export class ALObjectActions {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public actionsCount: number;
    public actions: {
        kind: string,
        name: string,
        level: number,
        sourceAction?: string,
        isAction: boolean,
        area?: string,
        actionGroupRef?: string,
        properties?: { [key: string]: string },
        iconName?: string,
        startLine: number
    }[];

    constructor(alObject: ALObject | undefined) {
        this.initObjectProperties();

        if (alObject) {
            this.objectType = alObject.objectType;
            this.objectId = alObject.objectId;
            this.objectName = alObject.objectName;

            this.findElements(alObject);
            if (this.actions) {
                this.elementsCount = this.actions.length;
                this.actionsCount = this.actions.filter(item => item.isAction === true).length;
            }
        }
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.actionsCount = 0;
        this.actions = [];
    }

    private findElements(alObject: ALObject) {
        if (alObject) {
            switch (true) {
                case (alObject.isPage() || alObject.isPageExt()): {
                    alFileMgr.findPageActions(alObject, this);
                    break;
                }

                case (alObject.isReport() || alObject.isReportExt()): {
                    alFileMgr.findRequestPageActions(alObject, this);
                    break;
                }
            }
        }
    }
}
//#endregion AL Object Page Actions

//#region AL Object Dataitems
export class ALObjectDataItems {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public dataItems: {
        name: string,
        sourceExpression?: string,
        properties?: { [key: string]: string },
        level?: number,
        iconName?: string,
        startLine: number,
        endLine?: number
    }[];

    constructor(alObject: ALObject | undefined) {
        this.initObjectProperties();

        if (alObject) {
            this.objectType = alObject.objectType;
            this.objectId = alObject.objectId;
            this.objectName = alObject.objectName;

            this.findElements(alObject);
            this.elementsCount = this.dataItems ? this.dataItems.length : 0;
        }
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.dataItems = [];
    }

    private findElements(alObject: ALObject) {
        if (alObject) {

            switch (true) {
                case (alObject.isReport() || alObject.isReportExt()): {
                    alFileMgr.findReportDataitems(alObject, this);
                    break;
                }
                case (alObject.isQuery()): {
                    alFileMgr.findQueryDataitems(alObject, this);
                    break;
                }
                default: {
                    alFileMgr.findObjectDataItems(alObject, this);
                    break;
                }
            }
        }
    }
}
//#endregion AL Object Dataitems

//#region AL Table Keys
export class ALTableKeys {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public keys: {
        name: string,
        fieldsList?: string,
        properties?: { [key: string]: string },
        isPrimaryKey: boolean,
        iconName?: string,
        startLine?: number,
        endLine?: number,
    }[];

    constructor(alObject: ALObject | undefined) {
        this.initObjectProperties();

        if (alObject) {
            this.objectType = alObject.objectType;
            this.objectId = alObject.objectId;
            this.objectName = alObject.objectName;

            this.findElements(alObject);
            this.elementsCount = this.keys ? this.keys.length : 0;
        }
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.keys = [];
    }

    private findElements(alObject: ALObject) {
        alFileMgr.findTableKeys(alObject, this);
    }
}
//#endregion AL Table Keys

//#region AL Table Field Groups
export class ALTableFieldGroups {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public fieldgroups: {
        name: string,
        fieldsList?: string,
        properties?: { [key: string]: string },
        iconName?: string,
        startLine?: number,
        endLine?: number,
    }[];

    constructor(alObject: ALObject | undefined) {
        this.initObjectProperties();

        if (alObject) {
            this.objectType = alObject.objectType;
            this.objectId = alObject.objectId;
            this.objectName = alObject.objectName;

            this.findElements(alObject);
            this.elementsCount = this.fieldgroups ? this.fieldgroups.length : 0;
        }
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.fieldgroups = [];
    }

    private findElements(alObject: ALObject) {
        alFileMgr.findTableFieldGroups(alObject, this);
    }
}
//#endregion AL Table Field Groups

//#region AL Object Variables
export class ALObjectVariables {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public variables: {
        name: string,
        type: string,
        subtype?: string,
        value?: string,
        isALObject: boolean,
        size?: number,
        scope: string,
        attributes?: string,
        iconName?: string,
        linePosition: number,
        groupIndex: number,
        groupName: string,
    }[];

    constructor(alObject: ALObject | undefined) {
        this.initObjectProperties();

        if (alObject) {
            this.objectType = alObject.objectType;
            this.objectId = alObject.objectId;
            this.objectName = alObject.objectName;

            this.findElements(alObject);
            this.elementsCount = this.variables ? this.variables.length : 0;
        }
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.variables = [];
    }

    private findElements(alObject: ALObject) {
        alFileMgr.findObjectVariables(alObject, this);
    }

    public getDefaultIconName(variableType: string): string {
        if (variableType) {
            switch (variableType.toLowerCase()) {
                case 'Record'.toLowerCase(): {
                    return 'database';
                }
                case 'RecordRef'.toLowerCase(): {
                    return 'database';
                }
                case 'FieldRef'.toLowerCase(): {
                    return 'database';
                }
                case 'KeyRef'.toLowerCase(): {
                    return 'key';
                }
                case 'Integer'.toLowerCase(): {
                    return 'symbol-number';
                }
                case 'BigInteger'.toLowerCase(): {
                    return 'symbol-number';
                }
                case 'Decimal'.toLowerCase(): {
                    return 'symbol-number';
                }
                case 'Boolean'.toLowerCase(): {
                    return 'symbol-boolean';
                }
                case 'Text'.toLowerCase(): {
                    return 'symbol-string';
                }
                case 'BigText'.toLowerCase(): {
                    return 'symbol-string';
                }
                case 'Code'.toLowerCase(): {
                    return 'symbol-string';
                }
                case 'Char'.toLowerCase(): {
                    return 'text-size';
                }
                case 'DotNet'.toLowerCase(): {
                    return 'symbol-class';
                }
                case 'Label'.toLowerCase(): {
                    return 'symbol-key';
                }

                case 'Array'.toLowerCase(): {
                    return 'array';
                }
                case 'Dictionary'.toLowerCase(): {
                    return 'array';
                }
                case 'List'.toLowerCase(): {
                    return 'array';
                }
                case 'Date'.toLowerCase(): {
                    return 'calendar';
                }
                case 'Time'.toLowerCase(): {
                    return 'timeline-view-icon';
                }
                case 'Duration'.toLowerCase(): {
                    return 'timeline-view-icon';
                }
                case 'Dialog'.toLowerCase(): {
                    return 'layers';
                }
                case 'Guid'.toLowerCase(): {
                    return 'json';
                }

                case 'HttpClient'.toLowerCase(): {
                    return 'globe';
                }
                case 'HttpContent'.toLowerCase(): {
                    return 'globe';
                }
                case 'HttpHeaders'.toLowerCase(): {
                    return 'globe';
                }
                case 'HttpRequestMessage'.toLowerCase(): {
                    return 'globe';
                }
                case 'HttpResponseMessage'.toLowerCase(): {
                    return 'globe';
                }

                case 'JsonObject'.toLowerCase(): {
                    return 'json';
                }
                case 'JsonArray'.toLowerCase(): {
                    return 'json';
                }
                case 'JsonToken'.toLowerCase(): {
                    return 'json';
                }
                case 'JsonValue'.toLowerCase(): {
                    return 'json';
                }

                default: {
                    if (typeHelper.isALObjectType(variableType)) {
                        let tempALObject: ALObject;
                        tempALObject = new ALObject(null, false);
                        tempALObject.objectType = variableType;
                        const objectIconName = tempALObject.getDefaultIconName();
                        return objectIconName || 'symbol-misc';
                    }

                    return 'symbol-value';
                }
            }
        }
    }
}
//#endregion AL Object Variables
