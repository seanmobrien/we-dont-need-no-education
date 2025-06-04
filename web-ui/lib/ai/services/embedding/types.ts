/**
 * A very thin embedding-service interface. Your real service
 * must implement .embed(text): Promise<number[]>
 */
export interface IEmbeddingService {
  embed(text: string): Promise<number[]>;
}
