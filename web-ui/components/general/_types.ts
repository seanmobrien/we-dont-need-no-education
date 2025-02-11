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
