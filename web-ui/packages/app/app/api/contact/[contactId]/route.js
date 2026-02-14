import { NextResponse } from 'next/server';
import { wrapRouteRequest, extractParams, } from '@/lib/nextjs-util/server/utils';
import { query, queryExt } from '@compliance-theater/database/driver';
import { log, LoggedError } from '@compliance-theater/logger';
import { globalContactCache } from '@/data-models/api';
import { isTruthy } from '@/lib/react-util/utility-methods';
export const dynamic = 'force-dynamic';
const mapRecordToSummary = (record, cache = true) => {
    const ret = {
        contactId: record.contact_id,
        name: record.name,
        email: record.email,
    };
    if (cache) {
        globalContactCache((cb) => cb.add(ret));
    }
    return ret;
};
const mapRecordToObject = (record, cache = true) => {
    const ret = {
        ...mapRecordToSummary(record, false),
        phoneNumber: record.phone,
        jobDescription: record.role_dscr,
        isDistrictStaff: record.is_district_staff,
    };
    if (cache) {
        globalContactCache((cb) => cb.add(ret));
    }
    return ret;
};
export const PUT = wrapRouteRequest(async (req, { params }) => {
    try {
        const { contactId } = await params;
        const { name, email, jobDescription, phoneNumber, isDistrictStaff } = await req.json();
        if (!contactId) {
            return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
        }
        if (!name &&
            !email &&
            !jobDescription &&
            !phoneNumber &&
            !isDistrictStaff) {
            return NextResponse.json({ error: 'At least one field is required for update' }, { status: 400 });
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
        values.push(Number(contactId));
        const result = await queryExt((sql) => sql(`UPDATE contacts SET ${updateFields.join(', ')} WHERE contact_id = $${paramIndex} RETURNING *`, values), { transform: mapRecordToObject });
        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Contact not found or not updated' }, { status: 404 });
        }
        log((l) => l.verbose('[[AUDIT]] -  Contact updated:', result.rows[0]));
        return NextResponse.json({
            message: 'Contact updated successfully',
            contact: result.rows[0],
        }, { status: 200 });
    }
    catch (error) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'api::contact-put',
        });
        return NextResponse.json({ error: `Internal Server Error - ${le.message}` }, { status: 500 });
    }
});
export const GET = wrapRouteRequest(async (req, withParams) => {
    try {
        const { contactId } = await extractParams(withParams);
        const refresh = isTruthy(req.nextUrl.searchParams.get('refresh'));
        if (!contactId) {
            return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
        }
        if (!refresh) {
            const cachedContact = globalContactCache((cache) => cache.get(Number(contactId)));
            if (cachedContact) {
                return NextResponse.json(cachedContact, { status: 200 });
            }
        }
        const result = await query((sql) => sql `SELECT contact_id, name, email, phone, role_dscr, is_district_staff FROM contacts WHERE contact_id = ${Number(contactId)}`, { transform: mapRecordToObject });
        if (result.length === 0) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }
        return NextResponse.json(result[0], { status: 200 });
    }
    catch (error) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'api::contact-get',
        });
        return NextResponse.json({ error: `Internal Server Error - ${le.message}` }, { status: 500 });
    }
});
export const DELETE = wrapRouteRequest(async (req, { params }) => {
    try {
        const { contactId } = await params;
        if (!contactId) {
            return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
        }
        const result = await query((sql) => sql `DELETE FROM contacts WHERE contact_id = ${contactId} RETURNING *`, { transform: (x) => mapRecordToObject(x, false) });
        if (result.length === 0) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }
        log((l) => l.verbose('[[AUDIT]] -  Contact deleted:', result[0]));
        globalContactCache((cache) => cache.remove(Number(contactId)));
        return NextResponse.json({
            message: 'Contact deleted successfully',
            contact: result[0],
        }, { status: 200 });
    }
    catch (error) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'api::contact-delete',
        });
        return NextResponse.json({ error: `Internal Server Error - ${le.message}` }, { status: 500 });
    }
});
//# sourceMappingURL=route.js.map