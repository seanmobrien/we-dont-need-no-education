import { mapContacts } from '/lib/email/import/google/utilities';
import { ParsedHeaderMap } from '/lib/email/parsedHeaderMap';
import type { gmail_v1 } from 'googleapis';

describe('mapContacts', () => {
  it('should map contacts from raw headers', () => {
    const headers: gmail_v1.Schema$MessagePart['headers'] = [
      { name: 'To', value: 'John Doe <john@example.com>' },
      { name: 'Cc', value: 'Jane Doe <jane@example.com>' },
      { name: 'From', value: 'Sender <sender@example.com>' },
    ];
    const contacts = mapContacts(headers);
    expect(contacts).toEqual([
      {
        fullName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        recipientType: 'to',
      },
      {
        fullName: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        recipientType: 'cc',
      },
      {
        fullName: 'Sender',
        firstName: 'Sender',
        lastName: '',
        email: 'sender@example.com',
        recipientType: 'from',
      },
    ]);
  });

  it('should map contacts from a ParsedHeaderMap', () => {
    const headers = new ParsedHeaderMap([
      ['To', ['John Doe <john@example.com>']],
      ['Cc', ['Jane Doe <jane@example.com>']],
      ['From', ['Sender <sender@example.com>']],
    ]);
    const contacts = mapContacts(headers);
    expect(contacts).toEqual([
      {
        fullName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        recipientType: 'to',
      },
      {
        fullName: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        recipientType: 'cc',
      },
      {
        fullName: 'Sender',
        firstName: 'Sender',
        lastName: '',
        email: 'sender@example.com',
        recipientType: 'from',
      },
    ]);
  });

  it('should handle undefined headers', () => {
    const contacts = mapContacts(undefined);
    expect(contacts).toEqual([]);
  });

  it('should filter out headers not in recipientHeaderNames', () => {
    const headers: gmail_v1.Schema$MessagePart['headers'] = [
      { name: 'To', value: 'John Doe <john@example.com>' },
      { name: 'Bcc', value: 'Jane Doe <jane@example.com>' },
      { name: 'From', value: 'Sender <sender@example.com>' },
    ];
    const contacts = mapContacts(headers, ['To']);
    expect(contacts).toEqual([
      {
        fullName: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        recipientType: 'to',
      },
    ]);
  });

  it('should return an empty array if no valid contacts are found', () => {
    const headers: gmail_v1.Schema$MessagePart['headers'] = [
      { name: 'To', value: 'Invalid Contact' },
    ];
    const contacts = mapContacts(headers);
    expect(contacts).toEqual([]);
  });
});
