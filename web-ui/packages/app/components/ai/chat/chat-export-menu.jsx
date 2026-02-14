'use client';
import React, { useRef, useState, useMemo } from 'react';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { exportToCsv, exportToMarkdown, } from '@/lib/ai/chat/export';
import { errorReporter } from '@/lib/error-monitoring/error-reporter';
const stableOrigin = {
    bottomRight: { vertical: 'bottom', horizontal: 'right' },
    topRight: { vertical: 'top', horizontal: 'right' },
};
export const ChatExportMenu = ({ turns, selectedItems, chatTitle, chatCreatedAt, disabled = false, }) => {
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const exportMenuTriggerRef = useRef(null);
    const { onSetExportMenuOpen, onSetExportMenuClosed } = useMemo(() => {
        const onSetExportMenuOpen = () => {
            if (!exportMenuOpen) {
                setExportMenuOpen(true);
            }
        };
        const onSetExportMenuClosed = () => {
            if (exportMenuOpen) {
                setExportMenuOpen(false);
            }
        };
        return {
            onSetExportMenuOpen,
            onSetExportMenuClosed,
        };
    }, [exportMenuOpen]);
    const handleExportCsv = () => {
        try {
            exportToCsv(turns, selectedItems, chatTitle);
            onSetExportMenuClosed();
        }
        catch (error) {
            errorReporter((r) => r.reportError(error));
        }
    };
    const handleExportMarkdown = () => {
        try {
            exportToMarkdown(turns, selectedItems, chatTitle, chatCreatedAt);
            onSetExportMenuClosed();
        }
        catch (error) {
            errorReporter((r) => r.reportError(error));
        }
    };
    const hasSelection = selectedItems.length > 0;
    return (<>
      <Tooltip title={hasSelection
            ? 'Export selected messages'
            : 'Select messages to export'}>
        <span>
          <IconButton ref={exportMenuTriggerRef} id="chat-export-menu-trigger" aria-controls="chat-export-menu" aria-haspopup="true" aria-expanded={exportMenuOpen ? 'true' : undefined} onClick={onSetExportMenuOpen} disabled={disabled || !hasSelection}>
            <FileDownloadIcon fontSize="small"/>
          </IconButton>
        </span>
      </Tooltip>
      <Menu id="chat-export-menu" anchorEl={exportMenuTriggerRef.current} open={exportMenuOpen} onClose={onSetExportMenuClosed} anchorOrigin={stableOrigin.bottomRight} transformOrigin={stableOrigin.topRight} sx={{
            '& .MuiPaper-root': {
                minWidth: 180,
            },
        }}>
        <MenuItem onClick={handleExportCsv}>Export as CSV</MenuItem>
        <MenuItem onClick={handleExportMarkdown}>Export as Markdown</MenuItem>
      </Menu>
    </>);
};
//# sourceMappingURL=chat-export-menu.jsx.map