import { StopCondition } from "ai";
import { ToolSet } from "./types";

export class StopConditionLibrary<TOOLS extends ToolSet = ToolSet> {

  noToolsPending: StopCondition<TOOLS>;

  constructor() {
    this.noToolsPending = ({ steps }) => {
      // Return true only if we have steps and the last step finished with 'stop'
      // which indicates the model is done and not requesting more tool calls
      const lastStep = steps[steps.length - 1];
      if (!lastStep) return false;

      return lastStep.finishReason === 'stop';
    };
  }
}

export const StopConditions = <TOOLS extends ToolSet = ToolSet>(cb: (sc: StopConditionLibrary<TOOLS>) => StopCondition<TOOLS>): StopCondition<TOOLS> =>
  cb(new StopConditionLibrary<TOOLS>());


