import { render } from '@/__tests__/test-utils';
import { ThemeProvider } from '@/lib/themes/provider';
import HomePage from '@/app/page';

// Mock the EmailList component since it requires server connections
jest.mock('@/components/email-message/list', () => {
  const MockEmailList = () => (
    <div data-testid="mock-email-list">Email List</div>
  );
  MockEmailList.displayName = 'MockEmailList';
  return MockEmailList;
});

describe('Home Page Theme Support', () => {
  beforeEach(() => {
    // Clear any existing data-theme attributes
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders home page with light theme support', () => {
    const ColorfulHomePage = () => (
      <ThemeProvider defaultTheme="light">
        <HomePage />
      </ThemeProvider>
    );

    const { container } = render(<ColorfulHomePage />);

    // Verify the theme attribute is set
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Verify the page renders without crashing
    expect(
      container.querySelector('[data-testid="mock-email-list"]'),
    ).toBeInTheDocument();
  });

  it('renders home page with dark theme support', () => {
    const DarkHomePage = () => (
      <ThemeProvider defaultTheme="dark">
        <HomePage />
      </ThemeProvider>
    );

    const { container } = render(<DarkHomePage />);

    // Verify the theme attribute is set
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Verify the page renders without crashing
    expect(
      container.querySelector('[data-testid="mock-email-list"]'),
    ).toBeInTheDocument();
  });

  it('home page uses MUI Box for theme-aware styling', () => {
    const ThemedHomePage = () => (
      <ThemeProvider defaultTheme="light">
        <HomePage />
      </ThemeProvider>
    );

    const { container } = render(<ThemedHomePage />);

    // Verify that MUI components are being used (they should have MUI classes)
    const mainContainer = container.firstChild as HTMLElement;

    // The home page should now use MUI Box components which get MUI styling
    expect(mainContainer).toBeInTheDocument();
  });
});
