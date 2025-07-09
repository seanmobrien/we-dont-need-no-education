import {
  Divider,
  IconButton,
  ListSubheader,
  Menu,
  MenuItem,
} from '@mui/material';
import { Dispatch, SetStateAction, useCallback, useState } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export const ChatMenu = ({
  onResetSession,
  activeModel,
  setActiveModel,
  onFloat,
}: {
  onResetSession?: () => void;
  activeModel: string;
  setActiveModel: Dispatch<SetStateAction<string>>;
  onFloat?: () => void;
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

  return (
    <>
      <IconButton edge="end" onClick={onMenuClick} id="chat-menu-button">
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            'aria-labelledby': 'chat-menu-button',
          },
        }}
      >
        <MenuItem onClick={onResetSessionClick}>Reset chat session</MenuItem>
        <MenuItem onClick={onFloatClick}>Float</MenuItem>
        <Divider />
        <ListSubheader>{`Active Model: ${activeModelDisplayName}`}</ListSubheader>
        {availableModels.map((model) => (
          <MenuItem
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
