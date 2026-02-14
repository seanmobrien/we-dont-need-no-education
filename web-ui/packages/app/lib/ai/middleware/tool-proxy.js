import { MiddlewareStateManager } from "./state-management/middleware-state-manager";
import { wrapLanguageModel } from "ai";
export const toolProxyMiddlewareFactory = ({ tools, merge = true, }) => {
    return MiddlewareStateManager.Instance.basicMiddlewareWrapper({
        middlewareId: 'tool-proxy',
        middleware: {
            transformParams: async ({ params }) => {
                params.tools = merge
                    ? [
                        ...(params.tools ?? []).filter(y => tools.findIndex(z => z.name === y.name) === -1),
                        ...tools
                    ]
                    : tools;
                return params;
            },
        }
    });
};
export const wrapWithToolProxyMiddleware = ({ model, ...props }) => wrapLanguageModel({
    model,
    middleware: toolProxyMiddlewareFactory(props),
});
//# sourceMappingURL=tool-proxy.js.map