import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotesPanel } from '@/app/messages/email/[emailId]/notes/panel';
const mockNoteProperty = {
    propertyId: 'note-test-id',
    documentId: 1,
    typeId: 102,
    createdOn: new Date('2023-01-01T14:30:00'),
    value: 'This is a detailed note about the email content.\nIt contains multiple lines\nand important observations.',
    policy_basis: ['FERPA', 'HIPAA'],
    tags: ['important', 'follow-up'],
    typeName: 'Manual Note',
    categoryId: 3,
    categoryName: 'Note',
};
describe('NotesPanel', () => {
    it('renders note details correctly', () => {
        render(<NotesPanel row={mockNoteProperty}/>);
        expect(screen.getByText('Note (note-test-id)')).toBeInTheDocument();
        expect(screen.getByText(/This is a detailed note about the email content/)).toBeInTheDocument();
    });
    it('preserves line breaks in note content', () => {
        render(<NotesPanel row={mockNoteProperty}/>);
        const noteContent = screen.getByText(/This is a detailed note about the email content/);
        expect(noteContent).toHaveStyle('white-space: pre-wrap');
    });
    it('displays type information', () => {
        render(<NotesPanel row={mockNoteProperty}/>);
        expect(screen.getByText('Manual Note')).toBeInTheDocument();
    });
    it('displays formatted creation date', () => {
        render(<NotesPanel row={mockNoteProperty}/>);
        expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument();
    });
    it('displays property ID and document ID in metadata', () => {
        render(<NotesPanel row={mockNoteProperty}/>);
        expect(screen.getByText('note-test-id')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });
    it('displays policy basis and tags in metadata', () => {
        render(<NotesPanel row={mockNoteProperty}/>);
        expect(screen.getByText('FERPA')).toBeInTheDocument();
        expect(screen.getByText('HIPAA')).toBeInTheDocument();
        expect(screen.getByText('important')).toBeInTheDocument();
        expect(screen.getByText('follow-up')).toBeInTheDocument();
    });
    it('handles missing optional fields gracefully', () => {
        const minimalNote = {
            propertyId: 'minimal-note',
            documentId: 1,
            typeId: 102,
            createdOn: new Date('2023-01-01'),
            value: 'Simple note',
        };
        render(<NotesPanel row={minimalNote}/>);
        expect(screen.getByText('Simple note')).toBeInTheDocument();
        expect(screen.getAllByText('Note (minimal-note)')).toHaveLength(1);
        expect(screen.getByText('No policy basis specified')).toBeInTheDocument();
        expect(screen.getByText('No tags specified')).toBeInTheDocument();
    });
    it('handles missing creation date', () => {
        const noteWithoutDate = {
            ...mockNoteProperty,
            createdOn: undefined,
        };
        render(<NotesPanel row={noteWithoutDate}/>);
        expect(screen.getByText('Not specified')).toBeInTheDocument();
    });
    it('handles empty policy basis and tags arrays', () => {
        const noteWithEmptyArrays = {
            ...mockNoteProperty,
            policy_basis: [],
            tags: [],
        };
        render(<NotesPanel row={noteWithEmptyArrays}/>);
        expect(screen.getByText('No policy basis specified')).toBeInTheDocument();
        expect(screen.getByText('No tags specified')).toBeInTheDocument();
    });
    it('displays long note content properly', () => {
        const longNote = {
            ...mockNoteProperty,
            value: 'This is a very long note that contains a lot of information about the email and its contents. '.repeat(10),
        };
        render(<NotesPanel row={longNote}/>);
        expect(screen.getByText(/This is a very long note/)).toBeInTheDocument();
    });
    it('handles special characters in note content', () => {
        const noteWithSpecialChars = {
            ...mockNoteProperty,
            value: 'Note with special chars: @#$%^&*()_+-={}[]|\\:";\'<>?,./',
        };
        render(<NotesPanel row={noteWithSpecialChars}/>);
        expect(screen.getByText(/Note with special chars/)).toBeInTheDocument();
    });
});
//# sourceMappingURL=notes-panel.test.jsx.map