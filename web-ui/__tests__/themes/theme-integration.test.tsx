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
    expect(document.documentElement.getAttribute('data-theme')).toBeTruthy();
  });
});