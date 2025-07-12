// Utility function to replace classnames usage temporarily
// This provides a minimal replacement for removed tailwindcss-classnames functionality
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Note: This file contains legacy Tailwind class mappings that should be 
// replaced with proper CSS-in-JS or Material-UI styling.
// These styles are kept temporarily for compatibility but should be 
// migrated to emotion or Material-UI sx prop usage.

// Simple class name mappings for commonly used styles  
export const styles = {
  // Layout
  container: {
    margin: '0 auto',
    padding: '1.5rem',
    width: '100%',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  
  // Typography
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  error: {
    marginBottom: '0.5rem',
    color: '#ef4444',
  },
  loading: {
    color: '#6b7280',
  },
  
  // Forms
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    padding: '0.5rem',
    '&:focus': {
      outline: 'none',
      boxShadow: '0 0 0 3px rgb(59 130 246 / 0.3)',
    },
  },
  textarea: {
    width: '100%',
    border: '1px solid #d1d5db',
  },
  
  // Buttons
  button: {
    padding: '0.5rem',
    color: 'white',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease-in-out',
  },
  buttonPrimary: {
    backgroundColor: '#3b82f6',
    '&:hover': {
      backgroundColor: '#2563eb',
    },
  },
  buttonSecondary: {
    backgroundColor: '#10b981',
    '&:hover': {
      backgroundColor: '#059669',
    },
  },
  buttonDanger: {
    backgroundColor: '#ef4444',
    '&:hover': {
      backgroundColor: '#dc2626',
    },
  },
  
  // Table
  tableCell: {
    border: '1px solid #d1d5db',
    padding: '0.5rem',
  },
  
  // Spacing
  marginTop: {
    marginTop: '1rem',
  },
  marginRight: {
    marginRight: '0.5rem',
  },
  marginLeft: {
    marginLeft: '0.5rem',
  },
  
  // Display
  flex: {
    display: 'flex',
  },
  
  // Text
  fontSemibold: {
    fontWeight: 600,
  },
  alignTop: {
    verticalAlign: 'top',
  },
  
  // Width
  minWidthMax: {
    minWidth: 'max-content',
  },
} as const;