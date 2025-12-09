export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}
export interface ResourceDefinition {
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
}
export interface PromptDefinition {
    name: string;
    description: string;
    arguments?: {
        name: string;
        description: string;
        required?: boolean;
    }[];
}
export interface ToolResult {
    content: {
        type: 'text';
        text: string;
    }[];
    isError?: boolean;
}
export interface ResourceContent {
    uri: string;
    mimeType: string;
    text: string;
}
export interface PromptMessage {
    role: 'user' | 'assistant';
    content: {
        type: 'text';
        text: string;
    };
}
//# sourceMappingURL=mcp.d.ts.map