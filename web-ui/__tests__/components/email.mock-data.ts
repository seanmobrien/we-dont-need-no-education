import {
  EmailMessage,
  EmailMessageSummary,
} from '/data-models/api/email-message';

export const mockEmailSummary: () => EmailMessageSummary[] = () => [
  {
    ...{
      emailId: '1',
      sender: {
        contactId: 1,
        name: 'John Smith',
        email: ' jsmith@notmicrosoft.com',
      },
      recipients: [
        {
          contactId: 2,
          name: 'Jane Smith',
          email: ' jsmith@notmicrosoft.com',
        },
      ],
      subject: 'Test Subject 1',
      sentOn: '2023-01-01T00:00:00Z',
      threadId: 2,
    },
  },
  {
    ...{
      emailId: '2',
      sender: {
        contactId: 2,
        email: 'jdoe@test.com',
        name: 'Jane Doe',
      },
      recipients: [
        {
          contactId: 2,
          name: 'Jane Smith',
          email: ' jsmith@notmicrosoft.com',
        },
      ],
      subject: 'Test Subject 2',
      sentOn: new Date('2023-01-02T00:00:00'),
    },
  },
];

export const mockEmail = ({
  emailId = 0,
  ...props
}: {
  emailId?: number;
} = {}): EmailMessage => {
  const src = mockEmailSummary().find(
    (email) => email.emailId === (emailId || '1'),
  );
  if (!src) {
    throw new Error(`Email with id ${emailId} not found`);
  }
  return {
    ...src,
    body: 'Test Body',
    parentEmailId: '3',
    ...(props ?? {}),
  };
};
