/**
 * Client-side MCP (Model Context Protocol) Tool Provider Factory
 * ------------------------------------------------------------------
 * Produces a lightweight {@link ConnectableToolProvider} implementation that
 * exposes a curated set of UI‑mediated tools to AI model runtimes on the
 * client. These tools let an agent request user interaction (confirmation)
 * or trigger UI navigation (open a case file) while keeping the transport
 * and connection lifecycle abstracted behind a stable interface.
 *
 * DESIGN GOALS
 * 1. Deterministic: No side effects at construction; the returned provider
 *    reports an already-connected state (`get_isConnected() === true`).
 * 2. Type Safety: Zod schemas define tool parameter contracts so both AI
 *    orchestration and UI layers can validate inputs at runtime and derive
 *    TypeScript types at compile time.
 * 3. Extensibility: Add additional tools by appending entries to the
 *    `clientSideTools` map—each key becomes a callable tool name.
 * 4. Separation of Concerns: The factory does not perform actual MCP socket
 *    or transport work—it returns a stubbed `MCPClient` object. Real
 *    connectivity can be injected later or swapped behind the same surface.
 *
 * TOOLS EXPOSED
 * - askConfirmation
 *   Purpose: Prompt the human user to approve or reject an agent action.
 *   Return Contract (expected by upstream code): A confirmation hash (string)
 *   when accepted, or empty string on denial. (Actual implementation supplied
 *   elsewhere—this factory only declares the shape.)
 *   Parameters:
 *     question (string, required) – The prompt presented to the user.
 *     options (string[]?, optional) – Discrete selection list; absent => simple yes/no.
 *
 * - openCaseFile
 *   Purpose: Instruct the UI to focus/open a particular investigative case
 *   and optionally deep‑link to a specific page/section.
 *   Parameters:
 *     caseId (string, required) – Case identifier.
 *     page (enum?, optional) – One of: 'email', 'call-to-action',
 *       'call-to-action-response', 'email-header', 'key-points', 'notes'.
 *       Defaults to 'email' if omitted.
 *     confirmation (string?, optional) – Hash from prior askConfirmation call;
 *       if absent, UI may re‑prompt for confirmation before navigation.
 *
 * USAGE EXAMPLE
 * ```ts
 * import { clientToolProviderFactory } from '@/lib/ai/mcp/client-tool-provider';
 *
 * const provider = clientToolProviderFactory();
 * const tools = provider.get_tools();
 * // tools.askConfirmation.parameters.parse({ question: 'Proceed?' });
 * ```
 *
 * EXTENDING
 * When adding a new tool entry:
 * 1. Pick a concise camelCase name (avoid collisions).
 * 2. Provide a clear natural language description (used in model prompting).
 * 3. Supply a Zod schema (parameters) with `.describe()` on each field.
 * 4. (Optional) Update higher level documentation / tool registry if needed.
 *
 * CAVEATS
 * - The returned `MCPClient` is currently a stub (empty object cast). If/when
 *   real client features (streaming events, connection teardown) are needed,
 *   augment `get_mcpClient` and `dispose` accordingly.
 * - `connect` returns the same provider immediately—this keeps the interface
 *   uniform with potential asynchronous providers while avoiding complexity.
 */

import { ToolSet } from "ai";
import { ConnectableToolProvider, MCPClient } from "./types";
import z from "zod";


/**
 * Factory that creates a pre‑connected {@link ConnectableToolProvider} exposing
 * client‑side interactive tools defined via Zod schemas.
 *
 * @returns A connectable tool provider whose `get_tools` method returns the
 *          available tool definitions.
 */
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