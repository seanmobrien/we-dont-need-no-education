import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmailForm from '@/components/email-message/form';
import { useEmail, useWriteEmail } from '@/lib/hooks/use-email';
import { EmailMessage } from '@/data-models';

// Mock the React Query hooks
jest.mock('@/lib/hooks/use-email', () => ({
  useEmail: jest.fn(),
  useWriteEmail: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock fetch API for contacts
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([]),
  })
) as jest.Mock;

const mockedUseEmail = useEmail as jest.MockedFunction<typeof useEmail>;
const mockedUseWriteEmail = useWriteEmail as jest.MockedFunction<typeof useWriteEmail>;

describe('EmailForm with React Query', () => {
  const mockMutateAsync = jest.fn();
  const mockWriteEmailMutation = {
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseWriteEmail.mockReturnValue(mockWriteEmailMutation as any);
  });

  it('should render form for creating new email', () => {
    mockedUseEmail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);

    render(<EmailForm emailId={null} withButtons={true} />);

    expect(screen.getByText('Create Email')).toBeInTheDocument();
    expect(screen.getByLabelText(/email contents/i)).toBeInTheDocument();
  });

  it('should load and display existing email data', async () => {
    const mockEmail: EmailMessage = {
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
    } as any);

    render(<EmailForm emailId="123" withButtons={true} />);

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
    } as any);

    render(<EmailForm emailId="123" withButtons={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show error when email fetch fails', () => {
    mockedUseEmail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch email'),
    } as any);

    render(<EmailForm emailId="123" withButtons={true} />);

    expect(screen.getByText('Failed to fetch email')).toBeInTheDocument();
  });

  it('should save email using React Query mutation', async () => {
    mockedUseEmail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);

    const mockSavedEmail = {
      emailId: '123',
      subject: 'New Subject',
      body: 'New Body',
    };

    mockMutateAsync.mockResolvedValue(mockSavedEmail);

    render(<EmailForm emailId={null} withButtons={true} />);

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: 'New Subject' },
    });
    fireEvent.change(screen.getByLabelText(/email contents/i), {
      target: { value: 'New Body' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create email/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'New Subject',
          body: 'New Body',
        })
      );
    });
  });

  it('should show saving state during mutation', () => {
    mockedUseEmail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);

    mockedUseWriteEmail.mockReturnValue({
      ...mockWriteEmailMutation,
      isPending: true,
    } as any);

    render(<EmailForm emailId={null} withButtons={true} />);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  it('should handle save errors properly', async () => {
    mockedUseEmail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as any);

    // Mock a mutation that will fail
    const mockErrorMutation = {
      mutateAsync: jest.fn().mockRejectedValue(new Error('Save failed')),
      isPending: false,
      isError: true,
      error: new Error('Save failed'),
    };

    mockedUseWriteEmail.mockReturnValue(mockErrorMutation as any);

    render(<EmailForm emailId={null} withButtons={true} />);

    // Fill in form data and trigger submission to see the error
    fireEvent.change(screen.getByLabelText(/subject/i), {
      target: { value: 'Test Subject' },
    });
    fireEvent.change(screen.getByLabelText(/email contents/i), {
      target: { value: 'Test Body' },
    });

    // Submit form to trigger error
    fireEvent.click(screen.getByRole('button', { name: /create email/i }));

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});