import { NextRequest, NextResponse } from 'next/server';
import { query, queryExt } from '@/lib/neondb';
import { log } from '@/lib/logger';
import { globalContactCache } from '@/data-models/api/contact-cache';
import { isTruthy } from '@/lib/react-util';

const mapRecordToSummary = (record: Record<string, unknown>) => ({
  contactId: record.contact_id as number,
  name: record.name as string,
  email: record.email as string,
});
const mapRecordToObject = (record: Record<string, unknown>) => ({
  ...mapRecordToSummary(record),
  phoneNumber: record.phone as string,
  jobDescription: record.role_dscr as string,
  isDistrictStaff: record.is_district_staff as boolean,
});

export async function POST(req: NextRequest) {
  try {
    const { name, email, jobDescription, phoneNumber, isDistrictStaff } =
      await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await query(
      (sql) =>
        sql`INSERT INTO contacts (name, email, phone, role_dscr, is_district_staff) VALUES (${name}, ${email}, ${phoneNumber}, ${jobDescription}, ${isDistrictStaff})\
      RETURNING *`,
      { transform: mapRecordToObject }
    );
    log((l) => l.verbose('[ [AUDIT]] -  Contact created:', result[0]));

    globalContactCache().add(result);
    return NextResponse.json(
      {
        message: 'Contact created successfully',
        contact: result[0],
      },
      { status: 201 }
    );
  } catch (error) {
    log((l) => l.error('Database error:', error));
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const {
      contactId,
      name,
      email,
      jobDescription,
      phoneNumber,
      isDistrictStaff,
    } = await req.json();

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    if (
      !name &&
      !email &&
      !jobDescription &&
      !phoneNumber &&
      !isDistrictStaff
    ) {
      return NextResponse.json(
        { error: 'At least one field is required for update' },
        { status: 400 }
      );
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

    const result = await queryExt(
      (sql) =>
        sql<false, true>(
          `UPDATE contacts SET ${updateFields.join(
            ', '
          )} WHERE contact_id = $${paramIndex} RETURNING *`,
          values
        ),
      { transform: mapRecordToObject }
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Contact not found or not updated' },
        { status: 404 }
      );
    }
    log((l) => l.verbose('[[AUDIT]] -  Contact updated:', result.rows[0]));
    globalContactCache().add(result.rows);
    return NextResponse.json(
      {
        message: 'Contact updated successfully',
        contact: result.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    log((l) => l.error('Database error:', error));
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contact_id');
    const refresh = isTruthy(searchParams.get('refresh'));

    if (contactId) {
      if (!refresh) {
        const cachedContact = globalContactCache().get(Number(contactId));
        if (cachedContact) {
          return NextResponse.json(cachedContact, { status: 200 });
        }
      }
      const result = await query(
        (sql) =>
          sql`SELECT contact_id, name, email, phone, role_dscr, is_district_staff FROM contacts WHERE contact_id = ${contactId}`,
        { transform: mapRecordToObject }
      );

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Contact not found' },
          { status: 404 }
        );
      }
      globalContactCache().add(result[0]);
      return NextResponse.json(result[0], { status: 200 });
    } else {
      const result = await query(
        (sql) =>
          sql`SELECT contact_id, name, email FROM contacts ORDER BY name ASC`,
        { transform: mapRecordToSummary }
      );
      globalContactCache().add(result);
      return NextResponse.json(result, { status: 200 });
    }
  } catch (error) {
    log((l) => l.error('Database error:', error));
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { contactId } = await req.json();

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const result = await query(
      (sql) =>
        sql`DELETE FROM contacts WHERE contact_id = ${contactId} RETURNING *`,
      { transform: mapRecordToObject }
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    log((l) => l.verbose('[[AUDIT]] -  Contact deleted:', result[0]));
    return NextResponse.json(
      {
        message: 'Contact deleted successfully',
        contact: result[0],
      },
      { status: 200 }
    );
  } catch (error) {
    log((l) => l.error('Database error:', error));
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
