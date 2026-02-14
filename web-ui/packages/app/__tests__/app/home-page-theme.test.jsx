import { render, screen } from '@/__tests__/test-utils';
import { ThemeProvider } from '@compliance-theater/themes';
import HomePage from '@/app/page';
jest.mock('next-auth/react', () => ({
    useSession: jest.fn(() => ({
        data: null,
        status: 'unauthenticated',
    })),
}));
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    })),
}));
describe('Home Page Theme Support', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-theme');
    });
    it('renders home page with light theme support', () => {
        const ColorfulHomePage = () => (<ThemeProvider defaultTheme="light">
        <HomePage />
      </ThemeProvider>);
        const { container } = render(<ColorfulHomePage />);
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(screen.getByText(/Title IX Victim Advocacy Platform/i)).toBeInTheDocument();
        expect(container).toBeInTheDocument();
    });
    it('renders home page with dark theme support', () => {
        const DarkHomePage = () => (<ThemeProvider defaultTheme="dark">
        <HomePage />
      </ThemeProvider>);
        const { container } = render(<DarkHomePage />);
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(screen.getByText(/Title IX Victim Advocacy Platform/i)).toBeInTheDocument();
        expect(container).toBeInTheDocument();
    });
    it('home page uses MUI components for theme-aware styling', () => {
        const ThemedHomePage = () => (<ThemeProvider defaultTheme="light">
        <HomePage />
      </ThemeProvider>);
        const { container } = render(<ThemedHomePage />);
        const mainContainer = container.firstChild;
        expect(mainContainer).toBeInTheDocument();
        expect(screen.getByText(/Empowering victims/i)).toBeInTheDocument();
        expect(screen.getByText(/Why We Built This/i)).toBeInTheDocument();
    });
});
//# sourceMappingURL=home-page-theme.test.jsx.map