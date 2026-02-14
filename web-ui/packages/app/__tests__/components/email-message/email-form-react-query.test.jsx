jest.mock('@/components/contact/contact-dropdown', () => {
    return {
        __esModule: true,
        default: () => {
            return (<select data-testid="contact-dropdown">
          <option value="1">Contact 1</option>
          <option value="2">Contact 2</option>
        </select>);
        },
    };
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmailForm from '@/components/email-message/form';
import { useEmail, useWriteEmail } from '@/lib/hooks/use-email';
import { asErrorLike } from '@/lib/react-util';
import { hideConsoleOutput } from '@/__tests__/test-utils';
jest.mock('@/lib/hooks/use-email', () => ({
    useEmail: jest.fn(),
    useWriteEmail: jest.fn(),
}));
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        back: jest.fn(),
    }),
}));
global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve([]),
}));
const makeError = (message) => {
    return asErrorLike({
        name: 'Error',
        message,
        stack: 'Error: ' + message + '\n    at Object.<anonymous> (test.js:1:1)',
    });
};
const mockedUseEmail = useEmail;
const mockedUseWriteEmail = useWriteEmail;
const mockConsole = hideConsoleOutput();
describe('EmailForm with React Query', () => {
    const mockMutateAsync = jest.fn();
    const mockWriteEmailMutation = {
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
    };
    beforeEach(() => {
        mockedUseWriteEmail.mockReturnValue(mockWriteEmailMutation);
    });
    afterEach(() => {
        mockConsole.dispose();
    });
    it('should render form for creating new email', () => {
        mockedUseEmail.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: null,
        });
        render(<EmailForm emailId={null} withButtons={true}/>);
        expect(screen.getByTestId('submit-button')).toBeInTheDocument();
        expect(screen.getByLabelText(/email contents/i)).toBeInTheDocument();
    });
    it('should load and display existing email data', async () => {
        const mockEmail = {
            emailId: '123',
            subject: 'Test Subject',
            body: 'Test Body',
            sender: { contactId: 1, name: 'Test Sender', email: 'test@example.com' },
            recipients: [],
            sentOn: new Date('2024-01-01'),
            threadId: null,
            parentEmailId: null,
        };
        mockedUseEmail.mockReturnValue({
            data: mockEmail,
            isLoading: false,
            error: null,
        });
        render(<EmailForm emailId="123" withButtons={true}/>);
        await waitFor(() => {
            expect(screen.getByDisplayValue('Test Subject')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Test Body')).toBeInTheDocument();
        });
        expect(screen.getByText('Edit Email')).toBeInTheDocument();
    });
    it('should show loading state when fetching email', () => {
        mockedUseEmail.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
        });
        render(<EmailForm emailId="123" withButtons={true}/>);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
    it('should show error when email fetch fails', () => {
        mockedUseEmail.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: makeError('Failed to fetch email'),
        });
        render(<EmailForm emailId="123" withButtons={true}/>);
        expect(screen.getByText('Failed to fetch email')).toBeInTheDocument();
    });
    it('should save email using React Query mutation', async () => {
        mockedUseEmail.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: null,
        });
        const mockSavedEmail = {
            emailId: '123',
            subject: 'New Subject',
            body: 'New Body',
        };
        mockMutateAsync.mockResolvedValue(mockSavedEmail);
        render(<EmailForm emailId={null} withButtons={true}/>);
        fireEvent.change(screen.getByLabelText(/subject/i), {
            target: { value: 'New Subject' },
        });
        fireEvent.change(screen.getByLabelText(/email contents/i), {
            target: { value: 'New Body' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create email/i }));
        await waitFor(() => {
            expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
                subject: 'New Subject',
                body: 'New Body',
            }));
        });
    });
    it('should show saving state during mutation', () => {
        mockedUseEmail.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: null,
        });
        mockedUseWriteEmail.mockReturnValue({
            ...mockWriteEmailMutation,
            isPending: true,
        });
        render(<EmailForm emailId={null} withButtons={true}/>);
        expect(screen.getByText('Submitting...')).toBeInTheDocument();
    });
    it('should handle save errors properly', async () => {
        mockConsole.setup();
        mockedUseEmail.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: null,
        });
        const error = makeError('Save failed');
        const mockErrorMutation = {
            mutateAsync: jest.fn().mockRejectedValue(error),
            isPending: false,
            isError: true,
            error,
        };
        mockedUseWriteEmail.mockReturnValue(mockErrorMutation);
        render(<EmailForm emailId={null} withButtons={true}/>);
        fireEvent.change(screen.getByLabelText(/subject/i), {
            target: { value: 'Test Subject' },
        });
        fireEvent.change(screen.getByLabelText(/email contents/i), {
            target: { value: 'Test Body' },
        });
        fireEvent.click(screen.getByRole('button', { name: /create email/i }));
        expect(mockErrorMutation.mutateAsync).toHaveBeenCalled();
    });
});
//# sourceMappingURL=email-form-react-query.test.jsx.map