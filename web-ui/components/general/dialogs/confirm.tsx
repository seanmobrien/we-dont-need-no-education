'use client';

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

/**
 * Props for ConfirmDialog component
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'error' | 'warning' | 'info' | 'success';
  onClose: (confirmed: boolean) => void;
}

/**
 * A reusable confirmation dialog component
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={open}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item?"
 *   confirmText="Delete"
 *   confirmColor="error"
 *   onClose={(confirmed) => {
 *     if (confirmed) {
 *       deleteItem();
 *     }
 *     setOpen(false);
 *   }}
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  confirmColor = 'primary',
  onClose,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onClose(true);
  };

  const handleCancel = () => {
    onClose(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="inherit">
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color={confirmColor}
          variant="contained"
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Hook to manage confirmation dialog state
 * @returns Object with dialog controls
 *
 * @example
 * ```tsx
 * const confirm = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm.show({
 *     title: 'Delete Item',
 *     message: 'Are you sure?',
 *     confirmText: 'Delete',
 *     confirmColor: 'error',
 *   });
 *   if (confirmed) {
 *     deleteItem();
 *   }
 * };
 * ```
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    props: Omit<ConfirmDialogProps, 'open' | 'onClose'>;
    resolve?: (value: boolean) => void;
  }>({
    open: false,
    props: { title: '', message: '' },
  });

  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const show = React.useCallback(
    (props: Omit<ConfirmDialogProps, 'open' | 'onClose'>) => {
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setDialogState({
          open: true,
          props,
          resolve,
        });
      });
    },
    [],
  );

  const handleClose = React.useCallback((confirmed: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(confirmed);
      resolveRef.current = null;
    }
    setDialogState((prev) => ({ ...prev, open: false }));
  }, []);

  const Dialog = React.useMemo(
    () =>
      function ConfirmDialogWrapper() {
        return (
          <ConfirmDialog
            {...dialogState.props}
            open={dialogState.open}
            onClose={handleClose}
          />
        );
      },
    [dialogState.open, dialogState.props, handleClose],
  );

  return {
    show,
    Dialog,
  };
}
