import { ReactNode } from 'react';

export type SaveModalEventArgs = {
  cancel: boolean;
  messages: string[];
  data: unknown;
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (args: unknown) => unknown;
  title: string;
  closeButtonText?: string;
  children: ReactNode;
}

/**
 * Represents a header cell in a table.
 *
 * @property {string} id - The unique identifier for the cell.
 * @property {string} label - The label for the cell.
 * @property {boolean} numeric - Indicates whether the cell contains numeric data.
 * @property {boolean} disablePadding - Indicates whether padding is disabled for the cell.
 */
export interface HeadCell {
  id: string;
  label: string;
  numeric: boolean;
  disablePadding: boolean;
  maxWidth?: string;
}
