import { wrapRouteRequest } from "@/lib/nextjs-util/server";
import { isKeyOf } from "@repo/lib-typescript";
import { SingletonProvider } from "@repo/lib-typescript/singleton-provider/provider";
import { NextRequest, NextResponse } from "next/server";

const HealthActionValues = [
  'reset-globals'
] as const;

type HealthActionType = typeof HealthActionValues[number];

type HealthActionEnvelope = {
  action: HealthActionType;
};

/**
 * Interface for health action strategies.
 */
interface HealthActionStrategy {
  execute(): Promise<NextResponse>;
}

/**
 * Strategy to reset global singletons.
 */
class ResetGlobalsStrategy implements HealthActionStrategy {
  async execute(): Promise<NextResponse> {
    SingletonProvider.Instance.clear();
    return NextResponse.json({ status: 'ok', message: 'Global singletons cleared.' });
  }
}

/**
 * Registry of available health action strategies.
 */
const strategyRegistry: Record<HealthActionType, HealthActionStrategy> = {
  'reset-globals': new ResetGlobalsStrategy(),
};

export const POST = wrapRouteRequest(async (
  req: NextRequest
) => {
  const body = await req.json() as HealthActionEnvelope;

  if (!body || !body.action) {
    return NextResponse.json({ error: 'Missing action' }, { status: 400 });
  }

  let strategy: HealthActionStrategy | undefined = undefined;
  if (isKeyOf(body.action, HealthActionValues)) {
    strategy = strategyRegistry[body.action];
  }

  if (!strategy) {
    return NextResponse.json({ error: `Invalid action: ${body.action}` }, { status: 400 });
  }

  return strategy.execute();
});
