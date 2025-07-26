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
} from '@mui/material';
import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import DockIcon from '@mui/icons-material/Dock';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import { DockPosition } from './types';

export const ChatMenu = ({
  onResetSession,
  activeModel,
  setActiveModel,
  onFloat,
  onDock,
  currentPosition = 'inline',
}: {
  onResetSession?: () => void;
  activeModel: string;
  setActiveModel: Dispatch<SetStateAction<string>>;
  onFloat?: () => void;
  onDock?: (position: DockPosition) => void;
  currentPosition?: DockPosition;
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const availableModels = [
    { id: 'lofi', display: 'Paralegal' },
    { id: 'hifi', display: 'Attorney' },
    { id: 'reasoning-medium', display: 'Partner (Medium)' },
    { id: 'reasoning-high', display: 'Partner (High)' },
  ];
  const activeModelDisplayName =
    availableModels.find((x) => x.id === activeModel)?.display || 'Unknown';
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

  const onDockClick = useCallback((position: DockPosition) => {
    handleClose();
    onDock?.(position);
  }, [handleClose, onDock]);

  // Docking options configuration
  const dockingOptions = [
    { position: 'left' as DockPosition, label: 'Dock Left', icon: <ViewSidebarIcon /> },
    { position: 'right' as DockPosition, label: 'Dock Right', icon: <ViewSidebarIcon sx={{ transform: 'scaleX(-1)' }} /> },
    { position: 'top' as DockPosition, label: 'Dock Top', icon: <DockIcon sx={{ transform: 'rotate(90deg)' }} /> },
    { position: 'bottom' as DockPosition, label: 'Dock Bottom', icon: <DockIcon sx={{ transform: 'rotate(-90deg)' }} /> },
  ];

  return (
    <>
      <IconButton edge="end" onClick={onMenuClick} id="chat-menu-button" data-id='button-chat-menu'>
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}        
        slotProps={{
          list: {
            'data-id': 'chat-menu-list',
            'aria-labelledby': 'chat-menu-button',
          } as SlotProps<React.ElementType<MenuListProps>, MenuListSlotPropsOverrides, MenuOwnerState>,
        }}
      >
        <MenuItem onClick={onResetSessionClick} data-id='menu-item-reset'>Reset chat session</MenuItem>
        <Divider />
        <MenuItem onClick={onFloatClick} data-id='menu-item-float'>
          <ListItemIcon>
            <OpenInFullIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Float</ListItemText>
        </MenuItem>
        {dockingOptions.map((option) => (
          <MenuItem 
            key={option.position}
            onClick={() => onDockClick(option.position)}
            data-id={`menu-item-dock-${option.position}`}
            selected={currentPosition === option.position}
          >
            <ListItemIcon>
              {option.icon}
            </ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <ListSubheader>{`Active Model: ${activeModelDisplayName}`}</ListSubheader>
        {availableModels.map((model) => (
          <MenuItem
            data-id={`menu-item-model-${model.id}`}
            key={model.id}
            onClick={() => {
              setActiveModel(model.id);
              handleClose();
            }}
            selected={model.id === activeModel}
          >
            {model.display}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
