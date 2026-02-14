import { forOneOrMany } from '@compliance-theater/typescript';
import { globalRequiredSingleton, SingletonProvider, } from '@compliance-theater/typescript/singleton-provider';
import { isContact } from './guards';
const CONTACT_CACHE_KEY = '@noeducation/data-models/api/ContactCache';
class ContactCacheImpl {
    static get globalCache() {
        return globalRequiredSingleton(CONTACT_CACHE_KEY, () => new ContactCacheImpl(), {
            weakRef: true,
        });
    }
    static resetGlobalCache() {
        const instance = SingletonProvider.Instance.get(CONTACT_CACHE_KEY);
        if (instance) {
            instance.clear();
            SingletonProvider.Instance.delete(CONTACT_CACHE_KEY);
        }
    }
    cache = new Map();
    cacheByEmail = new Map();
    add(contact) {
        return forOneOrMany((x) => {
            const existing = this.cache.get(x.contactId);
            if (existing) {
                existing.name = x.name;
                if (existing.email.toLocaleLowerCase() !== x.email.toLocaleLowerCase()) {
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
    get(id) {
        return forOneOrMany((x) => {
            const ret = this.cache.get(x);
            return ret ? { ...ret } : undefined;
        }, id);
    }
    getByEmail(email) {
        return forOneOrMany((x) => {
            const ret = this.cacheByEmail.get(x.toLocaleLowerCase());
            return ret ? { ...ret } : undefined;
        }, email);
    }
    remove(contact) {
        return forOneOrMany((x) => this.cache.delete(x), contact);
    }
    getAll() {
        return Array.from(this.cache.values()).map((x) => ({ ...x }));
    }
    clear() {
        this.cache.clear();
    }
    has(id) {
        return forOneOrMany((x) => this.cache.has(x), id);
    }
    hasByEmail(email) {
        return forOneOrMany((x) => this.cacheByEmail.has(x.toLocaleLowerCase()), email);
    }
}
export const globalContactCache = (cb) => cb(ContactCacheImpl.globalCache);
export const resetGlobalCache = () => ContactCacheImpl.resetGlobalCache();
//# sourceMappingURL=contact-cache.js.map