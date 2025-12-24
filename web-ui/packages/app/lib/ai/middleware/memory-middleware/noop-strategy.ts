import { MemoryMiddlewareAugmentationStrategy } from "./types";

const transformParams: MemoryMiddlewareAugmentationStrategy['transformParams'] = ({ params }) => Promise.resolve(params);
const onOutputGenerated: MemoryMiddlewareAugmentationStrategy['onOutputGenerated'] = () => Promise.resolve(true);

export const noopStrategyFactory = (): MemoryMiddlewareAugmentationStrategy => ({
  transformParams,
  onOutputGenerated,
});
