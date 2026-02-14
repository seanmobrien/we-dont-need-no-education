import { LoggedError } from '@compliance-theater/logger';
const ProxiedToolMethodNames = [
    'execute',
    'toModelOutput',
    'onInputStart',
    'onInputDelta',
];
const ATTACH_TO_TOOL = Symbol('attachToTool');
export const attachProxyToTool = (tool) => {
    const toolAttacher = tool[ATTACH_TO_TOOL];
    if (typeof toolAttacher === 'function') {
        toolAttacher(tool);
        return true;
    }
    return false;
};
export const toolProxyFactory = ({ mcpClient, name, tool, }) => {
    let vTable = undefined;
    let vTablePromise = undefined;
    const loadTheTool = typeof mcpClient === 'function'
        ? mcpClient
        : async (n) => mcpClient
            .tools({ schemas: 'automatic' })
            .then((tools) => tools?.[n]);
    const attachTheTool = (tool) => {
        vTable = {
            execute: tool?.execute?.bind(tool),
            toModelOutput: tool?.toModelOutput?.bind(tool),
            onInputStart: tool?.onInputStart?.bind(tool),
            onInputDelta: tool?.onInputDelta?.bind(tool),
        };
        return vTable;
    };
    const proxied = new Proxy(tool, {
        get: (target, prop, receiver) => {
            if (prop === ATTACH_TO_TOOL) {
                return attachTheTool;
            }
            if (!ProxiedToolMethodNames.includes(prop)) {
                return Reflect.get(target, prop, receiver);
            }
            if (vTable) {
                return vTable[prop];
            }
            return async (...args) => {
                if (!vTablePromise) {
                    vTablePromise = loadTheTool(name)
                        .then(attachTheTool)
                        .catch((error) => {
                        LoggedError.isTurtlesAllTheWayDownBaby(error, {
                            log: true,
                            message: `Failed to load tools for proxy ${name}`,
                            source: 'MCP Tool Proxy',
                        });
                        vTablePromise = undefined;
                        return Promise.resolve(undefined);
                    });
                }
                const table = await vTablePromise;
                const fn = table?.[prop];
                return fn
                    ? fn(...args)
                    : undefined;
            };
        },
    });
    return proxied;
};
//# sourceMappingURL=tool-proxy.js.map