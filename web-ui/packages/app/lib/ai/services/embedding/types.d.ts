/**
 * @fileoverview Type definitions for embedding service types.
 */

declare module '@/lib/ai/services/embedding/types' {
  /**
   * A very thin embedding-service interface. Your real service
   * must implement .embed(text): Promise<number[]>
   */
  export interface IEmbeddingService {
    /**
     * Generates an embedding vector for the provided text.
     *
     * @param text - The input text to embed.
     * @returns Promise resolving to the embedding vector (array of numbers).
     */
    embed(text: string): Promise<number[]>;
  }
}
