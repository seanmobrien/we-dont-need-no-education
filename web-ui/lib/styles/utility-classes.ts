// Utility function to replace classnames usage temporarily
// This provides a minimal replacement for removed tailwindcss-classnames functionality
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Simple class name mappings for commonly used Tailwind classes
export const styles = {
  // Layout
  container: 'mx-auto p-6 w-full rounded-lg shadow-md',
  table: 'table w-full',
  
  // Typography
  title: 'text-xl font-semibold mb-4',
  error: 'text-red-500 mb-2',
  loading: 'text-gray-600',
  
  // Forms
  input: 'w-full border rounded p-2 focus:outline-none focus:ring focus:ring-blue-300',
  textarea: 'w-full border',
  
  // Buttons
  button: 'p-2 text-white rounded',
  buttonPrimary: 'bg-blue-500 hover:bg-blue-600',
  buttonSecondary: 'bg-green-500 hover:bg-green-600',
  buttonDanger: 'bg-red-500 hover:bg-red-600',
  
  // Table
  tableCell: 'border p-2',
  tableCellTop: 'border-t p-2',
  tableCellLeft: 'border-t border-l p-2',
  tableCellBottom: 'border-b p-2',
  tableCellFull: 'border-y border-r p-2',
  
  // Spacing
  marginTop: 'mt-4',
  marginRight: 'mr-2',
  marginLeft: 'ml-2',
  
  // Display
  flex: 'flex',
  
  // Text
  fontSemibold: 'font-semibold',
  alignTop: 'align-top',
  
  // Width
  minWidthMax: 'min-w-max',
};