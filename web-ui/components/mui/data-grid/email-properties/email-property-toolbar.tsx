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

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

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

const EmailPropertyToolbar = ({
  includeAttachments,
  setIncludeAttachments,
}: {
  includeAttachments: boolean;
  setIncludeAttachments: Dispatch<SetStateAction<boolean>>;
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

  const onSetIncludeAttachments = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setIncludeAttachments(event.target.checked);
    },
    [setIncludeAttachments],
  );
  const memoizedAttachmentsSwitch = useMemo(
    () => (
      <Tooltip title="Attachments">
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={includeAttachments}
              onChange={onSetIncludeAttachments}
            />
          }
          label={<AttachEmailIcon fontSize="small" />}
        />
      </Tooltip>
    ),
    [includeAttachments, onSetIncludeAttachments],
  );
  // Stable render functions for panel triggers
  const renderColumnsPanelTrigger = useCallback(() => <ToolbarButton />, []);

  const renderFilterPanelTrigger = useCallback(
    (
      props: React.ComponentProps<typeof ToolbarButton>,
      state: { filterCount: number },
    ) => (
      <ToolbarButton {...props} color="default">
        <Badge badgeContent={state.filterCount} color="primary" variant="dot">
          <FilterListIcon fontSize="small" />
        </Badge>
      </ToolbarButton>
    ),
    [],
  );

  const renderQuickFilterTrigger = useCallback(
    (
      triggerProps: React.ComponentProps<typeof ToolbarButton>,
      state: { expanded: boolean },
    ) => (
      <Tooltip title="Search" enterDelay={0}>
        <StyledQuickFilterToolbarButton
          {...triggerProps}
          ownerState={{ expanded: state.expanded }}
          color="default"
        >
          <SearchIcon fontSize="small" />
        </StyledQuickFilterToolbarButton>
      </Tooltip>
    ),
    [],
  );

  const renderQuickFilterControl = useCallback(
    (
      controlProps: { ref?: React.Ref<HTMLInputElement> } & Omit<
        React.ComponentProps<typeof TextField>,
        'ref'
      >,
      state: { expanded: boolean; value?: string },
    ) => (
      <StyledQuickFilterTextField
        {...controlProps}
        ownerState={{ expanded: state.expanded }}
        inputRef={controlProps.ref}
        aria-label="Search"
        placeholder="Search..."
        size="small"
        slotProps={{
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
            ...controlProps.slotProps?.input,
          },
          ...controlProps.slotProps,
        }}
      />
    ),
    [],
  );

  return (
    <Toolbar>
      {memoizedAttachmentsSwitch}{' '}
      <Tooltip title="Columns">
        <ColumnsPanelTrigger render={renderColumnsPanelTrigger}>
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
        sx={{ mx: 0.5 }}
      />
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
      </Menu>{' '}
      <StyledQuickFilter>
        <QuickFilterTrigger render={renderQuickFilterTrigger} />
        <QuickFilterControl render={renderQuickFilterControl} />
      </StyledQuickFilter>
    </Toolbar>
  );
};
export default EmailPropertyToolbar;
