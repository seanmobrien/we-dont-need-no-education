export type ContactSummary = {
  contactId: number;
  name: string;
  email: string;
};

export type Contact = ContactSummary & {
  jobDescription: string;
  phoneNumber: string;
  isDistrictStaff: boolean;
};
