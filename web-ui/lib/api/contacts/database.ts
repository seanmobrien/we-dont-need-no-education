import { Contact, ContactSummary } from '@/data-models/api/contact';
import { log } from '@/lib/logger';
import { query, queryExt } from '@/lib/neondb';
import { ValidationError } from '@/lib/react-util/errors';
import { DataIntegrityError } from '@/lib/react-util/errors/data-integrity-error';
import { PartialExceptFor } from '@/lib/typescript';
import { PaginatedResultset, PaginationStats } from '@/data-models/_types';
import { isContact, parsePaginationStats } from '@/data-models';
import { ObjectRepository } from '@/data-models/api/object-repository';
import { globalContactCache } from '@/data-models/api';
import { RecipientType } from '@/lib/email/import/types';
import { BaseObjectRepository } from '../_baseObjectRepository';

const mapRecordToSummary = (
  record: Record<string, unknown>,
  updateContact: boolean = true,
) => {
  const ret = {
    contactId: Number(record.contact_id),
    name: record.name as string,
    email: record.email as string,
  };
  if (updateContact) {
    globalContactCache((cache) => cache.add(ret));
  }
  return ret;
};

const mapRecordToObject = (record: Record<string, unknown>) => {
  const ret = {
    ...mapRecordToSummary(record, false),
    phoneNumber: record.phone as string,
    jobDescription: record.role_dscr as string,
    isDistrictStaff: record.is_district_staff as boolean,
  };
  globalContactCache((cache) => cache.add(ret));
  return ret;
};

export class ContactRepository
  implements ObjectRepository<Contact, 'contactId'>
{
  constructor() {}
  static MapRecordToSummary = mapRecordToSummary;
  static MapRecordToObject = mapRecordToObject;

  async list(
    pagination?: PaginationStats,
  ): Promise<PaginatedResultset<ContactSummary>> {
    const { num, page, offset } = parsePaginationStats(pagination);
    try {
      const results = await query(
        (sql) =>
          sql`SELECT * FROM contacts ORDER BY contact_id LIMIT ${num} OFFSET ${offset}`,
        { transform: ContactRepository.MapRecordToSummary },
      );
      if (results.length === page) {
        const total = await query(
          (sql) => sql`SELECT COUNT(*) as records FROM contacts`,
        );
        return {
          results,
          pageStats: {
            num,
            page,
            total: total[0].records as number,
          },
        };
      } else {
        return {
          results,
          pageStats: {
            num,
            page,
            total: offset + results.length,
          },
        };
      }
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ContactRepository.list',
      });
    }
  }

  async get(
    contactId: number,
    reload: boolean = false,
  ): Promise<Contact | null> {
    if (!reload) {
      const cachedContact = globalContactCache((cache) => cache.get(contactId));
      if (isContact(cachedContact)) {
        return cachedContact;
      }
    }
    try {
      const result = await query(
        (sql) => sql`SELECT * FROM contacts WHERE contact_id = ${contactId}`,
        { transform: ContactRepository.MapRecordToObject },
      );
      return result.length === 1 ? result[0] : null;
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ContactRepository.list',
      });
    }
  }

  async create({
    name,
    email,
    phoneNumber,
    jobDescription,
    isDistrictStaff,
  }: Omit<Partial<Contact>, 'contactId'>): Promise<Contact> {
    try {
      if (!name || !email) {
        throw new ValidationError({
          field: 'name||email',
          source: 'ContactRepository',
        });
      }
      const result = await query(
        (sql) =>
          sql`INSERT INTO contacts (name, email, phone, role_dscr, is_district_staff) VALUES (${name}, ${email}, ${phoneNumber}, ${jobDescription}, ${isDistrictStaff})\
            RETURNING *`,
        { transform: ContactRepository.MapRecordToObject },
      );
      log((l) => l.verbose('[ [AUDIT]] -  Contact created:', result[0]));
      if (result.length !== 1) {
        throw new DataIntegrityError('Failed to create contact', {
          table: 'contacts',
        });
      }
      return result[0];
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ContactRepository.list',
      });
    }
  }

  async update({
    contactId,
    name,
    email,
    jobDescription,
    phoneNumber,
    isDistrictStaff,
  }: PartialExceptFor<Contact, 'contactId'>): Promise<Contact> {
    if (!contactId) {
      throw new ValidationError({
        field: 'contactId',
        source: 'ContactRepository',
      });
    }
    if (
      !name &&
      !email &&
      !jobDescription &&
      !phoneNumber &&
      !isDistrictStaff
    ) {
      throw new ValidationError({
        field: 'At least one field is required for update',
        source: 'ContactRepository',
      });
    }
    const updateFields: string[] = [];
    const values: unknown[] = [];
    const fieldMap = {
      name,
      email,
      role_dscr: jobDescription,
      phone: phoneNumber,
      is_district_staff: isDistrictStaff,
    };
    let paramIndex = 1;
    Object.entries(fieldMap).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });
    values.push(contactId);

    try {
      const result = await queryExt(
        (sql) =>
          sql<false, true>(
            `UPDATE contacts SET ${updateFields.join(
              ', ',
            )} WHERE contact_id = $${paramIndex} RETURNING *`,
            values,
          ),
        { transform: ContactRepository.MapRecordToObject },
      );

      if (result.rowCount === 0) {
        throw new DataIntegrityError('Failed to update contact');
      }
      log((l) => l.verbose('[[AUDIT]] -  Contact updated:', result.rows[0]));
      return result.rows[0];
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ContactRepository.update',
      });
    }
  }

  async delete(contactId: number): Promise<boolean> {
    if (!contactId) {
      throw new TypeError('contactId is required for delete');
    }
    try {
      const results = await query(
        (sql) => sql`
            DELETE FROM contacts
            WHERE contact_id = ${contactId}
            RETURNING contact_id`,
      );
      if (results.length === 0) {
        throw new DataIntegrityError('Failed to delete contact');
      }
      globalContactCache((cache) => cache.remove(contactId));
      return true;
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ContactRepository.delete',
      });
    }
    return false;
  }

  async addEmailRecipient(
    contactId: number,
    emailId: string,
    type?: RecipientType,
  ): Promise<void> {
    if (!contactId || !emailId) {
      throw new ValidationError({
        field: 'contactId||emailId',
        source: 'ContactRepository',
      });
    }
    try {
      await query(
        (sql) => sql`
          INSERT INTO email_recipients (recipient_id, email_id, recipient_type)
          VALUES (${contactId}, ${emailId}, ${type})`,
      );
      log((l) =>
        l.verbose('[ [AUDIT]] - Email recipient added:', {
          contactId,
          emailId,
        }),
      );
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ContactRepository.addEmailRecipient',
      });
    }
  }

  async getContactsByEmails(
    emails: string[] | string,
    refresh: boolean = false,
  ): Promise<Array<ContactSummary>> {
    let emailList = Array.isArray(emails) ? emails : [emails];
    const returned = Array<ContactSummary>();
    // `re
    if (!refresh) {
      globalContactCache((cache) => cache.getByEmail(emailList))
        .filter((x) => !!x)
        .forEach((contact) => returned.push(contact));
      if (returned.length === emailList.length) {
        return returned;
      }
      emailList = emailList.filter(
        (x) => !returned.find((y) => y.email.toLowerCase() === x.toLowerCase()),
      );
    }
    try {
      const results = await query(
        (sql) => sql`
          SELECT * FROM contacts
          WHERE email = ANY(${emailList})
        `,
        { transform: ContactRepository.MapRecordToObject },
      );
      return results;
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ContactRepository.getContactsByEmails',
      });
    }
  }
}
