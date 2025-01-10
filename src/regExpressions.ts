// Comments
export const singleLineComment = /\/\/.*$/; // Commenti su singola riga (//)
export const multiLineCommentStart = /\/\*/; // Inizio commento multi-linea (/*)
export const multiLineCommentEnd = /\*\//;   // Fine commento multi-linea (*/)

// Table
export const tableField = /^field\( *(\d+) *; *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-\[\]]+ *)\)/i;
// Page
export const pageField = /^field\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;
export const pageActionArea = /^area\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageAction = /^action\("?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;
export const pageActionRef = /^actionref\("?([ a-zA-Z0-9._/&%\/()-]+)"?\s*;\s*"?([ a-zA-Z0-9._/&%\/()-]+)"?\)/i;

// Report
export const reportColumn = /^column\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;
export const reportDataItem = /^dataitem\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;

// Query
export const queryColumn = /^column\( *"?([ a-zA-Z0-9._/&%\/()-]+)"? *; *([" a-zA-Z0-9._/&%\/()-]+ *)\)/i;

// Procedure
export const procedure = /^(local|internal)?\s*procedure\s+([a-zA-Z_][a-zA-Z0-9_]*)\(/i;
export const integrationEventDef = /^\s*\[IntegrationEvent\(/i;
export const businessEventDef = /^\s*\[BusinessEvent\(/i;
export const eventSubscriber = /^\[EventSubscriber\(\s*ObjectType::([^,]+),\s*([^:]+::"?[^,]+"?|[0-9]+),\s*'([^']+)',\s*'(.*?)',\s*(true|false),\s*(true|false)\s*\)\]/i;