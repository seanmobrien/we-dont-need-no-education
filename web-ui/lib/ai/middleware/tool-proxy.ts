import { MiddlewareStateManager } from "./state-management/middleware-state-manager";
import { wrapLanguageModel, type LanguageModelMiddleware } from "ai";
import type { LanguageModelV2, LanguageModelV2CallOptions } from "@ai-sdk/provider";

export const toolProxyMiddlewareFactory = ({
  tools,
  merge = true,
}: {
  tools: Required<LanguageModelV2CallOptions>['tools'];
  merge?: boolean;
}): LanguageModelMiddleware => {
  return MiddlewareStateManager.Instance.basicMiddlewareWrapper({
    middlewareId: 'tool-proxy',
    middleware: {
      transformParams: async ({ params }) => {
        params.tools = merge
          ? [
            // filter out tool duplicates by name
            ...(params.tools ?? []).filter(y => tools.findIndex(z => z.name === y.name) === -1),
            ...tools
          ]
          : tools;
        return params;
      },
    }
  });
};

export const wrapWithToolProxyMiddleware = ({
  model,
  ...props
}: {
  model: LanguageModelV2;
  tools: Required<LanguageModelV2CallOptions>['tools'];
  merge?: boolean;
}) => wrapLanguageModel({
  model,
  middleware: toolProxyMiddlewareFactory(props),
});

