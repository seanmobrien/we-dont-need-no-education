import { render, screen } from '@/__tests__/test-utils';
import { ThemeProvider } from '@compliance-theater/themes';
import HomePage from '@/app/page';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
}));

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

    // Verify the page renders with the new homepage content
    expect(screen.getByText(/Title IX Victim Advocacy Platform/i)).toBeInTheDocument();
    expect(container).toBeInTheDocument();
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

    // Verify the page renders with the new homepage content
    expect(screen.getByText(/Title IX Victim Advocacy Platform/i)).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  it('home page uses MUI components for theme-aware styling', () => {
    const ThemedHomePage = () => (
      <ThemeProvider defaultTheme="light">
        <HomePage />
      </ThemeProvider>
    );

    const { container } = render(<ThemedHomePage />);

    // The home page should use MUI Box components which get MUI styling
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer).toBeInTheDocument();
    
    // Verify key content sections are present
    expect(screen.getByText(/Empowering victims/i)).toBeInTheDocument();
    expect(screen.getByText(/Why We Built This/i)).toBeInTheDocument();
  });
});
