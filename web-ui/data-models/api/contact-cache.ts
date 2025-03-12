import { forOneOrMany, OneOrMany } from '@/lib/typescript';
import { ContactSummary, Contact } from './contact';
import { isContact } from './guards';

type CachedContact = ContactSummary & Partial<Contact>;
export type ContactCache = {
  add: OneOrMany<CachedContact, boolean>;
  get: OneOrMany<number, CachedContact | undefined>;
  getByEmail: OneOrMany<string, CachedContact | undefined>;
  remove: OneOrMany<number, boolean>;
  getAll: () => CachedContact[];
  clear: () => void;
  has: OneOrMany<number, boolean>;
  hasByEmail: OneOrMany<string, boolean>;
};

class ContactCacheImpl implements ContactCache {
  static #globalContactCache: ContactCache;
  static ContactCacheImpl: ContactCacheImpl;
  static get globalCache(): ContactCache {
    if (!ContactCacheImpl.#globalContactCache) {
      ContactCacheImpl.#globalContactCache = new ContactCacheImpl();
    }
    return ContactCacheImpl.#globalContactCache;
  }

  private cache: Map<number, CachedContact> = new Map();
  private cacheByEmail: Map<string, CachedContact> = new Map();

  add(contact: CachedContact): boolean;
  add(contact: Array<CachedContact>): boolean[];
  add(contact: CachedContact | CachedContact[]): boolean | boolean[] {
    return forOneOrMany((x) => {
      const existing = this.cache.get(x.contactId);
      if (existing) {
        existing.name = x.name;
        if (
          existing.email.toLocaleLowerCase() !== x.email.toLocaleLowerCase()
        ) {
          this.cacheByEmail.delete(existing.email.toLocaleLowerCase());
          existing.email = x.email;
          this.cacheByEmail.set(x.email.toLocaleLowerCase(), existing);
        }
        if (isContact(x)) {
          existing.jobDescription = x.jobDescription;
          existing.isDistrictStaff = x.isDistrictStaff;
          existing.phoneNumber = x.phoneNumber;
        }
        this.cache.set(x.contactId, x);
        return true;
      }
      const cacheEntry = { ...x };
      this.cache.set(x.contactId, cacheEntry);
      this.cacheByEmail.set(x.email.toLocaleLowerCase(), cacheEntry);
      return true;
    }, contact);
  }

  get(id: number): CachedContact | undefined;
  get(id: Array<number>): Array<CachedContact | undefined>;
  get(
    id: number | Array<number>
  ): CachedContact | undefined | Array<CachedContact | undefined> {
    return forOneOrMany((x) => {
      const ret = this.cache.get(x);
      return ret ? { ...ret } : undefined;
    }, id);
  }

  getByEmail(email: string): CachedContact | undefined;
  getByEmail(email: Array<string>): Array<CachedContact | undefined>;
  getByEmail(
    email: string | Array<string>
  ): CachedContact | undefined | Array<CachedContact | undefined> {
    return forOneOrMany((x) => {
      const ret = this.cacheByEmail.get(x.toLocaleLowerCase());
      return ret ? { ...ret } : undefined;
    }, email);
  }

  remove(contact: Array<number>): Array<boolean>;
  remove(contact: number): boolean;
  remove(contact: number | Array<number>): boolean | boolean[] {
    return forOneOrMany((x) => this.cache.delete(x), contact);
  }

  public getAll(): CachedContact[] {
    return Array.from(this.cache.values()).map((x) => ({ ...x }));
  }

  public clear(): void {
    this.cache.clear();
  }

  public has(id: number): boolean;
  public has(id: Array<number>): boolean[];
  public has(id: number | Array<number>): boolean | boolean[] {
    return forOneOrMany((x) => this.cache.has(x), id);
  }
  public hasByEmail(email: string): boolean;
  public hasByEmail(email: Array<string>): boolean[];
  public hasByEmail(email: string | Array<string>): boolean | boolean[] {
    return forOneOrMany(
      (x) => this.cacheByEmail.has(x.toLocaleLowerCase()),
      email
    );
  }
}

/**
 * Executes a callback function with the global contact cache.
 *
 * @template TRet - The return type of the callback function.
 * @param cb - The callback function to execute with the global contact cache.
 * @returns The result of the callback function.
 */
export const globalContactCache = <TRet>(
  cb: (cache: ContactCache) => TRet
): TRet => cb(ContactCacheImpl.globalCache);
