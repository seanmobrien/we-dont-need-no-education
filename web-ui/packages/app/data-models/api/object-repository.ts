import { PartialExceptFor } from '@repo/lib-typescript';
import { PaginationStats, PaginatedResultset } from '../_types';
import { ContactSummary, Contact } from './contact';

export type ObjectRepository<T, K extends keyof T> = {
  list: (
    pagination?: PaginationStats,
  ) => Promise<PaginatedResultset<ContactSummary>>;

  get: (contactId: number) => Promise<Contact | null>;

  create: (model: Omit<Contact, K>) => Promise<Contact>;

  update: (model: PartialExceptFor<T, K>) => Promise<T>;

  delete: (contactId: T[K]) => Promise<boolean>;
};
