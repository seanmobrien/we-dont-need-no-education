import { ToolSet } from "ai";
import { ConnectableToolProvider, MCPClient } from "./types";
import z from "zod";


export const clientToolProviderFactory = (): ConnectableToolProvider => {
  const clientSideTools: ToolSet = {
    askConfirmation: {
      description: 'Ask the user for confirmation before proceeding.  Returns an empty string if the user rejects the request, otherwise a confirmation hash.',
      parameters: z.object({ 
        question: z.string().describe('The question or activity for the user to confirm'),
        options: z.array(z.string()).optional().describe('Optional list of options for the user to choose from.  If not set, the user will be asked to confirm or reject.'),
      }),
    },
    openCaseFile: {
      description: 'Opens a case file on the user\'s desktop.  This tool is useful when a ',
      parameters: z.object({
        caseId: z.string().describe('The ID of the case to open.'),
        page: (z.literal('email').or(
          z.literal('call-to-action').or(
            z.literal('call-to-action-response')).or(
                z.literal('email-header')).or(
                  z.literal('key-points')).or(
                    z.literal('notes'))
            ))
            .optional()
            .describe('Optional page of case file to open.  If not set, defaults to email.'),
          confirmation: z.string().optional().describe('Confirmation hash returned by the askConfirmation tool.  If not set, the tool will prompt the user for confirmation.'),
        }),
      },    
  };
  const thisProvider: ConnectableToolProvider = {
    get_mcpClient: () => {      
      return {} as MCPClient;
    },
    get_isConnected: () => true,
    get_tools: () => clientSideTools,
    dispose: () => Promise.resolve(),
    connect: ({}) => Promise.resolve(thisProvider),
  };
  return thisProvider;
};