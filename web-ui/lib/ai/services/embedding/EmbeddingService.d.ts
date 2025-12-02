/**
 * @fileoverview EmbeddingService module definition.
 *
 * This module provides the EmbeddingService class, which is responsible for generating
 * text embeddings using a configured model. It supports caching of embeddings to
 * reduce API calls and latency.
 *
 * @author NoEducation Team
 * @version 1.0.0
 * @since 2025-01-01
 */

import { EmbeddingModelV2 } from '@ai-sdk/provider';
import { IEmbeddingService } from './types';

declare module '@/lib/ai/services/embedding/EmbeddingService' {
  /**
   * Service responsible for generating text embeddings using a configured model.
   * Supports caching of embeddings to reduce API calls.
   *
   * Key features:
   * - Configurable embedding model (defaults to global singleton)
   * - In-memory caching of generated embeddings
   * - Implements IEmbeddingService interface
   */
  export class EmbeddingService implements IEmbeddingService {
    /**
     * Creates an instance of EmbeddingService.
     *
     * @param {EmbeddingModelV2<string>} [embeddingClient] - Optional embedding model instance.
     * If not provided, the service uses the global singleton embedding model.
     */
    constructor(embeddingClient?: EmbeddingModelV2<string>);

    /**
     * Configures whether to cache generated embeddings in memory.
     * Caching is enabled by default.
     *
     * @param {boolean} cache - True to enable caching, false to disable.
     * @returns {this} The service instance for chaining.
     */
    setCacheEmbeddings(cache: boolean): this;

    /**
     * Generates an embedding for the given query text.
     * If caching is enabled and the query has been seen, returns the cached vector.
     *
     * @param {string} query - The text to embed.
     * @returns {Promise<number[]>} Promise resolving to the embedding vector (array of numbers).
     */
    embed(query: string): Promise<number[]>;
  }
}
