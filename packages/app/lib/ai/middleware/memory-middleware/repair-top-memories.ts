import { NoSuchToolError, ToolCallRepairFunction, ToolSet } from "ai";


export const repairTopMemoriesToolCall: ToolCallRepairFunction<ToolSet> = async (options) => {
  if (NoSuchToolError.isInstance(options.error)) {
    return null;
  }

  let parsedInput: unknown;
  try {
    parsedInput = JSON.parse(options.toolCall.input);
  } catch {
    return null;
  }

  const inputAsRecord = parsedInput as Record<string, unknown>;
  const topMemories = Array.isArray(inputAsRecord?.topMemories)
    ? inputAsRecord.topMemories
    : null;

  if (!topMemories) {
    return null;
  }

  const normalizeOffset = (offset: string | undefined) => {
    if (!offset) return '';
    if (offset === 'Z') return 'Z';
    if (offset.includes(':')) return offset;
    return `${offset.slice(0, 3)}:${offset.slice(3)}`;
  };

  const normalizeCreatedAt = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;

    const match = value.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})[T ]([0-9]{2}:[0-9]{2})(?::[0-9]{2}(?:\.[0-9]+)?)?(Z|[+-][0-9]{2}:?[0-9]{2})?$/);

    const dateValue = new Date(value);
    if (!match || Number.isNaN(dateValue.getTime())) {
      return null;
    }

    const [, datePart, timePart, offsetPart] = match;
    return `${datePart}T${timePart}${normalizeOffset(offsetPart)}`;
  };

  let mutated = false;
  const repairedTopMemories = (topMemories as Array<Record<string, unknown>>).map((memory) => {
    if (!memory || typeof memory !== 'object') {
      return memory;
    }

    const currentCreatedAt = (memory as { createdAt?: unknown }).createdAt;
    const repaired = normalizeCreatedAt(currentCreatedAt);
    if (!repaired || repaired === currentCreatedAt) {
      return memory;
    }

    mutated = true;
    return {
      ...memory,
      createdAt: repaired,
    };
  });

  if (!mutated) {
    return null;
  }

  return {
    ...options.toolCall,
    input: JSON.stringify({
      ...inputAsRecord,
      topMemories: repairedTopMemories,
    }),
  };
};
