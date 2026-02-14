export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { query } from '@compliance-theater/database/driver';
import { log, LoggedError } from '@compliance-theater/logger';
import { globalContactCache } from '@/data-models/api';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
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
export const POST = wrapRouteRequest(async (req) => {
    try {
        const { name, email, jobDescription, phoneNumber, isDistrictStaff } = await req.json();
        if (!name || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const result = await query((sql) => sql `INSERT INTO contacts (name, email, phone, role_dscr, is_district_staff) VALUES (${name}, ${email}, ${phoneNumber}, ${jobDescription}, ${isDistrictStaff})\
      RETURNING *`, { transform: mapRecordToObject });
        log((l) => l.verbose('[ [AUDIT]] -  Contact created:', result[0]));
        return NextResponse.json({
            message: 'Contact created successfully',
            contact: result[0],
        }, { status: 201 });
    }
    catch (error) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'api::contact-post',
        });
        return NextResponse.json({ error: `Internal Server Error - ${le.message}` }, { status: 500 });
    }
});
export const GET = wrapRouteRequest(async () => {
    try {
        const result = await query((sql) => sql `SELECT contact_id, name, email FROM contacts ORDER BY name ASC`, { transform: mapRecordToSummary });
        return NextResponse.json(result, { status: 200 });
    }
    catch (error) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'api::contact-get',
        });
        return NextResponse.json({ error: `Internal Server Error - ${le.message}` }, { status: 500 });
    }
});
//# sourceMappingURL=route.js.map