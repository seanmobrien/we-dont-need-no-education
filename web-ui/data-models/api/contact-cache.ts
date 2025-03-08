import { ContactSummary, Contact } from './contact';

type CachedContact = ContactSummary & Partial<Contact>;

export class ContactCache {
  private cache: Map<number, CachedContact> = new Map();

  public add(contact: CachedContact): number {
    if (this.cache.has(contact.contactId)) {
      throw new Error('Contact already exists in cache.');
    }
    this.cache.set(contact.contactId, contact);
    return contact.contactId;
  }

  public get(id: number): CachedContact | undefined {
    return this.cache.get(id);
  }

  public remove(id: number): boolean {
    return this.cache.delete(id);
  }

  public getAll(): CachedContact[] {
    return Array.from(this.cache.values());
  }

  public clear(): void {
    this.cache.clear();
  }

  public has(id: number): boolean {
    return this.cache.has(id);
  }
}
