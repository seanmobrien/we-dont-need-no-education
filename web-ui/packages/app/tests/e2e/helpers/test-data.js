export const mockEmails = [
    {
        id: 'email-1',
        subject: 'Welcome to the System',
        sender: 'admin@test.local',
        recipient: 'user@test.local',
        body: 'Welcome to our email management system. This is a test email.',
        date: '2024-01-15T10:00:00Z',
        read: false,
        priority: 'normal'
    },
    {
        id: 'email-2',
        subject: 'Policy Update Notification',
        sender: 'policy@school.edu',
        recipient: 'staff@school.edu',
        body: 'Please review the updated school policies in the attached document.',
        date: '2024-01-14T14:30:00Z',
        read: true,
        hasViolations: false,
        priority: 'high'
    },
    {
        id: 'email-3',
        subject: 'Student Conduct Issue',
        sender: 'teacher@school.edu',
        recipient: 'principal@school.edu',
        body: 'I need to report a concerning incident that occurred in class today.',
        date: '2024-01-13T16:45:00Z',
        read: false,
        hasViolations: true,
        priority: 'high'
    },
    {
        id: 'email-4',
        subject: 'Meeting Reminder',
        sender: 'scheduler@school.edu',
        recipient: 'staff@school.edu',
        body: 'Reminder: Staff meeting tomorrow at 3 PM in the main conference room.',
        date: '2024-01-12T09:00:00Z',
        read: true,
        priority: 'low'
    }
];
export const mockChatMessages = [
    {
        id: 'msg-1',
        role: 'user',
        content: 'Can you help me analyze this email for policy violations?',
        timestamp: '2024-01-15T11:00:00Z'
    },
    {
        id: 'msg-2',
        role: 'assistant',
        content: 'I\'d be happy to help you analyze the email. Please share the email content or upload the document.',
        timestamp: '2024-01-15T11:00:30Z'
    },
    {
        id: 'msg-3',
        role: 'user',
        content: 'Here is the email content: "I think the new principal is making terrible decisions..."',
        timestamp: '2024-01-15T11:01:00Z'
    }
];
export const mockBulkOperations = [
    {
        id: 'bulk-1',
        type: 'mark_read',
        emailIds: ['email-1', 'email-3'],
        status: 'completed'
    },
    {
        id: 'bulk-2',
        type: 'archive',
        emailIds: ['email-2', 'email-4'],
        status: 'pending'
    }
];
export const mockApiResponses = {
    emailList: {
        emails: mockEmails,
        total: mockEmails.length,
        page: 1,
        pageSize: 10
    },
    emailDetail: (emailId) => {
        const email = mockEmails.find(e => e.id === emailId);
        return email ? {
            ...email,
            thread: [email],
            attachments: [],
            analysis: {
                sentiment: 'neutral',
                violations: email.hasViolations ? ['policy-violation'] : [],
                keyPoints: ['Important information about ' + email.subject]
            }
        } : null;
    },
    chatHistory: {
        messages: mockChatMessages,
        chatId: 'test-chat-1'
    },
    searchResults: (query) => {
        const filteredEmails = mockEmails.filter(email => email.subject.toLowerCase().includes(query.toLowerCase()) ||
            email.body.toLowerCase().includes(query.toLowerCase()));
        return {
            emails: filteredEmails,
            total: filteredEmails.length,
            query
        };
    }
};
export const testConfig = {
    baseUrl: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    timeout: {
        short: 5000,
        medium: 15000,
        long: 30000
    },
    selectors: {
        navigation: {
            homeLink: '[href="/"], [data-testid="nav-home"]',
            emailsLink: '[href="/messages/email"], [data-testid="nav-emails"]',
            chatLink: '[href="/messages/chat"], [data-testid="nav-chat"]',
            bulkEditLink: '[href="/bulk-edit"], [data-testid="nav-bulk-edit"]'
        },
        email: {
            listItem: '[data-testid="email-item"], .email-list-item',
            subject: '[data-testid="email-subject"]',
            sender: '[data-testid="email-sender"]',
            date: '[data-testid="email-date"]',
            readStatus: '[data-testid="email-read-status"]'
        },
        chat: {
            messageInput: '[data-testid="chat-input"], textarea[placeholder*="message"]',
            sendButton: '[data-testid="send-button"], button:has-text("Send")',
            messageItem: '[data-testid="chat-message"]'
        },
        auth: {
            signInButton: 'button:has-text("Sign in")',
            signOutButton: 'button:has-text("Sign out")',
            emailInput: 'input[name="email"], input[type="email"]',
            passwordInput: 'input[name="password"], input[type="password"]'
        }
    }
};
//# sourceMappingURL=test-data.js.map