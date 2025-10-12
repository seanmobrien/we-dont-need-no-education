import { render, screen } from '@/__tests__/test-utils';
import { ThemeProvider } from '@/lib/themes/provider';
import { ThemeSelector } from '@/components/theme/theme-selector';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({}),
}));

// Simple test component to verify theme functionality
const TestComponent = () => (
  <ThemeProvider defaultTheme="light">
    <div data-testid="theme-test">
      <ThemeSelector />
      <div>Test content</div>
    </div>
  </ThemeProvider>
);

describe('Theme Integration', () => {
  beforeEach(() => {
    // Clear any existing data-theme attributes
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders ThemeSelector without crashing', async () => {
    render(<TestComponent />);

    // This ensures any effects in ThemeProvider are applied
    // waitFor(() => screen.getByLabelText('Change Theme'));

    // Verify that the theme selector is rendered
    expect(screen.getByLabelText('Change Theme')).toBeInTheDocument();
  });

  it('applies light theme data attribute correctly', () => {
    render(<TestComponent />);
    /*
    act(() => {
      waitFor(() => screen.getByLabelText('Change Theme'));
    });
    */
    // The theme provider should set the data-theme attribute
    // This test ensures our changes don't break the basic theme functionality
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('switches to dark theme correctly', () => {
    const DarkThemeComponent = () => (
      <ThemeProvider defaultTheme="dark">
        <div data-testid="dark-theme-test">
          <ThemeSelector />
        </div>
      </ThemeProvider>
    );

    render(<DarkThemeComponent />);
    /*
    act(() => {
      waitFor(() => screen.getByLabelText('Change Theme'));
    });
    */
    // Verify dark theme is applied
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
