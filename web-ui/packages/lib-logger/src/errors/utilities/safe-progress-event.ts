/* global EventTarget, Event */

export type SafeProgressEvent<T extends EventTarget = EventTarget> = Event & {
  /**
   * The **`ProgressEvent.lengthComputable`** read-only property is a boolean flag indicating if the resource concerned by the length
   * of the operation.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/lengthComputable)
   */
  readonly lengthComputable: boolean;
  /**
   * The **`ProgressEvent.loaded`** read-only property is a number indicating the size of the data already transmitted or processed.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/loaded)
   */
  readonly loaded: number;
  readonly target: T | null;
  /**
   * The **`ProgressEvent.total`** read-only property is a number indicating the total size of the data being transmitted or processed.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/total)
   */
  readonly total: number;
};