import { render, screen } from '@/__tests__/test-utils';
import { ThemeSelector } from '@compliance-theater/themes';
jest.mock('next/navigation', () => ({
    useParams: () => ({}),
}));
const TestComponent = () => (<div data-testid="theme-test">
    <ThemeSelector />
    <div>Test content</div>
  </div>);
describe('Theme Integration', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-theme');
    });
    it('renders ThemeSelector without crashing', async () => {
        render(<TestComponent />);
        expect(screen.getByLabelText('Change Theme')).toBeInTheDocument();
    });
    it('applies light theme data attribute correctly', () => {
        render(<TestComponent />, { theme: 'light' });
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
    it('switches to dark theme correctly', () => {
        const DarkThemeComponent = () => (<div data-testid="dark-theme-test">
        <ThemeSelector />
      </div>);
        render(<DarkThemeComponent />, { theme: 'dark' });
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
});
//# sourceMappingURL=theme-integration.test.jsx.map