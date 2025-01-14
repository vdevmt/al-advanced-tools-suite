// Comments
export const singleLineComment = /\/\/.*$/; // Commenti su singola riga (//)
export const multiLineCommentStart = /\/\*/; // Inizio commento multi-linea (/*)
export const multiLineCommentEnd = /\*\//;   // Fine commento multi-linea (*/)

// Table
export const tableTrigger = /^trigger\s+(OnInsert|OnModify|OnDelete|OnRename)\s*\(.*\)/i;
export const tableField = /^field\( *(\d+) *; *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-\[\]]+ *)\)/i;
export const tableKey = /^key\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-,]+ *)\)/i;

// Page
export const pageTrigger = /^trigger\s+(OnOpenPage|OnInit|OnAfterGetRecord|OnAfterGetCurrRecord|OnClosePage|OnQueryClosePage|OnInsertRecord|OnModifyRecord|OnDeleteRecord|OnClosePage|OnNewRecord|OnPageBackgroundTaskCompleted|OnPageBackgroundTaskError|OnFindRecord|OnNextRecord)\s*\(.*\)/i;
export const pageField = /^field\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;
export const pageActionArea = /^area\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageAction = /^action\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageActionRef = /^actionref\("?([ a-zA-Z0-9._/&%\/()-]+)"?\s*;\s*"?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;

// Report
export const reportTrigger = /^trigger\s+(OnInitReport|OnPreReport|OnPostReport)\s*\(.*\)/i;
export const reportColumn = /^column\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;
export const reportDataItem = /^dataitem\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;
export const reportReqPageField = /^field\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;

// Query
export const queryDataItem = /^dataitem\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;
export const queryTrigger = /^trigger\s+(OnBeforeOpen)\s*\(.*\)/i;
export const queryColumn = /^(column|filter)\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;

// Codeunit
export const codeunitTrigger = /^trigger\s+(OnRun)\s*\(.*\)/i;

// Procedure
export const procedure = /^(local|internal)?\s*procedure\s+([a-zA-Z_][a-zA-Z0-9_]*)\(/i;
export const integrationEventDef = /^\s*\[IntegrationEvent\(/i;
export const businessEventDef = /^\s*\[BusinessEvent\(/i;
export const eventSubscriber = /^\[EventSubscriber\(\s*ObjectType::([^,]+),\s*([^:]+::"?[^,]+"?|[0-9]+),\s*'([^']+)',\s*'(.*?)',\s*(true|false),\s*(true|false)\s*\)\]/i;