'use client';
import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
export function PromptDialog({ open, title, message, label = 'Value', defaultValue = '', confirmText = 'OK', cancelText = 'Cancel', onClose, multiline = false, rows = 4, required = false, }) {
    const [value, setValue] = React.useState(defaultValue);
    React.useEffect(() => {
        if (open) {
            setValue(defaultValue);
        }
    }, [open, defaultValue]);
    const handleConfirm = () => {
        const trimmedValue = value.trim();
        if (required && !trimmedValue) {
            return;
        }
        onClose(trimmedValue || null);
    };
    const handleCancel = () => {
        onClose(null);
    };
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !multiline) {
            event.preventDefault();
            handleConfirm();
        }
    };
    return (<Dialog open={open} onClose={handleCancel} aria-labelledby="prompt-dialog-title" maxWidth="sm" fullWidth>
      <DialogTitle id="prompt-dialog-title">{title}</DialogTitle>
      <DialogContent>
        {message && <DialogContentText>{message}</DialogContentText>}
        <TextField autoFocus margin="dense" label={label} type="text" fullWidth variant="outlined" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={handleKeyDown} multiline={multiline} rows={multiline ? rows : undefined} required={required} error={required && !value.trim()} helperText={required && !value.trim() ? 'This field is required' : ''}/>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="inherit">
          {cancelText}
        </Button>
        <Button onClick={handleConfirm} color="primary" variant="contained" disabled={required && !value.trim()}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>);
}
export function usePromptDialog() {
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
                props,
                resolve,
            });
        });
    }, []);
    const handleClose = React.useCallback((value) => {
        if (resolveRef.current) {
            resolveRef.current(value);
            resolveRef.current = null;
        }
        setDialogState((prev) => ({ ...prev, open: false }));
    }, []);
    const Dialog = React.useMemo(() => function PromptDialogWrapper() {
        return (<PromptDialog {...dialogState.props} open={dialogState.open} onClose={handleClose}/>);
    }, [dialogState.open, dialogState.props, handleClose]);
    return {
        show,
        Dialog,
    };
}
//# sourceMappingURL=prompt.jsx.map