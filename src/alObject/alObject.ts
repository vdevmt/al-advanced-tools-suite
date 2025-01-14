import * as vscode from 'vscode';
import * as alFileMgr from './alObjectFileMgr';
import * as alRegionMgr from '../regions/regionMgr';

//#region AL Object Definition
export class ALObject {
    public objectType: string;
    public objectId: string;
    public objectName: string;
    public extendedObjectName?: string;
    public extendedObjectId?: string;
    public objectNamespace?: string;
    public objectContentText?: string;
    public objectFileName?: string;

    constructor(document: vscode.TextDocument) {
        this.initObjectProperties();
        this.objectContentText = '';
        this.objectFileName = '';

        if (document) {
            if (alFileMgr.isALObjectDocument(document)) {
                this.objectContentText = document.getText();
                this.objectFileName = document.fileName;

                if (this.objectContentText) {
                    this.loadObjectProperties();
                }
            }
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

    public isTable(): boolean {
        if (this) {
            return (this.objectType.toLowerCase() === 'table');
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
}
//#endregion AL Object Definition

//#region AL Object Fields
export class ALObjectFields {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public fields: { id?: number, name: string, type?: string, sourceExpr?: string, dataItem?: string, iconName?: string, startLine: number }[];

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
            let validObjectType = alObject.isTable() ||
                alObject.isTableExt() ||
                alObject.isPage() ||
                alObject.isPageExt() ||
                alObject.isReport() ||
                alObject.isReportExt() ||
                alObject.isQuery();

            if (validObjectType) {
                if (alObject.objectContentText) {
                    const lines = alObject.objectContentText.split('\n');
                    let insideMultiLineComment: boolean;
                    let dataitemName: string = '';

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

                        if (alObject.isTable() || alObject.isTableExt()) {
                            let tableField: { id: number, name: string, type: string };
                            tableField = { id: 0, name: '', type: '' };
                            if (alFileMgr.isTableFieldDefinition(lineText, tableField)) {
                                this.fields.push({
                                    id: tableField.id,
                                    name: tableField.name,
                                    type: tableField.type,
                                    iconName: 'symbol-field',
                                    startLine: lineNumber
                                });

                                return;
                            }
                        }

                        if (alObject.isPage() || alObject.isPageExt()) {
                            let pageField: { name: string, sourceExpr: string };
                            pageField = { name: '', sourceExpr: '' };
                            if (alFileMgr.isPageFieldDefinition(lineText, pageField)) {
                                this.fields.push({
                                    id: 0,
                                    name: pageField.name,
                                    type: pageField.sourceExpr,
                                    sourceExpr: pageField.sourceExpr,
                                    iconName: 'symbol-field',
                                    startLine: lineNumber
                                });

                                return;
                            }
                        }

                        if (alObject.isReport() || alObject.isReportExt()) {
                            let dataItemInfo: { name: string, sourceExpr: string };
                            dataItemInfo = { name: '', sourceExpr: '' };
                            if (alFileMgr.isReportDataItemDefinition(lineText, dataItemInfo)) {
                                dataitemName = `DataItem: ${dataItemInfo.name} (${dataItemInfo.sourceExpr})`;

                                return;
                            }

                            let reportField: { name: string, sourceExpr: string };
                            reportField = { name: '', sourceExpr: '' };
                            if (alFileMgr.isReportColumnDefinition(lineText, reportField)) {
                                this.fields.push({
                                    id: 0,
                                    name: reportField.name,
                                    type: reportField.sourceExpr,
                                    sourceExpr: reportField.sourceExpr,
                                    dataItem: dataitemName,
                                    iconName: 'symbol-field',
                                    startLine: lineNumber
                                });

                                return;
                            }
                            else {
                                if (alFileMgr.isReportReqPageFieldDefinition(lineText, reportField)) {
                                    this.fields.push({
                                        id: 0,
                                        name: reportField.name,
                                        type: reportField.sourceExpr,
                                        sourceExpr: reportField.sourceExpr,
                                        dataItem: 'requestpage',
                                        iconName: 'symbol-field',
                                        startLine: lineNumber
                                    });

                                    return;
                                }
                            }
                        }
                        if (alObject.isQuery) {
                            let reportField: { name: string, sourceExpr: string };
                            reportField = { name: '', sourceExpr: '' };
                            if (alFileMgr.isQueryColumnDefinition(lineText, reportField)) {
                                this.fields.push({
                                    id: 0,
                                    name: reportField.name,
                                    type: reportField.sourceExpr,
                                    sourceExpr: reportField.sourceExpr,
                                    iconName: 'symbol-field',
                                    startLine: lineNumber
                                });

                                return;
                            }
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
//#endregion AL Object Fields

//#region AL Object Procedures
export class ALObjectProcedures {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public procedures: { scope?: string, name: string, sourceEvent?: string, iconName?: string, regionPath?: string, startLine: number }[];

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
        if (alObject) {
            if (alObject.objectContentText) {
                const lines = alObject.objectContentText.split('\n');
                let insideMultiLineComment: boolean;
                let insideIntOrBusEventDecl: boolean;
                let insideEventSubscription: boolean;
                let eventSubscrName: string = '';

                let alObjectRegions: ALObjectRegions;
                alObjectRegions = new ALObjectRegions(alObject);

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

                    if (alFileMgr.isIntegrationEventDeclaration(lineText) || alFileMgr.isBusinessEventDeclaration(lineText)) {
                        insideIntOrBusEventDecl = true;
                    }
                    else {
                        let eventSubscrInfo: { objectType?: string, objectName?: string, eventName?: string, elementName?: string } = {};
                        if (alFileMgr.isEventSubscriber(lineText, eventSubscrInfo)) {
                            insideEventSubscription = true;
                            eventSubscrName = eventSubscrInfo.elementName ? `${eventSubscrInfo.objectType} ${eventSubscrInfo.objectName}: ${eventSubscrInfo.eventName}_${eventSubscrInfo.elementName}` :
                                `${eventSubscrInfo.objectType} ${eventSubscrInfo.objectName}: ${eventSubscrInfo.eventName} `;
                        }
                        else {
                            let procedureInfo: { scope: string, name: string };
                            procedureInfo = { scope: '', name: '' };
                            if (alFileMgr.isProcedureDefinition(alObject, lineText, procedureInfo)) {
                                let symbol = insideIntOrBusEventDecl ? 'symbol-event' :
                                    insideEventSubscription ? 'plug' :
                                        procedureInfo.scope === 'trigger' ? 'symbol-class' :
                                            procedureInfo.scope === 'global' ? 'symbol-function' :
                                                procedureInfo.scope === 'local' ? 'shield' :
                                                    procedureInfo.scope === 'internal' ? 'symbol-variable' :
                                                        'symbol-function';

                                if (procedureInfo.name) {
                                    const lineRegionPath = alRegionMgr.findOpenRegionsPathByDocLine(alObjectRegions, lineNumber);
                                    this.procedures.push({
                                        scope: procedureInfo.scope,
                                        name: procedureInfo.name,
                                        sourceEvent: insideEventSubscription ? eventSubscrName : '',
                                        iconName: symbol,
                                        regionPath: lineRegionPath,
                                        startLine: lineNumber
                                    });
                                    insideIntOrBusEventDecl = false;
                                    insideEventSubscription = false;
                                }
                            }
                            else {
                                if ((insideIntOrBusEventDecl || insideEventSubscription) && (!lineText.trim().startsWith('['))) {
                                    insideIntOrBusEventDecl = false;
                                    insideEventSubscription = false;
                                }
                            }
                        }
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
        if (alObject) {
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
                                    iconName: 'symbol-number',
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
}
//#endregion AL Object Regions

//#region AL Object Page Actions
export class ALObjectActions {
    public objectType: string;
    public objectId: string;
    public objectName: string;

    public elementsCount: number;
    public actions: { name: string, sourceAction?: string, area?: string, iconName?: string, startLine: number }[];

    constructor(alObject: ALObject) {
        this.initObjectProperties();
        this.objectType = alObject.objectType;
        this.objectId = alObject.objectId;
        this.objectName = alObject.objectName;

        this.findObjectActions(alObject);
        this.elementsCount = this.actions ? this.actions.length : 0;
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.actions = [];
    }

    private findObjectActions(alObject: ALObject) {
        if (alObject) {
            if (alObject.objectContentText) {
                let validObjectType = alObject.isPage() || alObject.isPageExt || alObject.isReport() || alObject.isReportExt();

                if (validObjectType) {
                    const lines = alObject.objectContentText.split('\n');
                    let insideMultiLineComment: boolean;
                    let actionAreaInfo: { name: string } = { name: '' };

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

                        if (!alFileMgr.isActionAreaDefinition(lineText, actionAreaInfo)) {
                            let actionInfo: { name: string, sourceAction: string } = { name: '', sourceAction: '' };

                            if (alFileMgr.isActionDefinition(lineText, actionInfo)) {
                                this.actions.push({
                                    name: actionInfo.name,
                                    sourceAction: actionInfo.sourceAction,
                                    area: actionAreaInfo.name,
                                    iconName: 'symbol-event',
                                    startLine: lineNumber
                                });
                            }
                        }
                    });

                    if (this.actions) {
                        if (this.actions.length > 0) {
                            // Order by StartLine
                            this.actions.sort((a, b) => a.startLine - b.startLine);
                        }
                    }
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
    public dataItems: { name: string, sourceExpression?: string, level?: number, iconName?: string, startLine: number, endLine?: number }[];

    constructor(alObject: ALObject) {
        this.initObjectProperties();
        this.objectType = alObject.objectType;
        this.objectId = alObject.objectId;
        this.objectName = alObject.objectName;

        this.findObjectDataItems(alObject);
        this.elementsCount = this.dataItems ? this.dataItems.length : 0;
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.dataItems = [];
    }

    private findObjectDataItems(alObject: ALObject) {
        if (alObject) {
            if (alObject.objectContentText) {
                let validObjectType = alObject.isReport() || alObject.isReportExt() || alObject.isQuery();
                let insideDataset: boolean;

                if (validObjectType) {
                    const lines = alObject.objectContentText.split('\n');
                    let insideMultiLineComment: boolean;
                    let currentLevel = -1;
                    const stack: {
                        name: string;
                        sourceExpression: string;
                        level: number;
                        startLine: number
                    }[] = [];

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

                        // Verifico di trovarmi nella sezione Dataset
                        if (alObject.isReport() || alObject.isReportExt()) {
                            if (lineText.trim().toLowerCase() === 'dataset') {
                                insideDataset = true;
                            }
                        }
                        if (alObject.isQuery()) {
                            if (lineText.trim().toLowerCase() === 'elements') {
                                insideDataset = true;
                            }
                        }

                        if (insideDataset) {
                            if (lineText.includes("{")) {
                                currentLevel++;
                            }
                            if (lineText.includes("}")) {
                                currentLevel--;
                                if (currentLevel < 0) {
                                    insideDataset = false;
                                    return;
                                }

                                if (stack.length > 0) {
                                    if (stack[stack.length - 1].level === currentLevel) {

                                        const lastEntry = stack.pop();
                                        if (lastEntry) {
                                            this.dataItems.push({
                                                name: lastEntry.name,
                                                sourceExpression: lastEntry.sourceExpression,
                                                level: lastEntry.level,
                                                startLine: lastEntry.startLine,
                                                endLine: lineNumber
                                            });
                                        }
                                    }
                                }
                            }

                            let dataItemInfo: { name: string, sourceExpr: string } = { name: '', sourceExpr: '' };
                            if (alFileMgr.isReportDataItemDefinition(lineText, dataItemInfo)) {
                                stack.push({
                                    name: dataItemInfo.name,
                                    sourceExpression: dataItemInfo.sourceExpr,
                                    level: currentLevel,
                                    startLine: lineNumber
                                });
                            }
                        }
                    });

                    if (this.dataItems) {
                        if (this.dataItems.length > 0) {
                            // Order by StartLine
                            this.dataItems.sort((a, b) => a.startLine - b.startLine);
                        }
                    }
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
    public keys: { name: string, fieldsList: string, isPrimaryKey: boolean, iconName?: string, startLine: number, endLine?: number }[];

    constructor(alObject: ALObject) {
        this.initObjectProperties();
        this.objectType = alObject.objectType;
        this.objectId = alObject.objectId;
        this.objectName = alObject.objectName;

        this.findTableKeys(alObject);
        this.elementsCount = this.keys ? this.keys.length : 0;
    }

    private initObjectProperties() {
        this.objectType = "";
        this.objectId = "";
        this.objectName = "";
        this.elementsCount = 0;
        this.keys = [];
    }

    private findTableKeys(alObject: ALObject) {
        if (alObject) {
            if (alObject.objectContentText) {
                let validObjectType = alObject.isTable() || alObject.isTableExt();
                let insideKeys: boolean = false;
                let primaryKeyFound: boolean;

                if (validObjectType) {
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

                        // Verifico di trovarmi nella sezione Keys
                        if (lineText.trim().toLowerCase() === 'keys') {
                            insideKeys = true;
                            primaryKeyFound = false;
                        }

                        if (insideKeys) {
                            let keyInfo: { name: string, fieldsList: string } = { name: '', fieldsList: '' };
                            if (alFileMgr.isTableKeyDefinition(lineText, keyInfo)) {
                                let isPrimaryKey = false;

                                if (alObject.isTable()) {
                                    if (!primaryKeyFound) {
                                        isPrimaryKey = true;
                                        primaryKeyFound = true;
                                    }
                                }

                                this.keys.push({
                                    name: keyInfo.name,
                                    fieldsList: keyInfo.fieldsList,
                                    isPrimaryKey: isPrimaryKey,
                                    iconName: isPrimaryKey ? 'key' : 'list-ordered',
                                    startLine: lineNumber,
                                    endLine: 0
                                });
                            }
                        }
                    });

                    if (this.keys) {
                        if (this.keys.length > 0) {
                            // Order by StartLine
                            this.keys.sort((a, b) => a.startLine - b.startLine);
                        }
                    }
                }
            }
        }
    }
}
//#endregion AL Table Keys