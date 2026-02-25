'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

/**
 * Props for PromptDialog component
 */
export interface PromptDialogProps {
  open: boolean;
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onClose: (value: string | null) => void;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
}

/**
 * A reusable prompt dialog component for text input
 *
 * @example
 * ```tsx
 * <PromptDialog
 *   open={open}
 *   title="Enter Name"
 *   label="List Name"
 *   defaultValue=""
 *   onClose={(value) => {
 *     if (value) {
 *       createList(value);
 *     }
 *     setOpen(false);
 *   }}
 * />
 * ```
 */
export function PromptDialog({
  open,
  title,
  message,
  label = 'Value',
  defaultValue = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onClose,
  multiline = false,
  rows = 4,
  required = false,
}: PromptDialogProps) {
  const [value, setValue] = React.useState(defaultValue);

  // Reset value when dialog opens
  React.useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    const trimmedValue = value.trim();
    if (required && !trimmedValue) {
      return; // Don't close if required and empty
    }
    onClose(trimmedValue || null);
  };

  const handleCancel = () => {
    onClose(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !multiline) {
      event.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      aria-labelledby="prompt-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="prompt-dialog-title">{title}</DialogTitle>
      <DialogContent>
        {message && <DialogContentText>{message}</DialogContentText>}
        <TextField
          autoFocus
          margin="dense"
          label={label}
          type="text"
          fullWidth
          variant="outlined"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          multiline={multiline}
          rows={multiline ? rows : undefined}
          required={required}
          error={required && !value.trim()}
          helperText={required && !value.trim() ? 'This field is required' : ''}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="inherit">
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color="primary"
          variant="contained"
          disabled={required && !value.trim()}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Hook to manage prompt dialog state
 * @returns Object with dialog controls
 *
 * @example
 * ```tsx
 * const prompt = usePromptDialog();
 *
 * const handleCreate = async () => {
 *   const name = await prompt.show({
 *     title: 'Enter Name',
 *     label: 'Name',
 *   });
 *   if (name) {
 *     createItem(name);
 *   }
 * };
 * ```
 */
export function usePromptDialog() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    props: Omit<PromptDialogProps, 'open' | 'onClose'>;
    resolve?: (value: string | null) => void;
  }>({
    open: false,
    props: { title: '' },
  });

  const resolveRef = React.useRef<((value: string | null) => void) | null>(
    null,
  );

  const show = React.useCallback(
    (props: Omit<PromptDialogProps, 'open' | 'onClose'>) => {
      return new Promise<string | null>((resolve) => {
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

  const handleClose = React.useCallback((value: string | null) => {
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
    setDialogState((prev) => ({ ...prev, open: false }));
  }, []);

  const Dialog = React.useMemo(
    () =>
      function PromptDialogWrapper() {
        return (
          <PromptDialog
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
