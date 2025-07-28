'use client';

import {
  styled,
  Tooltip,
  Badge,
  Divider,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  PopoverOrigin,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  QuickFilter,
  Toolbar,
  ToolbarButton,
  ColumnsPanelTrigger,
  FilterPanelTrigger,
  ExportPrint,
  ExportCsv,
  QuickFilterTrigger,
  QuickFilterControl,
  QuickFilterClear,
} from '@mui/x-data-grid-pro';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AttachEmailIcon from '@mui/icons-material/AttachEmail';
import SearchIcon from '@mui/icons-material/Search';
import CancelIcon from '@mui/icons-material/Cancel';

import React, { useMemo, useRef, useState } from 'react';

const StyledQuickFilter = styled(QuickFilter)({
  display: 'grid',
  alignItems: 'center',
});

type TriggerOwnerState = {
  expanded: boolean;
};

const StyledQuickFilterToolbarButton = styled(ToolbarButton)<{
  ownerState: TriggerOwnerState;
}>(({ theme, ownerState }) => ({
  gridArea: '1 / 1',
  width: 'min-content',
  height: 'min-content',
  zIndex: 1,
  opacity: ownerState.expanded ? 0 : 1,
  pointerEvents: ownerState.expanded ? 'none' : 'auto',
  transition: theme.transitions.create(['opacity']),
}));

type ControlOwnerState = {
  expanded: boolean;
};

const StyledQuickFilterTextField = styled(TextField)<{
  ownerState: ControlOwnerState;
}>(({ theme, ownerState }) => ({
  gridArea: '1 / 1',
  overflowX: 'clip',
  width: ownerState.expanded ? 260 : 'var(--trigger-width)',
  opacity: ownerState.expanded ? 1 : 0,
  transition: theme.transitions.create(['width', 'opacity']),
}));

const stableSx = {
  marginHalf: { mx: 0.5 },
};

const stableSlotProps = {
  exportMenu: {
    list: {
      'aria-labelledby': 'export-menu-trigger',
    },
  },
};

const stableOrigin: Record<string | symbol, PopoverOrigin> = {
  bottomRight: { vertical: 'bottom', horizontal: 'right' },
  topRight: { vertical: 'top', horizontal: 'right' },
};

// Stable render functions for panel triggers
const stableRenderColumnsPanelTrigger = <ToolbarButton />;

const renderFilterPanelTrigger = (
  props: React.ComponentProps<typeof ToolbarButton>,
  state: { filterCount: number },
) => (
  <ToolbarButton {...props} color="default">
    <Badge badgeContent={state.filterCount} color="primary" variant="dot">
      <FilterListIcon fontSize="small" />
    </Badge>
  </ToolbarButton>
);

const StableOwnerExpandedState = {
  expanded: { expanded: true },
  default: { expanded: false },
} as const;

const renderQuickFilterTrigger = (
  triggerProps: React.ComponentProps<typeof ToolbarButton>,
  state: { expanded: boolean },
) => (
  <Tooltip title="Search" enterDelay={0}>
    <StyledQuickFilterToolbarButton
      {...triggerProps}
      ownerState={state.expanded ? StableOwnerExpandedState.expanded : StableOwnerExpandedState.default}
      color="default"
    >
      <SearchIcon fontSize="small" />
    </StyledQuickFilterToolbarButton>
  </Tooltip>
);
const RenderQuickFilterControl = (
  controlProps: { ref?: React.Ref<HTMLInputElement> } & Omit<
    React.ComponentProps<typeof TextField>,
    'ref'
  >,
  state: { expanded: boolean; value?: string },
) => {
  const serializedSlotProps = JSON.stringify(controlProps?.slotProps ?? {});
  const { ownerState, slotProps } = useMemo(() => {
    const hydratedSlotProps = JSON.parse(serializedSlotProps);
    return {
      ownerState: { expanded: state.expanded },
      slotProps: {
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: state.value ? (
            <InputAdornment position="end">
              <QuickFilterClear
                edge="end"
                size="small"
                aria-label="Clear search"
                material={{ sx: { marginRight: -0.75 } }}
              >
                <CancelIcon fontSize="small" />
              </QuickFilterClear>
            </InputAdornment>
          ) : null,
          ...(hydratedSlotProps.input ?? {}),
        },
        ...hydratedSlotProps,
      },
    };
  }, [state.expanded, state.value, serializedSlotProps]);
  return (  
    <StyledQuickFilterTextField
      {...controlProps}
      ownerState={ownerState}
      inputRef={controlProps.ref}
      aria-label="Search"
      placeholder="Search..."
      size="small"
      slotProps={slotProps}
    />
  );
}

const ToolbarColumnsAndFilters = () => {
  const Component = React.memo(() => {
    return (
      <>
        <Tooltip title="Columns">
          <ColumnsPanelTrigger render={stableRenderColumnsPanelTrigger}>
            <ViewColumnIcon fontSize="small" />
          </ColumnsPanelTrigger>
        </Tooltip>
        <Tooltip title="Filters">
          <FilterPanelTrigger render={renderFilterPanelTrigger} />
        </Tooltip>
        <Divider
          orientation="vertical"
          variant="middle"
          flexItem
          sx={stableSx.marginHalf}
        />
      </>
    );
  });
  Component.displayName = 'ToolbarColumnsAndFilters';
  return <Component />;
};

const ToolbarQuickFilter = () => {
  const Component = React.memo(() => {
    return (
      <StyledQuickFilter>
        <QuickFilterTrigger render={renderQuickFilterTrigger} />
        <QuickFilterControl render={RenderQuickFilterControl} />
      </StyledQuickFilter>
    );
  });
  Component.displayName = 'ToolbarQuickFilter';
  return <Component />;
};

const EmailPropertyToolbar = ({
  includeAttachments,
  setIncludeAttachments,
}: {
  includeAttachments: boolean;
  setIncludeAttachments: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuTriggerRef = useRef<HTMLButtonElement>(null);

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
    return (
      <Tooltip title="Attachments">
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={includeAttachments}
              onChange={setIncludeAttachments}
            />
          }
          label={<AttachEmailIcon fontSize="small" sx={{ verticalAlign: 'middle' }} />}
        />
      </Tooltip>
    );
  }, [includeAttachments, setIncludeAttachments]);

  const memoizedExport = useMemo(() => {
    return (
      <>
        <Tooltip title="Export">
          <ToolbarButton
            ref={exportMenuTriggerRef}
            id="export-menu-trigger"
            aria-controls="export-menu"
            aria-haspopup="true"
            aria-expanded={exportMenuOpen ? 'true' : undefined}
            onClick={onSetExportMenuOpen}
          >
            <FileDownloadIcon fontSize="small" />
          </ToolbarButton>
        </Tooltip>
        <Menu
          id="export-menu"
          anchorEl={exportMenuTriggerRef.current}
          open={exportMenuOpen}
          onClose={onSetExportMenuClosed}
          anchorOrigin={stableOrigin.bottomRight}
          transformOrigin={stableOrigin.topRight}
          slotProps={stableSlotProps.exportMenu}
        >
          <ExportPrint render={<MenuItem />} onClick={onSetExportMenuClosed}>
            Print
          </ExportPrint>
          <ExportCsv render={<MenuItem />} onClick={onSetExportMenuClosed}>
            Download as CSV
          </ExportCsv>
        </Menu>
      </>
    );
  }, [
    exportMenuOpen,
    onSetExportMenuOpen,
    onSetExportMenuClosed,
    exportMenuTriggerRef,
  ]);

  return (
    <Toolbar>
      {memoizedAttachmentsSwitch} <ToolbarColumnsAndFilters />
      {memoizedExport} <ToolbarQuickFilter />
    </Toolbar>
  );
};
export default EmailPropertyToolbar;
