const transformParams = ({ params }) => Promise.resolve(params);
const onOutputGenerated = () => Promise.resolve(true);
export const noopStrategyFactory = () => ({
    transformParams,
    onOutputGenerated,
});
//# sourceMappingURL=noop-strategy.js.map