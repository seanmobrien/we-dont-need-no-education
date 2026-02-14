'use client';
import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import { styled } from '@mui/material/styles';
import { useCallback, useId, useState, useRef, useMemo } from 'react';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MaximizeIcon from '@mui/icons-material/CropSquare';
import RestoreIcon from '@mui/icons-material/FilterNone';
import CloseIcon from '@mui/icons-material/Close';
import ResizeableDraggablePaper from './resizeable-draggable-paper';
import { log } from '@compliance-theater/logger';
var WindowState;
(function (WindowState) {
    WindowState["Normal"] = "normal";
    WindowState["Minimized"] = "minimized";
    WindowState["Maximized"] = "maximized";
})(WindowState || (WindowState = {}));
const DraggableHandle = styled('div') `
  cursor: move;
  padding: 8px;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: 2px;
    background-color: ${({ theme }) => theme.palette.action.hover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: 2px;
  }
`;
const stableStyles = {
    dialogTitle: {
        marginY: 0,
        marginLeft: '1em',
    },
};
const WindowControls = styled('div') `
  display: flex;
  align-items: center;
  gap: 4px;
`;
const ResizableDraggableDialog = ({ isOpenState: open, paperProps, children, title, modal = false, width: width = 400, height: height = 300, dialogActions, onClose, onResize, minConstraints = [200, 200], }) => {
    const thisItemId = useId();
    const { dialogTitleId, dialogDraggableHandleId } = {
        dialogTitleId: `${thisItemId}-draggable-dialog-title`,
        dialogDraggableHandleId: `${thisItemId}-draggable-dialog`,
    };
    const dragHandleRef = useRef(null);
    const [windowState, setWindowState] = useState(WindowState.Normal);
    const handleClose = useCallback((evt, reason) => {
        if (!open) {
            return;
        }
        if (modal === true || reason !== 'backdropClick') {
            onClose(evt, reason ?? '');
        }
    }, [open, onClose, modal]);
    const handleMinimize = useCallback(() => {
        setWindowState(WindowState.Minimized);
    }, [setWindowState]);
    const handleMaximize = useCallback(() => {
        if (windowState === WindowState.Maximized) {
            setWindowState(WindowState.Normal);
        }
        else {
            setWindowState(WindowState.Maximized);
        }
    }, [windowState]);
    const handleCloseClick = useCallback((evt) => {
        handleClose(evt);
    }, [handleClose]);
    const RenderResizeableDraggablePaper = useCallback((muiPaperProps) => {
        let dialogHeight = height;
        let dialogWidth = width;
        if (windowState === WindowState.Maximized) {
            dialogHeight = window.innerHeight - 20;
            dialogWidth = window.innerWidth - 20;
        }
        else if (windowState === WindowState.Minimized) {
            dialogHeight = 40;
            dialogWidth = 300;
        }
        return (<ResizeableDraggablePaper {...(paperProps ?? {})} {...muiPaperProps} height={dialogHeight} width={dialogWidth} dialogId={dialogDraggableHandleId} minConstraints={minConstraints} maxConstraints={[
                window.innerWidth - 20,
                window.innerHeight - 20,
            ]} onResize={onResize}/>);
    }, [
        height,
        width,
        windowState,
        paperProps,
        dialogDraggableHandleId,
        minConstraints,
        onResize,
    ]);
    React.useEffect(() => {
        let newHeight = height;
        let newWidth = width;
        if (height < minConstraints[1]) {
            log((l) => l.warn(`initialHeight ${height} is outside constraints`));
            newHeight = minConstraints[1];
        }
        if (height > window.innerHeight - 20) {
            log((l) => l.warn(`initialHeight ${height} is outside constraints`));
            newHeight = window.innerHeight - 20;
        }
        if (width < minConstraints[0]) {
            log((l) => l.warn(`initialWidth ${width} is outside constraints`));
            newWidth = minConstraints[0];
        }
        if (width > window.innerWidth - 20) {
            log((l) => l.warn(`initialWidth ${width} is outside constraints`));
            newWidth = window.innerWidth - 20;
        }
        if (!onResize) {
            log((l) => l.warn('onResize callback is not provided, dynamic resizing will not work.'));
        }
        onResize?.(newWidth, newHeight);
    }, [height, width, minConstraints, onResize]);
    const dialogSlotProps = useMemo(() => ({
        root: {
            style: {
                pointerEvents: modal === false ? 'none' : 'auto',
            },
        },
    }), [modal]);
    const dialogSx = useMemo(() => ({
        ...(modal === false && {
            '& .MuiDialog-container': {
                pointerEvents: 'none',
            },
            '& .MuiDialog-paper': {
                pointerEvents: 'auto !important',
            },
        }),
    }), [modal]);
    return (<React.Fragment>
      <Dialog open={open} onClose={handleClose} PaperComponent={RenderResizeableDraggablePaper} hideBackdrop={modal === false} disableEnforceFocus={modal === false} aria-labelledby={dialogTitleId} slotProps={dialogSlotProps} sx={dialogSx}>
        <DraggableHandle ref={dragHandleRef} id={dialogDraggableHandleId} role="button" tabIndex={0} aria-label="Drag to move dialog. Use arrow keys to move, hold Shift for larger steps.">
          <Typography component="h3" sx={stableStyles.dialogTitle}>
            {title}
          </Typography>
          <div style={{ flex: 1 }}>&nbsp;</div>
          <WindowControls>
            <IconButton size="small" onClick={handleMinimize} aria-label="Minimize dialog" sx={{ padding: '2px' }} data-id="button-window-minimize">
              <MinimizeIcon fontSize="small"/>
            </IconButton>
            <IconButton size="small" onClick={handleMaximize} data-id="button-window-maximize" aria-label={windowState === WindowState.Maximized
            ? 'Restore dialog'
            : 'Maximize dialog'} sx={{ padding: '2px' }}>
              {windowState === WindowState.Maximized ? (<RestoreIcon fontSize="small"/>) : (<MaximizeIcon fontSize="small"/>)}
            </IconButton>
            <IconButton size="small" data-id="button-window-inline" onClick={handleCloseClick} aria-label="Close dialog" sx={{ padding: '2px' }}>
              <CloseIcon fontSize="small"/>
            </IconButton>
          </WindowControls>
        </DraggableHandle>
        {windowState !== WindowState.Minimized && (<>
            <DialogContent>{children}</DialogContent>
            {dialogActions && dialogActions({})}
          </>)}
      </Dialog>
    </React.Fragment>);
};
export default ResizableDraggableDialog;
//# sourceMappingURL=dialog.jsx.map