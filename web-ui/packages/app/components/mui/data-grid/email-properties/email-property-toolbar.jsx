'use client';
import { styled } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import { QuickFilter, Toolbar, ToolbarButton, ColumnsPanelTrigger, FilterPanelTrigger, ExportPrint, ExportCsv, QuickFilterTrigger, QuickFilterControl, QuickFilterClear, } from '@mui/x-data-grid-pro';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AttachEmailIcon from '@mui/icons-material/AttachEmail';
import SearchIcon from '@mui/icons-material/Search';
import CancelIcon from '@mui/icons-material/Cancel';
import React, { useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import { ChatStatusIndicator } from '@/components/health/chat-status';
import { MemoryStatusIndicator } from '@/components/health/memory-status';
import { DatabaseStatusIndicator } from '@/components/health/database-status';
import { HealthProvider } from '@/components/health/health-provider/health-context';
const StyledQuickFilter = styled(QuickFilter)({
    display: 'grid',
    alignItems: 'center',
});
const StyledQuickFilterToolbarButton = styled(ToolbarButton)(({ theme, ownerState }) => ({
    gridArea: '1 / 1',
    width: 'min-content',
    height: 'min-content',
    zIndex: 1,
    opacity: ownerState.expanded ? 0 : 1,
    pointerEvents: ownerState.expanded ? 'none' : 'auto',
    transition: theme.transitions.create(['opacity']),
}));
const StyledQuickFilterTextField = styled(TextField)(({ theme, ownerState }) => ({
    gridArea: '1 / 1',
    overflowX: 'clip',
    width: ownerState.expanded ? 260 : 'var(--trigger-width)',
    opacity: ownerState.expanded ? 1 : 0,
    transition: theme.transitions.create(['width', 'opacity']),
}));
const stableSx = {
    marginHalf: { mx: 0.5 },
    marginOneAndHalf: { mx: 1.5 },
};
const stableSlotProps = {
    exportMenu: {
        list: {
            'aria-labelledby': 'export-menu-trigger',
        },
    },
};
const stableQuickFilterClearMaterial = { sx: { marginRight: -0.75 } };
const stableHealthBoxSx = {
    display: 'flex',
    alignItems: 'center',
    mr: 'auto',
};
const stableOrigin = {
    bottomRight: { vertical: 'bottom', horizontal: 'right' },
    topRight: { vertical: 'top', horizontal: 'right' },
};
const stableRenderColumnsPanelTrigger = <ToolbarButton />;
const renderFilterPanelTrigger = (props, state) => (<ToolbarButton {...props} color="default">
    <Badge badgeContent={state.filterCount} color="primary" variant="dot">
      <FilterListIcon fontSize="small"/>
    </Badge>
  </ToolbarButton>);
const StableOwnerExpandedState = {
    expanded: { expanded: true },
    default: { expanded: false },
};
const renderQuickFilterTrigger = (triggerProps, state) => (<Tooltip title="Search" enterDelay={0}>
    <StyledQuickFilterToolbarButton {...triggerProps} ownerState={state.expanded
        ? StableOwnerExpandedState.expanded
        : StableOwnerExpandedState.default} color="default">
      <SearchIcon fontSize="small"/>
    </StyledQuickFilterToolbarButton>
  </Tooltip>);
const RenderQuickFilterControl = (controlProps, state) => {
    const serializedSlotProps = JSON.stringify(controlProps?.slotProps ?? {});
    const { ownerState, slotProps } = useMemo(() => {
        const hydratedSlotProps = JSON.parse(serializedSlotProps);
        return {
            ownerState: { expanded: state.expanded },
            slotProps: {
                input: {
                    startAdornment: (<InputAdornment position="start">
              <SearchIcon fontSize="small"/>
            </InputAdornment>),
                    endAdornment: state.value ? (<InputAdornment position="end">
              <QuickFilterClear edge="end" size="small" aria-label="Clear search" material={stableQuickFilterClearMaterial}>
                <CancelIcon fontSize="small"/>
              </QuickFilterClear>
            </InputAdornment>) : null,
                    ...(hydratedSlotProps.input ?? {}),
                },
                ...hydratedSlotProps,
            },
        };
    }, [state.expanded, state.value, serializedSlotProps]);
    return (<StyledQuickFilterTextField {...controlProps} ownerState={ownerState} inputRef={controlProps.ref} aria-label="Search" placeholder="Search..." size="small" slotProps={slotProps}/>);
};
const ToolbarColumnsAndFilters = () => {
    const Component = React.memo(() => {
        return (<>
        <Tooltip title="Columns">
          <ColumnsPanelTrigger render={stableRenderColumnsPanelTrigger}>
            <ViewColumnIcon fontSize="small"/>
          </ColumnsPanelTrigger>
        </Tooltip>
        <Tooltip title="Filters">
          <FilterPanelTrigger render={renderFilterPanelTrigger}/>
        </Tooltip>
        <Divider orientation="vertical" variant="middle" flexItem sx={stableSx.marginHalf}/>
      </>);
    });
    Component.displayName = 'ToolbarColumnsAndFilters';
    return <Component />;
};
const ToolbarQuickFilter = () => {
    const Component = React.memo(() => {
        return (<StyledQuickFilter>
        <QuickFilterTrigger render={renderQuickFilterTrigger}/>
        <QuickFilterControl render={RenderQuickFilterControl}/>
      </StyledQuickFilter>);
    });
    Component.displayName = 'ToolbarQuickFilter';
    return <Component />;
};
const SystemHealthPanel = () => {
    const Component = React.memo(() => (<HealthProvider>
      <MemoryStatusIndicator />
      <DatabaseStatusIndicator />
      <ChatStatusIndicator />
      <Divider orientation="vertical" variant="middle" flexItem sx={stableSx.marginOneAndHalf}/>
    </HealthProvider>));
    Component.displayName = 'SystemHealthPanel';
    return <Component />;
};
const EmailPropertyToolbar = ({ includeAttachments, setIncludeAttachments, }) => {
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
    const memoizedAttachmentsSwitch = useMemo(() => {
        return (<Tooltip title="Attachments">
        <FormControlLabel control={<Switch size="small" checked={includeAttachments} onChange={setIncludeAttachments}/>} label={<AttachEmailIcon fontSize="small" sx={{ verticalAlign: 'middle' }}/>}/>
      </Tooltip>);
    }, [includeAttachments, setIncludeAttachments]);
    const memoizedExport = useMemo(() => {
        return (<>
        <Tooltip title="Export">
          <ToolbarButton ref={exportMenuTriggerRef} id="export-menu-trigger" aria-controls="export-menu" aria-haspopup="true" aria-expanded={exportMenuOpen ? 'true' : undefined} onClick={onSetExportMenuOpen}>
            <FileDownloadIcon fontSize="small"/>
          </ToolbarButton>
        </Tooltip>
        <Menu id="export-menu" anchorEl={exportMenuTriggerRef.current} open={exportMenuOpen} onClose={onSetExportMenuClosed} anchorOrigin={stableOrigin.bottomRight} transformOrigin={stableOrigin.topRight} slotProps={stableSlotProps.exportMenu}>
          <ExportPrint render={<MenuItem />} onClick={onSetExportMenuClosed}>
            Print
          </ExportPrint>
          <ExportCsv render={<MenuItem />} onClick={onSetExportMenuClosed}>
            Download as CSV
          </ExportCsv>
        </Menu>
      </>);
    }, [
        exportMenuOpen,
        onSetExportMenuOpen,
        onSetExportMenuClosed,
        exportMenuTriggerRef,
    ]);
    return (<Toolbar>
      <Box sx={stableHealthBoxSx}>
        <SystemHealthPanel />
      </Box>
      {memoizedAttachmentsSwitch} <ToolbarColumnsAndFilters />
      {memoizedExport} <ToolbarQuickFilter />
    </Toolbar>);
};
export default EmailPropertyToolbar;
//# sourceMappingURL=email-property-toolbar.jsx.map