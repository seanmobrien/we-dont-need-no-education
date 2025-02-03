/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmailForm from 'components/email-message/email-form';
import { logger } from 'lib/logger';
import { generateUniqueId } from 'lib/react-util';

jest.mock('lib/logger');
jest.mock('lib/react-util');

describe('EmailForm', () => {
  const mockFetch = jest.fn();

  beforeAll(() => {
    global.fetch = mockFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the form with initial values', () => {
    const { asFragment } = render(<EmailForm />);
    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByLabelText(/Sender ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Contents/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sent Timestamp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Thread ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Parent Email ID/i)).toBeInTheDocument();
  });

  it('should display a message when email is created successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Email created successfully!' }),
    });

    render(<EmailForm />);

    fireEvent.change(screen.getByLabelText(/Sender ID/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/Subject/i), {
      target: { value: 'Test Subject' },
    });
    fireEvent.change(screen.getByLabelText(/Email Contents/i), {
      target: { value: 'Test Body' },
    });
    fireEvent.change(screen.getByLabelText(/Sent Timestamp/i), {
      target: { value: '2023-01-01T00:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Email/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Email created successfully!/i)
      ).toBeInTheDocument();
    });
  });

  it('should display an error message when email creation fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Something went wrong.' }),
    });

    render(<EmailForm />);

    fireEvent.change(screen.getByLabelText(/Sender ID/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/Subject/i), {
      target: { value: 'Test Subject' },
    });
    fireEvent.change(screen.getByLabelText(/Email Contents/i), {
      target: { value: 'Test Body' },
    });
    fireEvent.change(screen.getByLabelText(/Sent Timestamp/i), {
      target: { value: '2023-01-01T00:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Email/i }));

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong./i)).toBeInTheDocument();
    });
  });

  it('should display a network error message when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<EmailForm />);

    fireEvent.change(screen.getByLabelText(/Sender ID/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/Subject/i), {
      target: { value: 'Test Subject' },
    });
    fireEvent.change(screen.getByLabelText(/Email Contents/i), {
      target: { value: 'Test Body' },
    });
    fireEvent.change(screen.getByLabelText(/Sent Timestamp/i), {
      target: { value: '2023-01-01T00:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Email/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Network error. Please try again./i)
      ).toBeInTheDocument();
    });
  });

  it('should fetch and populate email details when editing', async () => {
    const mockEmailData = {
      sender_id: 1,
      subject: 'Test Subject',
      body: 'Test Body',
      sent_timestamp: '2023-01-01T00:00:00Z',
      thread_id: 2,
      parent_email_id: 3,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmailData,
    });

    render(<EmailForm emailId={1} />);

    await waitFor(() => {
      expect(document.getElementById('senderId-unique-id-1')).toHaveValue(1);
      expect(document.getElementById('subject-unique-id-1')).toHaveValue(
        'Test Subject'
      );
      expect(document.getElementById('emailContents-unique-id-1')).toHaveValue(
        'Test Body'
      );
      expect(
        document.getElementById('sentTimestamp-unique-id-1')
      ).toHaveAttribute('value', '2023-01-01T00:00:00Z');
      expect(document.getElementById('threadId-unique-id-1')).toHaveValue(2);
      expect(document.getElementById('parentEmailId-unique-id-1')).toHaveValue(
        3
      );
    });
  }, 5000);

  it('should display an error message when fetching email details fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error fetching email details.' }),
    });

    render(<EmailForm emailId={1} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Error fetching email details./i)
      ).toBeInTheDocument();
    });
  }, 3000);
});
