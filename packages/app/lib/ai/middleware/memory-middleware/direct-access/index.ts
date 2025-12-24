import transformParams from "./transform-params";
import onOutputGenerated from "./output-generated";
import { MemoryMiddlewareAugmentationStrategy } from "../types";

export const directAccessStrategyFactory = (): MemoryMiddlewareAugmentationStrategy => ({
  transformParams,
  onOutputGenerated,
});
