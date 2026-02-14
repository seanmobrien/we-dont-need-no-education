import { isContact } from '@/data-models/api/guards';
import { globalContactCache } from '@/data-models/api/contact-cache';
import { log } from '@compliance-theater/logger';
import { query, queryExt } from '@compliance-theater/database/driver';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { DataIntegrityError } from '@/lib/react-util/errors/data-integrity-error';
import { AbstractObjectRepository } from '../abstractObjectRepository';
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
const mapRecordToSummary = (record, updateContact = true) => {
    const ret = {
        contactId: Number(record.contact_id),
        name: record.name,
        email: record.email,
    };
    if (updateContact) {
        globalContactCache((cache) => cache.add(ret));
    }
    return ret;
};
const mapRecordToObject = (record) => {
    const ret = {
        ...mapRecordToSummary(record, false),
        phoneNumber: record.phone,
        jobDescription: record.role_dscr,
        isDistrictStaff: record.is_district_staff,
    };
    globalContactCache((cache) => cache.add(ret));
    return ret;
};
export class ContactRepository {
    constructor() { }
    static MapRecordToSummary = mapRecordToSummary;
    static MapRecordToObject = mapRecordToObject;
    async list(pagination) {
        const { num, page, offset } = parsePaginationStats(pagination);
        try {
            const results = await query((sql) => sql `SELECT * FROM contacts ORDER BY contact_id LIMIT ${num} OFFSET ${offset}`, { transform: ContactRepository.MapRecordToSummary });
            if (results.length === page) {
                const total = await query((sql) => sql `SELECT COUNT(*) as records FROM contacts`);
                return {
                    results,
                    pageStats: {
                        num,
                        page,
                        total: total[0].records,
                    },
                };
            }
            else {
                return {
                    results,
                    pageStats: {
                        num,
                        page,
                        total: offset + results.length,
                    },
                };
            }
        }
        catch (error) {
            AbstractObjectRepository.logDatabaseError({
                error,
                source: 'ContactRepository.list',
            });
        }
    }
    async get(contactId, reload = false) {
        if (!reload) {
            const cachedContact = globalContactCache((cache) => cache.get(contactId));
            if (isContact(cachedContact)) {
                return cachedContact;
            }
        }
        try {
            const result = await query((sql) => sql `SELECT * FROM contacts WHERE contact_id = ${contactId}`, { transform: ContactRepository.MapRecordToObject });
            return result.length === 1 ? result[0] : null;
        }
        catch (error) {
            AbstractObjectRepository.logDatabaseError({
                error,
                source: 'ContactRepository.list',
            });
        }
    }
    async create({ name, email, phoneNumber, jobDescription, isDistrictStaff, }) {
        try {
            if (!name || !email) {
                throw new ValidationError({
                    field: 'name||email',
                    source: 'ContactRepository',
                });
            }
            const result = await query((sql) => sql `INSERT INTO contacts (name, email, phone, role_dscr, is_district_staff) VALUES (${name}, ${email}, ${phoneNumber ?? null}, ${jobDescription ?? null}, ${isDistrictStaff ?? true})\
            RETURNING *`, { transform: ContactRepository.MapRecordToObject });
            log((l) => l.verbose('[ [AUDIT]] -  Contact created:', result[0]));
            if (result.length !== 1) {
                throw new DataIntegrityError('Failed to create contact', {
                    table: 'contacts',
                });
            }
            return result[0];
        }
        catch (error) {
            AbstractObjectRepository.logDatabaseError({
                error,
                source: 'ContactRepository.list',
            });
        }
    }
    async update({ contactId, name, email, jobDescription, phoneNumber, isDistrictStaff, }) {
        if (!contactId) {
            throw new ValidationError({
                field: 'contactId',
                source: 'ContactRepository',
            });
        }
        if (!name &&
            !email &&
            !jobDescription &&
            !phoneNumber &&
            !isDistrictStaff) {
            throw new ValidationError({
                field: 'At least one field is required for update',
                source: 'ContactRepository',
            });
        }
        const updateFields = [];
        const values = [];
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
            const result = await queryExt((sql) => sql(`UPDATE contacts SET ${updateFields.join(', ')} WHERE contact_id = $${paramIndex} RETURNING *`, values), { transform: ContactRepository.MapRecordToObject });
            if (result.rowCount === 0) {
                throw new DataIntegrityError('Failed to update contact');
            }
            log((l) => l.verbose('[[AUDIT]] -  Contact updated:', result.rows[0]));
            return result.rows[0];
        }
        catch (error) {
            AbstractObjectRepository.logDatabaseError({
                error,
                source: 'ContactRepository.update',
            });
        }
    }
    async delete(contactId) {
        if (!contactId) {
            throw new TypeError('contactId is required for delete');
        }
        try {
            const results = await query((sql) => sql `
            DELETE FROM contacts
            WHERE contact_id = ${contactId}
            RETURNING contact_id`);
            if (results.length === 0) {
                throw new DataIntegrityError('Failed to delete contact');
            }
            globalContactCache((cache) => cache.remove(contactId));
            return true;
        }
        catch (error) {
            AbstractObjectRepository.logDatabaseError({
                error,
                source: 'ContactRepository.delete',
            });
        }
        return false;
    }
    async addEmailRecipient(contactId, emailId, type) {
        if (!contactId || !emailId) {
            throw new ValidationError({
                field: 'contactId||emailId',
                source: 'ContactRepository',
            });
        }
        try {
            await query((sql) => sql `
          INSERT INTO email_recipients (recipient_id, email_id, recipient_type)
          VALUES (${contactId}, ${emailId}, ${type})`);
            log((l) => l.verbose('[ [AUDIT]] - Email recipient added:', {
                contactId,
                emailId,
            }));
        }
        catch (error) {
            AbstractObjectRepository.logDatabaseError({
                error,
                source: 'ContactRepository.addEmailRecipient',
            });
        }
    }
    async getContactsByEmails(emails, refresh = false) {
        let emailList = Array.isArray(emails) ? emails : [emails];
        const returned = Array();
        if (!refresh) {
            globalContactCache((cache) => cache.getByEmail(emailList))
                .filter((x) => !!x)
                .forEach((contact) => returned.push(contact));
            if (returned.length === emailList.length) {
                return returned;
            }
            emailList = emailList.filter((x) => !returned.find((y) => y.email.toLowerCase() === x.toLowerCase()));
        }
        try {
            const results = await query((sql) => sql `
          SELECT * FROM contacts
          WHERE email = ANY(${emailList})
        `, { transform: ContactRepository.MapRecordToObject });
            return results;
        }
        catch (error) {
            AbstractObjectRepository.logDatabaseError({
                error,
                source: 'ContactRepository.getContactsByEmails',
            });
        }
    }
}
//# sourceMappingURL=database.js.map