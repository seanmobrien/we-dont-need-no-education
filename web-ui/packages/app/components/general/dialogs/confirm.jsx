'use client';
import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
export function ConfirmationDialog({ open, title, message, confirmText = 'OK', confirmColor = 'primary', cancelText = 'Cancel', onClose, options, onSelectOption, showInput, inputLabel, inputDefaultValue = '', onInput, }) {
    const [selectedOption, setSelectedOption] = React.useState(null);
    const [inputValue, setInputValue] = React.useState(inputDefaultValue);
    React.useEffect(() => {
        if (open) {
            setSelectedOption(options && options.length > 0 ? options[0].value : null);
            setInputValue(inputDefaultValue);
        }
    }, [open, options, inputDefaultValue]);
    const handleConfirm = () => {
        if (onSelectOption && options) {
            onSelectOption(selectedOption);
        }
        else if (onInput && showInput) {
            onInput(inputValue.trim() || null);
        }
        else {
            onClose(true);
        }
    };
    const handleCancel = () => {
        if (onSelectOption) {
            onSelectOption(null);
        }
        else if (onInput) {
            onInput(null);
        }
        else {
            onClose(false);
        }
    };
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && showInput) {
            event.preventDefault();
            handleConfirm();
        }
    };
    return (<Dialog open={open} onClose={handleCancel} aria-labelledby="confirmation-dialog-title" maxWidth="sm" fullWidth>
      <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
      <DialogContent>
        {message && <DialogContentText>{message}</DialogContentText>}

        {showInput && (<TextField autoFocus margin="dense" label={inputLabel} type="text" fullWidth variant="outlined" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}/>)}

        {options && options.length > 0 && (<RadioGroup value={selectedOption} onChange={(e) => {
                const option = options.find((opt) => String(opt.value) === e.target.value);
                if (option) {
                    setSelectedOption(option.value);
                }
            }}>
            {options.map((option, index) => (<FormControlLabel key={index} value={String(option.value)} control={<Radio />} label={option.label}/>))}
          </RadioGroup>)}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="inherit">
          {cancelText}
        </Button>
        <Button onClick={handleConfirm} color={confirmColor} variant="contained" autoFocus={!showInput}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>);
}
export function useConfirmationDialog() {
    const [dialogState, setDialogState] = React.useState({
        open: false,
        props: { title: '' },
    });
    const resolveRef = React.useRef(null);
    const show = React.useCallback((props) => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setDialogState({
                open: true,
                props: props,
                resolve: resolve,
            });
        });
    }, []);
    const handleClose = React.useCallback((result) => {
        if (resolveRef.current) {
            resolveRef.current(result);
            resolveRef.current = null;
        }
        setDialogState((prev) => ({ ...prev, open: false }));
    }, []);
    const Dialog = React.useMemo(() => function ConfirmationDialogWrapper() {
        return (<ConfirmationDialog {...dialogState.props} open={dialogState.open} onClose={handleClose} onSelectOption={dialogState.props.onSelectOption
                ? (value) => {
                    if (dialogState.props.onSelectOption) {
                        dialogState.props.onSelectOption(value);
                    }
                    handleClose(value);
                }
                : undefined} onInput={dialogState.props.onInput
                ? (value) => {
                    if (dialogState.props.onInput) {
                        dialogState.props.onInput(value);
                    }
                    handleClose(value);
                }
                : undefined}/>);
    }, [dialogState.open, dialogState.props, handleClose]);
    return {
        show,
        Dialog,
    };
}
//# sourceMappingURL=confirm.jsx.map