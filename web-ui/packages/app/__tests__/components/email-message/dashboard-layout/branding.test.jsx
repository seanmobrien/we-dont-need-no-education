import React from 'react';
import { render, screen } from '@testing-library/react';
import { Branding } from '@/components/email-message/dashboard-layout/branding';
import '@testing-library/jest-dom';
jest.mock('next/image', () => {
    const MockImage = ({ src, alt, width, height, priority, ...props }) => {
        return (<img src={src} alt={alt} width={width} height={height} data-priority={priority} {...props}/>);
    };
    MockImage.displayName = 'MockImage';
    return MockImage;
});
describe('Branding Configuration', () => {
    describe('Structure and Properties', () => {
        it('should have a title property', () => {
            expect(Branding).toHaveProperty('title');
            expect(typeof Branding.title).toBe('string');
        });
        it('should have a logo property', () => {
            expect(Branding).toHaveProperty('logo');
            expect(React.isValidElement(Branding.logo)).toBe(true);
        });
        it('should have the correct title text', () => {
            expect(Branding.title).toBe('Mystery Compliance Theater 2000');
        });
    });
    describe('Logo Component', () => {
        it('should render the logo component without errors', () => {
            const { container } = render(<div>{Branding.logo}</div>);
            expect(container.firstChild).toBeInTheDocument();
        });
        it('should contain an image with correct attributes', () => {
            render(<div>{Branding.logo}</div>);
            const image = screen.getByRole('img');
            expect(image).toBeInTheDocument();
            expect(image).toHaveAttribute('src', '/static/logo/badge_40x40.png');
            expect(image).toHaveAttribute('alt', 'Mystery Compliance Theater 2000 Logo');
            expect(image).toHaveAttribute('width', '40');
            expect(image).toHaveAttribute('height', '40');
            expect(image).toHaveAttribute('data-priority', 'true');
        });
        it('should have the correct alt text matching the title', () => {
            render(<div>{Branding.logo}</div>);
            const image = screen.getByRole('img');
            expect(image).toHaveAttribute('alt', 'Mystery Compliance Theater 2000 Logo');
        });
    });
    describe('Logo Image Specifications', () => {
        it('should use the correct logo dimensions (40x40)', () => {
            render(<div>{Branding.logo}</div>);
            const image = screen.getByRole('img');
            expect(image).toHaveAttribute('width', '40');
            expect(image).toHaveAttribute('height', '40');
        });
        it('should use the correct logo path', () => {
            render(<div>{Branding.logo}</div>);
            const image = screen.getByRole('img');
            expect(image).toHaveAttribute('src', '/static/logo/badge_40x40.png');
        });
        it('should have priority loading enabled', () => {
            render(<div>{Branding.logo}</div>);
            const image = screen.getByRole('img');
            expect(image).toHaveAttribute('data-priority', 'true');
        });
    });
    describe('React Fragment Wrapper', () => {
        it('should be wrapped in a React fragment', () => {
            const { container } = render(<div>{Branding.logo}</div>);
            const wrapper = container.firstChild;
            expect(wrapper?.firstChild).toHaveAttribute('src', '/static/logo/badge_40x40.png');
        });
        it('should render as a single React element', () => {
            expect(React.isValidElement(Branding.logo)).toBe(true);
            expect(Branding.logo.type).toBe(React.Fragment);
        });
    });
    describe('Type Compatibility', () => {
        it('should satisfy BrandingConfig interface', () => {
            const config = {
                title: 'Test Title',
                logo: <span>Test Logo</span>,
            };
            expect(config).toBeDefined();
            expect(typeof config.title).toBe('string');
            expect(React.isValidElement(config.logo)).toBe(true);
        });
    });
    describe('Integration with Dashboard Layout', () => {
        it('should provide a valid configuration object for NextAppProvider', () => {
            expect(Branding.title).toBeTruthy();
            expect(React.isValidElement(Branding.logo)).toBe(true);
            const props = { branding: Branding };
            expect(props.branding.title).toBe('Mystery Compliance Theater 2000');
            expect(React.isValidElement(props.branding.logo)).toBe(true);
        });
    });
});
//# sourceMappingURL=branding.test.jsx.map