import {
    searchCaseFile,
    searchCaseFileConfig,
} from '@/lib/ai/tools/searchCaseFile';
import {
    searchPolicyStore,
    searchPolicyStoreConfig,
} from '@/lib/ai/tools/searchPolicyStore';
import {
    amendCaseRecord,
    amendCaseRecordConfig,
} from '@/lib/ai/tools/amend-case-record';
import {
    getMultipleCaseFileDocuments,
    getMultipleCaseFileDocumentsConfig,
} from '@/lib/ai/tools/getCaseFileDocument/get-casefile-document';
import {
    getCaseFileDocumentIndex,
    getCaseFileDocumentIndexConfig,
} from '@/lib/ai/tools/getCaseFileDocument/get-casefile-document-index';
import {
    SEQUENTIAL_THINKING_TOOL_NAME,
    sequentialThinkingCallback,
    sequentialThinkingCallbackConfig,
} from '@/lib/ai/tools/sequentialthinking/tool-callback';
import {
    pingPongToolCallback,
    pingPongToolConfig,
} from '@/lib/ai/tools/ping-pong';
import {
    createTodoCallback,
    createTodoConfig,
    getTodosCallback,
    getTodosConfig,
    updateTodoCallback,
    updateTodoConfig,
    toggleTodoCallback,
    toggleTodoConfig,
} from '@/lib/ai/tools/todo';
import {
    addOpenQuestionCallback,
    addOpenQuestionConfig,
    appendSessionLogCallback,
    appendSessionLogConfig,
    appendTaskCallback,
    appendTaskConfig,
    compactWorkspaceCallback,
    compactWorkspaceConfig,
    getCaseWorkspace,
    getCaseWorkspaceConfig,
    readWorkspaceFileCallback,
    readWorkspaceFileConfig,
    updateOpenQuestionStatusCallback,
    updateOpenQuestionStatusConfig,
    updateTaskDetailsCallback,
    updateTaskDetailsConfig,
    updateTaskStatusCallback,
    updateTaskStatusConfig,
    upsertDocumentSummaryCallback,
    upsertDocumentSummaryConfig,
} from '@/lib/ai/tools/case-workspace/tool-callbacks';

export type MinimalRegisterTool = (
    name: string,
    config: unknown,
    handler: (input: unknown) => unknown
) => void;

export type MinimalMcpToolServer = {
    registerTool: MinimalRegisterTool;
};

type ToolHandler = (input: unknown) => unknown;

type ToolDefinition = {
    name: string;
    config: unknown;
    handler: ToolHandler;
};

const toolDefinitions: ToolDefinition[] = [
    {
        name: 'playPingPong',
        config: pingPongToolConfig,
        handler: pingPongToolCallback as ToolHandler,
    },
    {
        name: 'searchPolicyStore',
        config: searchPolicyStoreConfig,
        handler: searchPolicyStore as ToolHandler,
    },
    {
        name: 'searchCaseFile',
        config: searchCaseFileConfig,
        handler: searchCaseFile as ToolHandler,
    },
    {
        name: 'getMultipleCaseFileDocuments',
        config: getMultipleCaseFileDocumentsConfig,
        handler: getMultipleCaseFileDocuments as ToolHandler,
    },
    {
        name: 'getCaseFileDocumentIndex',
        config: getCaseFileDocumentIndexConfig,
        handler: getCaseFileDocumentIndex as ToolHandler,
    },
    {
        name: 'amendCaseFileDocument',
        config: amendCaseRecordConfig,
        handler: amendCaseRecord as ToolHandler,
    },
    {
        name: SEQUENTIAL_THINKING_TOOL_NAME,
        config: sequentialThinkingCallbackConfig,
        handler: sequentialThinkingCallback as ToolHandler,
    },
    {
        name: 'createTodo',
        config: createTodoConfig,
        handler: createTodoCallback as ToolHandler,
    },
    {
        name: 'getTodos',
        config: getTodosConfig,
        handler: getTodosCallback as ToolHandler,
    },
    {
        name: 'updateTodo',
        config: updateTodoConfig,
        handler: updateTodoCallback as ToolHandler,
    },
    {
        name: 'toggleTodo',
        config: toggleTodoConfig,
        handler: toggleTodoCallback as ToolHandler,
    },
    {
        name: 'getCaseWorkspace',
        config: getCaseWorkspaceConfig,
        handler: getCaseWorkspace as ToolHandler,
    },
    {
        name: 'readWorkspaceFile',
        config: readWorkspaceFileConfig,
        handler: readWorkspaceFileCallback as ToolHandler,
    },
    {
        name: 'appendWorkspaceTask',
        config: appendTaskConfig,
        handler: appendTaskCallback as ToolHandler,
    },
    {
        name: 'updateWorkspaceTaskStatus',
        config: updateTaskStatusConfig,
        handler: updateTaskStatusCallback as ToolHandler,
    },
    {
        name: 'updateWorkspaceTaskDetails',
        config: updateTaskDetailsConfig,
        handler: updateTaskDetailsCallback as ToolHandler,
    },
    {
        name: 'upsertWorkspaceDocumentSummary',
        config: upsertDocumentSummaryConfig,
        handler: upsertDocumentSummaryCallback as ToolHandler,
    },
    {
        name: 'addOpenQuestion',
        config: addOpenQuestionConfig,
        handler: addOpenQuestionCallback as ToolHandler,
    },
    {
        name: 'updateOpenQuestionStatus',
        config: updateOpenQuestionStatusConfig,
        handler: updateOpenQuestionStatusCallback as ToolHandler,
    },
    {
        name: 'appendWorkspaceSessionLog',
        config: appendSessionLogConfig,
        handler: appendSessionLogCallback as ToolHandler,
    },
    {
        name: 'compactWorkspace',
        config: compactWorkspaceConfig,
        handler: compactWorkspaceCallback as ToolHandler,
    },
];

export const registerAppMcpTools = (server: MinimalMcpToolServer): void => {
    for (const tool of toolDefinitions) {
        server.registerTool(tool.name, tool.config, tool.handler);
    }
};
