'use client';

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  TextField,
  RadioGroup,
  Radio,
  FormControlLabel,
} from '@mui/material';

/**
 * Option for confirmation dialog with selection
 */
export type ConfirmationDialogOption<T = unknown> = {
  label: string;
  value: T;
};

/**
 * Props for ConfirmationDialog component
 */
export interface ConfirmationDialogProps<T = unknown> {
  open: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onClose: (result: boolean) => void;
  options?: ConfirmationDialogOption<T>[];
  onSelectOption?: (option: T | null) => void;
  showInput?: boolean;
  inputLabel?: string;
  inputDefaultValue?: string;
  onInput?: (value: string | null) => void;
}

/**
 * A reusable confirmation dialog component that supports:
 * - Simple yes/no confirmation
 * - Selection from a list of options
 * - Text input prompts
 *
 * @example Simple confirmation
 * ```tsx
 * <ConfirmationDialog
 *   open={open}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item?"
 *   onClose={(confirmed) => {
 *     if (confirmed) {
 *       // delete item
 *     }
 *     setOpen(false);
 *   }}
 * />
 * ```
 *
 * @example Selection from options
 * ```tsx
 * <ConfirmationDialog
 *   open={open}
 *   title="Select Priority"
 *   message="Choose a priority level:"
 *   options={[
 *     { label: 'High', value: 'high' },
 *     { label: 'Medium', value: 'medium' },
 *     { label: 'Low', value: 'low' },
 *   ]}
 *   onSelectOption={(value) => {
 *     if (value) {
 *       setPriority(value);
 *     }
 *     setOpen(false);
 *   }}
 *   onClose={() => setOpen(false)}
 * />
 * ```
 *
 * @example Text input
 * ```tsx
 * <ConfirmationDialog
 *   open={open}
 *   title="Enter Name"
 *   showInput
 *   inputLabel="List Name"
 *   inputDefaultValue=""
 *   onInput={(value) => {
 *     if (value) {
 *       createList(value);
 *     }
 *     setOpen(false);
 *   }}
 *   onClose={() => setOpen(false)}
 * />
 * ```
 */
export function ConfirmationDialog<T = unknown>({
  open,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onClose,
  options,
  onSelectOption,
  showInput,
  inputLabel,
  inputDefaultValue = '',
  onInput,
}: ConfirmationDialogProps<T>) {
  const [selectedOption, setSelectedOption] = React.useState<T | null>(null);
  const [inputValue, setInputValue] = React.useState(inputDefaultValue);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedOption(options && options.length > 0 ? options[0].value : null);
      setInputValue(inputDefaultValue);
    }
  }, [open, options, inputDefaultValue]);

  const handleConfirm = () => {
    if (onSelectOption && options) {
      onSelectOption(selectedOption);
    } else if (onInput && showInput) {
      onInput(inputValue.trim() || null);
    } else {
      onClose(true);
    }
  };

  const handleCancel = () => {
    if (onSelectOption) {
      onSelectOption(null);
    } else if (onInput) {
      onInput(null);
    } else {
      onClose(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && showInput) {
      event.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      aria-labelledby="confirmation-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
      <DialogContent>
        {message && <DialogContentText>{message}</DialogContentText>}

        {showInput && (
          <TextField
            autoFocus
            margin="dense"
            label={inputLabel}
            type="text"
            fullWidth
            variant="outlined"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        )}

        {options && options.length > 0 && (
          <RadioGroup
            value={selectedOption}
            onChange={(e) => {
              const option = options.find(
                (opt) => String(opt.value) === e.target.value,
              );
              if (option) {
                setSelectedOption(option.value);
              }
            }}
          >
            {options.map((option, index) => (
              <FormControlLabel
                key={index}
                value={String(option.value)}
                control={<Radio />}
                label={option.label}
              />
            ))}
          </RadioGroup>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="inherit">
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color="primary"
          variant="contained"
          autoFocus={!showInput}
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
 * const confirm = useConfirmationDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm.show({
 *     title: 'Delete Item',
 *     message: 'Are you sure?'
 *   });
 *   if (confirmed) {
 *     // delete item
 *   }
 * };
 * ```
 */
export function useConfirmationDialog() {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    props: Omit<ConfirmationDialogProps, 'open' | 'onClose'>;
    resolve?: (value: boolean | unknown) => void;
  }>({
    open: false,
    props: { title: '' },
  });

  const resolveRef = React.useRef<((value: boolean | unknown) => void) | null>(
    null,
  );

  const show = React.useCallback(
    <T,>(props: Omit<ConfirmationDialogProps<T>, 'open' | 'onClose'>) => {
      return new Promise<boolean | T | null>((resolve) => {
        resolveRef.current = resolve as (value: boolean | unknown) => void;
        setDialogState({
          open: true,
          props: props as Omit<ConfirmationDialogProps, 'open' | 'onClose'>,
          resolve: resolve as (value: boolean | unknown) => void,
        });
      });
    },
    [],
  );

  const handleClose = React.useCallback((result: boolean | unknown) => {
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
    setDialogState((prev) => ({ ...prev, open: false }));
  }, []);

  const Dialog = React.useMemo(
    () =>
      function ConfirmationDialogWrapper() {
        return (
          <ConfirmationDialog
            {...dialogState.props}
            open={dialogState.open}
            onClose={handleClose}
            onSelectOption={
              dialogState.props.onSelectOption
                ? (value) => {
                    if (dialogState.props.onSelectOption) {
                      dialogState.props.onSelectOption(value);
                    }
                    handleClose(value);
                  }
                : undefined
            }
            onInput={
              dialogState.props.onInput
                ? (value) => {
                    if (dialogState.props.onInput) {
                      dialogState.props.onInput(value);
                    }
                    handleClose(value);
                  }
                : undefined
            }
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
