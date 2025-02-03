export type ContactSummary = {
  contactId: number;
  name: string;
  email: string;
};

export type Contact = ContactSummary & {
  JobDescription: string;
  PhoneNumber: string;
  IsDistictStaff: boolean;
};
