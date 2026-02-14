export class StopConditionLibrary {
    noToolsPending;
    constructor() {
        this.noToolsPending = ({ steps }) => {
            const lastStep = steps[steps.length - 1];
            if (!lastStep)
                return false;
            return lastStep.finishReason === 'stop';
        };
    }
}
export const StopConditions = (cb) => cb(new StopConditionLibrary());
//# sourceMappingURL=stop-conditions.js.map