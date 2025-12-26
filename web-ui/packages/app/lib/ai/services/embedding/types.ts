export interface IEmbeddingService {
  embed(text: string): Promise<number[]>;
}
