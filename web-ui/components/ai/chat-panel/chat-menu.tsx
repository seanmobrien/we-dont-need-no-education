import {
  Divider,
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  SlotProps,
  MenuListProps,
  MenuListSlotPropsOverrides,
  MenuOwnerState,
  Chip,
  Box,
  Typography,
} from '@mui/material';
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useState,
  useMemo,
} from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import DockIcon from '@mui/icons-material/Dock';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import CloudIcon from '@mui/icons-material/Cloud';
import {
  DockPosition,
  AiProvider,
  ModelType,
  ModelSelection,
  ProviderConfig,
} from './types';
import { TodoListFlyout, FloatingTodoDialog } from '@/components/todo';

export const ChatMenu = ({
  onResetSession,
  activeModelSelection,
  setActiveModelSelection,
  onFloat,
  onDock,
  currentPosition = 'inline',
}: {
  onResetSession?: () => void;
  activeModelSelection: ModelSelection;
  setActiveModelSelection: Dispatch<SetStateAction<ModelSelection>>;
  onFloat?: () => void;
  onDock?: (position: DockPosition) => void;
  currentPosition?: DockPosition;
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Todo list dialog state
  const [selectedTodoListId, setSelectedTodoListId] = useState<string | null>(
    null,
  );
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);

  // Provider configurations with available models
  const availableProviders: ProviderConfig[] = useMemo(
    () => [
      {
        id: 'azure',
        displayName: 'Azure',
        models: [
          { id: 'lofi', displayName: 'Paralegal', available: true },
          { id: 'hifi', displayName: 'Attorney', available: true },
          {
            id: 'reasoning-medium',
            displayName: 'Partner (Medium)',
            available: true,
          },
          {
            id: 'reasoning-high',
            displayName: 'Partner (High)',
            available: true,
          },
        ],
      },
      {
        id: 'google',
        displayName: 'Google',
        models: [
          { id: 'lofi', displayName: 'Paralegal', available: true },
          { id: 'hifi', displayName: 'Attorney', available: true },
          {
            id: 'reasoning-medium',
            displayName: 'Partner (Medium)',
            available: false,
          },
          {
            id: 'reasoning-high',
            displayName: 'Partner (High)',
            available: false,
          },
        ],
      },
      {
        id: 'openai',
        displayName: 'OpenAI',
        models: [
          { id: 'lofi', displayName: 'Paralegal', available: true },
          { id: 'hifi', displayName: 'Attorney', available: true },
          {
            id: 'reasoning-medium',
            displayName: 'Partner (Medium)',
            available: false,
          },
          {
            id: 'reasoning-high',
            displayName: 'Partner (High)',
            available: false,
          },
        ],
      },
    ],
    [],
  );

  const currentProvider = availableProviders.find(
    (p) => p.id === activeModelSelection.provider,
  );
  const currentModel = currentProvider?.models.find(
    (m) => m.id === activeModelSelection.model,
  );
  const activeModelDisplayName = currentModel?.displayName || 'Unknown';
  const activeProviderDisplayName = currentProvider?.displayName || 'Unknown';
  const onMenuClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    },
    [setAnchorEl],
  );
  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, [setAnchorEl]);

  const onResetSessionClick = useCallback(() => {
    handleClose();
    onResetSession?.();
  }, [handleClose, onResetSession]);

  const onFloatClick = useCallback(() => {
    handleClose();
    onFloat?.();
  }, [handleClose, onFloat]);

  const onDockClick = useCallback(
    (position: DockPosition) => {
      handleClose();
      onDock?.(position);
    },
    [handleClose, onDock],
  );

  const onProviderSelect = useCallback(
    (provider: AiProvider) => {
      // When switching providers, keep the same model type if available, otherwise default to lofi
      const newProvider = availableProviders.find((p) => p.id === provider);
      const currentModelType = activeModelSelection.model;
      const availableModel = newProvider?.models.find(
        (m) => m.id === currentModelType && m.available,
      );
      const selectedModel = availableModel ? currentModelType : 'lofi';

      setActiveModelSelection({
        provider,
        model: selectedModel,
      });
      handleClose();
    },
    [
      availableProviders,
      activeModelSelection.model,
      setActiveModelSelection,
      handleClose,
    ],
  );

  const onModelSelect = useCallback(
    (model: ModelType) => {
      setActiveModelSelection({
        ...activeModelSelection,
        model,
      });
      handleClose();
    },
    [activeModelSelection, setActiveModelSelection, handleClose],
  );

  // Todo list handlers
  const handleSelectTodoList = useCallback(
    (listId: string) => {
      setSelectedTodoListId(listId);
      setTodoDialogOpen(true);
      handleClose();
    },
    [handleClose],
  );

  const handleCloseTodoDialog = useCallback(() => {
    setTodoDialogOpen(false);
  }, []);

  // Docking options configuration
  const dockingOptions = [
    {
      position: 'left' as DockPosition,
      label: 'Dock Left',
      icon: <ViewSidebarIcon />,
    },
    {
      position: 'right' as DockPosition,
      label: 'Dock Right',
      icon: <ViewSidebarIcon sx={{ transform: 'scaleX(-1)' }} />,
    },
    {
      position: 'top' as DockPosition,
      label: 'Dock Top',
      icon: <DockIcon sx={{ transform: 'rotate(90deg)' }} />,
    },
    {
      position: 'bottom' as DockPosition,
      label: 'Dock Bottom',
      icon: <DockIcon sx={{ transform: 'rotate(-90deg)' }} />,
    },
  ];

  return (
    <>
      <IconButton
        edge="end"
        onClick={onMenuClick}
        id="chat-menu-button"
        data-testid="button-chat-menu"
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            'data-testid': 'chat-menu-list',
            'aria-labelledby': 'chat-menu-button',
          } as SlotProps<
            React.ElementType<MenuListProps>,
            MenuListSlotPropsOverrides,
            MenuOwnerState
          >,
        }}
      >
        <MenuItem onClick={onResetSessionClick} data-testid="menu-item-reset">
          Reset chat session
        </MenuItem>
        <Divider />
        <TodoListFlyout onSelectList={handleSelectTodoList} />
        <Divider />
        <MenuItem onClick={onFloatClick} data-testid="menu-item-float">
          <ListItemIcon>
            <OpenInFullIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Float</ListItemText>
        </MenuItem>
        {dockingOptions.map((option) => (
          <MenuItem
            key={option.position}
            onClick={() => onDockClick(option.position)}
            data-testid={`menu-item-dock-${option.position}`}
            selected={currentPosition === option.position}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <ListSubheader>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="inherit">Active Model:</Typography>
            <Chip
              icon={<CloudIcon />}
              label={activeProviderDisplayName}
              size="small"
              variant="outlined"
            />
            <Typography variant="inherit">{activeModelDisplayName}</Typography>
          </Box>
        </ListSubheader>

        {/* Provider Selection */}
        <ListSubheader>Provider</ListSubheader>
        {availableProviders.map((provider) => (
          <MenuItem
            data-testid={`menu-item-provider-${provider.id}`}
            key={provider.id}
            onClick={() => onProviderSelect(provider.id)}
            selected={provider.id === activeModelSelection.provider}
          >
            <ListItemIcon>
              <CloudIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{provider.displayName}</ListItemText>
          </MenuItem>
        ))}

        <Divider />

        {/* Model Selection for Current Provider */}
        <ListSubheader>Model ({activeProviderDisplayName})</ListSubheader>
        {currentProvider?.models.map((model) => (
          <MenuItem
            data-testid={`menu-item-model-${model.id}`}
            key={model.id}
            onClick={() => onModelSelect(model.id)}
            selected={model.id === activeModelSelection.model}
            disabled={!model.available}
          >
            <ListItemText
              primary={model.displayName}
              secondary={!model.available ? 'Not available' : undefined}
            />
          </MenuItem>
        )) || (
          <MenuItem disabled>
            <ListItemText primary="No models available" />
          </MenuItem>
        )}
      </Menu>
      <FloatingTodoDialog
        listId={selectedTodoListId}
        open={todoDialogOpen}
        onClose={handleCloseTodoDialog}
      />
    </>
  );
};
