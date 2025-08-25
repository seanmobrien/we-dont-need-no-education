/** @jsxImportSource @emotion/react */
//import React from 'react';
import { FC, ReactNode } from 'react';
import { css } from '@emotion/react';

const modalStyles = {
  overlay: css`
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
  `,
  content: css`
    background-color: #1f2937;
    color: #ffffff;
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    width: 91.666667%;
    
    @media (min-width: 768px) {
      width: 50%;
    }
    
    @media (min-width: 1024px) {
      width: 33.333333%;
    }
  `,
  header: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #374151;
  `,
  title: css`
    font-size: 1.25rem;
    line-height: 1.75rem;
    font-weight: 600;
  `,
  closeButton: css`
    color: #9ca3af;
    
    &:hover {
      color: #e5e7eb;
    }
  `,
  body: css`
    padding: 1rem;
  `,
  footer: css`
    display: flex;
    justify-content: flex-end;
    padding: 1rem;
    border-top: 1px solid #374151;
  `,
  saveButton: css`
    background-color: #059669;
    color: #ffffff;
    font-weight: 600;
    padding: 0.5rem 1rem;
    margin-right: 0.5rem;
    
    &:hover {
      background-color: #047857;
    }
  `,
  closeFooterButton: css`
    background-color: #2563eb;
    color: #ffffff;
    font-weight: 600;
    padding: 0.5rem 1rem;
    margin-right: 0.5rem;
    
    &:hover {
      background-color: #1d4ed8;
    }
  `,
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (args: unknown) => unknown;
  title: string;
  closeButtonText?: string;
  children: ReactNode;
}

const Modal: FC<ModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  children,
  closeButtonText = 'Close',
}) => {
  if (!isOpen) return null;

  return (
    <div css={modalStyles.overlay}>
      <div css={modalStyles.content}>
        <div css={modalStyles.header}>
          <h2 css={modalStyles.title}>{title}</h2>
          <button css={modalStyles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>
        <div css={modalStyles.body}>{children}</div>
        <div css={modalStyles.footer}>
          {onSave && (
            <button css={modalStyles.saveButton} onClick={onSave}>
              Save
            </button>
          )}
          <button css={modalStyles.closeFooterButton} onClick={onClose}>
            {closeButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
