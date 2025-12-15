import { StopCondition } from "ai";
import { ToolSet } from "./types";

/**
 * Library of reusable stop conditions for AI model generation.
 * 
 * This class provides a collection of pre-defined stop conditions that can be used
 * to control when the AI model's generation loop should terminate. These conditions
 * are particularly useful for managing complex multi-step interactions involving tools.
 * 
 * @template TOOLS The set of tools available to the model, extending `ToolSet`.
 */
export declare class StopConditionLibrary<TOOLS extends ToolSet = ToolSet> {
  /**
   * persistent instance of the No pending tools stop condition
   */
  noToolsPending: StopCondition<TOOLS>;

  /**
   * Initializes a new instance of the StopConditionLibrary.
   * Sets up the `noToolsPending` condition.
   */
  constructor();
}

/**
 * Utility function to access the StopConditionLibrary in a functional pattern.
 * 
 * This higher-order function creates an instance of `StopConditionLibrary` and passes it
 * to a callback, allowing for concise usage of stop conditions without manually
 * managing class instantiation.
 * 
 * @example
 * ```typescript
 * const result = StopConditions((lib) => lib.noToolsPending);
 * ```
 * 
 * @template TOOLS The set of tools available to the model, extending `ToolSet`.
 * @template TResult The return type of the callback function.
 * @param {function(StopConditionLibrary<TOOLS>): TResult} cb A callback function that receives the library instance.
 * @returns {TResult} The result returned by the callback function.
 */
export declare const StopConditions: <TOOLS extends ToolSet = ToolSet, TResult = any>(cb: (sc: StopConditionLibrary<TOOLS>) => TResult) => TResult;
