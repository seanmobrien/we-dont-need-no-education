/**
 * @fileoverview FIFO rate-aware language model queue implementation
 *
 * This class provides a queue-based system for processing language model requests
 * while respecting rate limits and providing intelligent request scheduling.
 */

import { LanguageModelQueueOptions } from './types';

declare module '@/lib/ai/services/chat/language-model-queue/queue' {
  /**
   * FIFO rate-aware language model queue
   *
   * Manages queued requests to language models with intelligent rate limiting,
   * FIFO processing with capacity-aware skipping, and comprehensive error handling.
   */
  export class LanguageModelQueue {
    constructor(options: LanguageModelQueueOptions);

    /**
     * Get the readonly queue instance ID
     */
    get queueInstanceId(): string;

    /**
     * Generate text using the underlying model
     */
    generateText(params: unknown, signal?: AbortSignal): Promise<unknown>;

    /**
     * Generate object using the underlying model
     */
    generateObject(params: unknown, signal?: AbortSignal): Promise<unknown>;

    /**
     * Stream text using the underlying model
     */
    streamText(params: unknown, signal?: AbortSignal): Promise<unknown>;

    /**
     * Stream object using the underlying model
     */
    streamObject(params: unknown, signal?: AbortSignal): Promise<unknown>;
  }
}
