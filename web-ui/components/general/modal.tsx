import React from 'react';
import {
  classnames,
  inset,
  display,
  overflow,
  padding,
  spacing,
  backgroundColor,
  zIndex,
  position,
  backgroundOpacity,
  alignItems,
  justifyContent,
  textColor,
  borderRadius,
  boxShadow,
  width,
  borderColor,
  borderWidth,
  fontWeight,
  fontSize,
} from 'tailwindcss-classnames';
import type { SaveModalEventArgs, ModalProps } from './_types';
export type { SaveModalEventArgs, ModalProps };

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  children,
  closeButtonText = 'Close',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className={classnames(
        inset('inset-0'),
        zIndex('z-50'),
        display('flex'),
        alignItems('items-center'),
        justifyContent('justify-center'),
        backgroundColor('bg-black'),
        position('fixed'),
        backgroundOpacity('bg-opacity-50')
      )}
    >
      <div
        className={classnames(
          backgroundColor('bg-gray-800'),
          textColor('text-white'),
          borderRadius('rounded-lg'),
          boxShadow('shadow-lg'),
          overflow('overflow-hidden'),
          width('w-11/12', 'md:w-1/2', 'lg:w-1/3')
        )}
      >
        <div
          className={classnames(
            display('flex'),
            justifyContent('justify-between'),
            alignItems('items-center'),
            spacing('p-4'),
            borderWidth('border-b'),
            borderColor('border-gray-700')
          )}
        >
          <h2
            className={classnames(
              fontSize('text-xl'),
              fontWeight('font-semibold')
            )}
          >
            {title}
          </h2>
          <button
            className={classnames(
              textColor('text-gray-400', 'hover:text-gray-200')
            )}
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className={classnames(spacing('p-4'))}>{children}</div>
        <div
          className={classnames(
            display('flex'),
            justifyContent('justify-end'),
            spacing('p-4'),
            borderWidth('border-t'),
            borderColor('border-gray-700')
          )}
        >
          {onSave && (
            <button
              className={classnames(
                backgroundColor('bg-green-600', 'hover:bg-green-700'),
                textColor('text-white'),
                fontWeight('font-semibold'),
                padding('py-2', 'px-4'),
                spacing('mr-2')
              )}
              onClick={onSave}
            >
              Save
            </button>
          )}
          <button
            className={classnames(
              backgroundColor('bg-blue-600'),
              backgroundColor('bg-blue-600', 'hover:bg-blue-700'),
              textColor('text-white'),
              fontWeight('font-semibold'),
              padding('py-2', 'px-4'),
              spacing('mr-2')
            )}
            onClick={onClose}
          >
            {closeButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
