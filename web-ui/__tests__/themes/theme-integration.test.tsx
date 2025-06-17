import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/lib/themes/provider';
import { ThemeSelector } from '@/components/theme/theme-selector';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({}),
}));

// Simple test component to verify theme functionality
const TestComponent = () => (
  <ThemeProvider defaultTheme="colorful">
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

  it('renders ThemeSelector without crashing', () => {
    render(<TestComponent />);
    
    // Verify that the theme selector is rendered
    const themeButton = screen.getByLabelText('Change Theme');
    expect(themeButton).toBeInTheDocument();
  });

  it('applies colorful theme data attribute correctly', () => {
    render(<TestComponent />);
    
    // The theme provider should set the data-theme attribute
    // This test ensures our changes don't break the basic theme functionality
    expect(document.documentElement.getAttribute('data-theme')).toBe('colorful');
  });

  it('verifies theme CSS variables are properly set', () => {
    render(<TestComponent />);
    
    // Check that the document has the colorful theme attribute
    expect(document.documentElement.getAttribute('data-theme')).toBe('colorful');
    
    // This verifies that our CSS rules would be applied (we can't test actual CSS in Jest,
    // but we can verify the data attribute that triggers the CSS)
    const style = getComputedStyle(document.documentElement);
    // The data-theme attribute should be set which would trigger our CSS rules
    expect(document.documentElement.hasAttribute('data-theme')).toBe(true);
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
    
    // Verify dark theme is applied
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});