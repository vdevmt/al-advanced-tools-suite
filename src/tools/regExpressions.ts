// Comments
export const singleLineComment = /^\s*\/\/.*$/; // Commenti su singola riga (//)
export const multiLineCommentStart = /\/\*/; // Inizio commento multi-linea (/*)
export const multiLineCommentEnd = /\*\//;   // Fine commento multi-linea (*/)
export const pragmaDirective = /^#pragma/i; // 

// Table
export const tableTrigger = /^trigger\s+(OnInsert|OnModify|OnDelete|OnRename)\s*\(.*\)/i;
export const tableField = /^field\( *(\d+) *; *("?[ a-zA-Z0-9._/&%\/()-]+"?) *; *([" a-zA-Z0-9._/&%\/()-\[\]]+ *)\)/i;
export const tableExtField = /^modify\( *("?[ a-zA-Z0-9._/&%\/()-]+"?) *\)/i;
export const tableFieldDefinition = /field\s*\(\s*(\d+)\s*;\s*([^;]+)\s*;\s*([^)]*)\)\s*\{([\s\S]+?)\}/gi;
export const tableExtFieldDefinition = /modify\s*\(\s*([^;]+)\s*\)\s*\{([\s\S]+?)\}/gi;
export const tableFieldTrigger = /^trigger\s+(OnValidate|OnLookup|OnBeforeValidate|OnAfterValidate)\s*\(.*\)/i;
export const tableKey = /^key\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-,]+ *)\)/i;
export const tableKeyDefinition = /key\s*\(\s*([^;]+)\s*;\s*([^)]*)\)\s*\{([\s\S]*?)\}/gi;
export const tableFieldGroupDefinition = /fieldgroup\s*\(\s*([^;]+)\s*;\s*([^)]*)\)\s*\{([\s\S]*?)\}/gi;

// Page
export const pageTrigger = /^trigger\s+(OnOpenPage|OnInit|OnAfterGetRecord|OnAfterGetCurrRecord|OnClosePage|OnQueryClosePage|OnInsertRecord|OnModifyRecord|OnDeleteRecord|OnClosePage|OnNewRecord|OnPageBackgroundTaskCompleted|OnPageBackgroundTaskError|OnFindRecord|OnNextRecord)\s*\(.*\)/i;
export const pageField = /^field\( *("?[ a-zA-Z0-9._/&%\/()-]+"?) *; *([" a-zA-Z0-9._/&%\/()-\[\]]+ *)\)/i;
export const pageExtField = /^modify\( *("?[ a-zA-Z0-9._/&%\/()-]+"?) *\)/i;
export const pageFieldDefinition = /field\s*\(\s*([^;]+)\s*;\s*([" a-zA-Z0-9._/&%\/()-\[\]]+ *)\)\s*\{([\s\S]+?)\}/gi;
export const pageFieldTrigger = /^trigger\s+(OnValidate|OnLookup|OnDrillDown|OnControlAddIn|OnAssistEdit|OnAfterLookup|OnBeforeValidate|OnAfterValidate|OnAfterAfterLookup)\s*\(.*\)/i;
export const pageFieldArea = /^area\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageFieldGroup = /^(group|repeater|cuegroup|fixed|grid)\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageFieldAnchor = /^(addafter|addbefore|addfirst|addlast)\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageActionArea = /^area\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageActionAnchor = /^(addafter|addbefore|addfirst|addlast)\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageActionGroup = /^group\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageCueGroup = /^cuegroup\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageAction = /^action\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageActionRef = /^actionref\("?([ a-zA-Z0-9._/&%\/()-]+)"?\s*;\s*"?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;

// Report
export const reportTrigger = /^trigger\s+(OnInitReport|OnPreReport|OnPostReport)\s*\(.*\)/i;
export const reportColumn = /^column\( *("?[ a-zA-Z0-9._/&%\/()-]+"?) *; *([" a-zA-Z0-9._/&%\/()-\[\]]+ *)\)/i;
export const reportDataItem = /^dataitem\( *("?[ a-zA-Z0-9._/&%\/()-]+"?) *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;
export const reportDataitemDefinition = /dataitem\s*\(\s*([^;]+)\s*;\s*([^;]+)\s*\)\s*\{([\s\S]+?)\}/gi;
export const reportDataitemTrigger = /^trigger\s+(OnPreDataItem|OnAfterGetRecord|OnPostDataItem)\s*\(.*\)/i;
export const reportReqPageField = /^field\( *("?[ a-zA-Z0-9._/&%\/()-]+"?) *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;
export const reportColumnDefinition = /column\s*\(\s*([^;]+)\s*;\s*([^;]+)\s*\)\s*\{([\s\S]+?)\}/gi;

// Query
export const queryDataItem = /^dataitem\( *("?[ a-zA-Z0-9._/&%\/()-]+"?) *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;
export const queryDataitemDefinition = /dataitem\s*\(\s*([^;]+)\s*;\s*([^;]+)\s*\)\s*\{([\s\S]+?)\}/gi;
export const queryTrigger = /^trigger\s+(OnBeforeOpen)\s*\(.*\)/i;
export const queryColumn = /^(column|filter)\( *("?[ a-zA-Z0-9._/&%\/()-]+"?) *; *([" a-zA-Z0-9._/&%\/()-\[\]]+ *)\)/i;
export const queryColumnDefinition = /(column|filter)\s*\(\s*([^;]+)\s*;\s*([^;]+)\s*\)\s*\{([\s\S]+?)\}/gi;

// Codeunit
export const codeunitTrigger = /^trigger\s+(OnRun|OnInstallAppPerCompany|OnInstallAppPerDatabase)\s*\(.*\)/i;

// Procedure
export const procedure = /^(local|internal|protected)?\s*procedure\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?\(/i;
export const integrationEvent = /^\s*\[IntegrationEvent\(/i;
export const integrationEventDefinition = /\[(IntegrationEvent\(([^)]+)\))\]\s*(local|internal|)\s*procedure\s+(\w+)\(([^)]*)\)/i;
export const businessEvent = /^\s*\[BusinessEvent\(/i;
export const eventSubscriber = /^\[EventSubscriber\(\s*ObjectType::([^,]+),\s*([^:]+::"?[^,]+"?|[0-9]+),\s*'([^']+)',\s*'(.*?)',\s*(true|false),\s*(true|false)\s*\)\]/i;

// Variables
export const variable = /^\s*(?:var\s+)?(\w+)\s*:\s*(\w+)(?:\s+(?:"([^"]+)"|[\w\s,]+))?(?:\[(\d+)\])?(?:\s+(temporary))?\s*;?\s*/gmi;
export const label = /^\s*(\w+)\s*:\s*(Label)\s+'((?:''|[^'])*)'?(.*);/gim;
export const array = /^\s*(?:var\s+)?(\w+)\s*:\s*Array\s*\[(\d+(?:,\s*\d+)*)\]\s*of\s+([^;]+)/gmi;
export const listDictionary = /^\s*(?:var\s+)?(\w+)\s*:\s*(List|Dictionary)(?:\[(\d+(?:,\s*\d+)*)\])?\s*of\s*\[(.*?)\]\s*;?\s*/gmi;

// Object Properties
export const objectProperties = /(\w+)\s*=\s*([^;]+);/g;

// Other Expression
export const singleWord = /^\w+$/;