import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmailHeaderPanel } from '@/app/messages/email/[emailId]/email-header/panel';
const mockEmailHeaderProperty = {
    propertyId: 'header-test-id',
    documentId: 1,
    typeId: 1,
    createdOn: new Date('2023-01-01T12:00:00'),
    value: 'john.doe@example.com',
    policy_basis: ['FERPA'],
    tags: ['sender'],
    typeName: 'From',
    categoryId: 1,
    categoryName: 'Email Header',
};
describe('EmailHeaderPanel', () => {
    it('renders email header details correctly', () => {
        render(<EmailHeaderPanel row={mockEmailHeaderProperty}/>);
        expect(screen.getByText('Email Header')).toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });
    it('displays header name and value', () => {
        render(<EmailHeaderPanel row={mockEmailHeaderProperty}/>);
        expect(screen.getByText('From')).toBeInTheDocument();
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });
    it('displays formatted creation date', () => {
        render(<EmailHeaderPanel row={mockEmailHeaderProperty}/>);
        expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument();
    });
    it('displays category information', () => {
        render(<EmailHeaderPanel row={mockEmailHeaderProperty}/>);
        expect(screen.getByText('Email Header')).toBeInTheDocument();
    });
    it('displays property ID and document ID in metadata', () => {
        render(<EmailHeaderPanel row={mockEmailHeaderProperty}/>);
        expect(screen.getByText('header-test-id')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });
    it('displays policy basis and tags in metadata', () => {
        render(<EmailHeaderPanel row={mockEmailHeaderProperty}/>);
        expect(screen.getByText('FERPA')).toBeInTheDocument();
        expect(screen.getByText('sender')).toBeInTheDocument();
    });
    it('shows email address interpretation for From header', () => {
        render(<EmailHeaderPanel row={mockEmailHeaderProperty}/>);
        expect(screen.getByText(/This header contains email address information for the from field/)).toBeInTheDocument();
    });
    it('shows email address interpretation for To header', () => {
        const toHeader = {
            ...mockEmailHeaderProperty,
            typeName: 'To',
            value: 'recipient@example.com',
        };
        render(<EmailHeaderPanel row={toHeader}/>);
        expect(screen.getByText(/This header contains email address information for the to field/)).toBeInTheDocument();
    });
    it('shows email address interpretation for Cc header', () => {
        const ccHeader = {
            ...mockEmailHeaderProperty,
            typeName: 'Cc',
            value: 'cc@example.com',
        };
        render(<EmailHeaderPanel row={ccHeader}/>);
        expect(screen.getByText(/This header contains email address information for the cc field/)).toBeInTheDocument();
    });
    it('does not show email interpretation for other header types', () => {
        const subjectHeader = {
            ...mockEmailHeaderProperty,
            typeName: 'Subject',
            value: 'Test Subject',
        };
        render(<EmailHeaderPanel row={subjectHeader}/>);
        expect(screen.queryByText(/This header contains email address information/)).not.toBeInTheDocument();
    });
    it('handles missing optional fields gracefully', () => {
        const minimalHeader = {
            propertyId: 'minimal-header',
            documentId: 1,
            typeId: 1,
            createdOn: new Date('2023-01-01'),
            value: 'test@example.com',
        };
        render(<EmailHeaderPanel row={minimalHeader}/>);
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('Unknown Header')).toBeInTheDocument();
        expect(screen.getByText('No policy basis specified')).toBeInTheDocument();
        expect(screen.getByText('No tags specified')).toBeInTheDocument();
    });
    it('handles long header values with word break', () => {
        const longValueHeader = {
            ...mockEmailHeaderProperty,
            value: 'very.long.email.address.that.should.break.properly@very.long.domain.name.example.com',
        };
        render(<EmailHeaderPanel row={longValueHeader}/>);
        const valueElement = screen.getByText(longValueHeader.value);
        expect(valueElement).toHaveStyle('word-break: break-all');
        expect(valueElement).toHaveStyle('font-family: monospace');
    });
    it('handles missing creation date', () => {
        const headerWithoutDate = {
            ...mockEmailHeaderProperty,
            createdOn: undefined,
        };
        render(<EmailHeaderPanel row={headerWithoutDate}/>);
        expect(screen.getByText('Not specified')).toBeInTheDocument();
    });
    it('handles empty policy basis and tags arrays', () => {
        const headerWithEmptyArrays = {
            ...mockEmailHeaderProperty,
            policy_basis: [],
            tags: [],
        };
        render(<EmailHeaderPanel row={headerWithEmptyArrays}/>);
        expect(screen.getByText('No policy basis specified')).toBeInTheDocument();
        expect(screen.getByText('No tags specified')).toBeInTheDocument();
    });
});
//# sourceMappingURL=email-header-panel.test.jsx.map