import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useCallback, useState, useMemo, } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import DockIcon from '@mui/icons-material/Dock';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import CloudIcon from '@mui/icons-material/Cloud';
import CheckIcon from '@mui/icons-material/Check';
import { TodoListFlyout, FloatingTodoDialog } from '@/components/todo';
import { FlyoutMenu } from '@/components/flyout-menu';
export const ChatMenu = ({ onResetSession, activeModelSelection, setActiveModelSelection, onFloat, onDock, currentPosition = 'inline', }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [selectedTodoListId, setSelectedTodoListId] = useState(null);
    const [todoDialogOpen, setTodoDialogOpen] = useState(false);
    const availableProviders = useMemo(() => [
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
    ], []);
    const currentProvider = availableProviders.find((p) => p.id === activeModelSelection.provider);
    const currentModel = currentProvider?.models.find((m) => m.id === activeModelSelection.model);
    const activeModelDisplayName = currentModel?.displayName || 'Unknown';
    const activeProviderDisplayName = currentProvider?.displayName || 'Unknown';
    const onMenuClick = useCallback((event) => {
        setAnchorEl(event.currentTarget);
        setActiveSubmenu(null);
    }, [setAnchorEl]);
    const handleClose = useCallback(() => {
        setAnchorEl(null);
        setActiveSubmenu(null);
    }, [setAnchorEl]);
    const onResetSessionClick = useCallback(() => {
        handleClose();
        onResetSession?.();
    }, [handleClose, onResetSession]);
    const onFloatClick = useCallback(() => {
        handleClose();
        onFloat?.();
    }, [handleClose, onFloat]);
    const onDockClick = useCallback((position) => {
        handleClose();
        onDock?.(position);
    }, [handleClose, onDock]);
    const onProviderSelect = useCallback((provider) => {
        const newProvider = availableProviders.find((p) => p.id === provider);
        const currentModelType = activeModelSelection.model;
        const availableModel = newProvider?.models.find((m) => m.id === currentModelType && m.available);
        const selectedModel = availableModel ? currentModelType : 'lofi';
        setActiveModelSelection({
            provider,
            model: selectedModel,
        });
        handleClose();
    }, [
        availableProviders,
        activeModelSelection.model,
        setActiveModelSelection,
        handleClose,
    ]);
    const onModelSelect = useCallback((model) => {
        setActiveModelSelection({
            ...activeModelSelection,
            model,
        });
        handleClose();
    }, [activeModelSelection, setActiveModelSelection, handleClose]);
    const handleSelectTodoList = useCallback((listId) => {
        setSelectedTodoListId(listId);
        setTodoDialogOpen(true);
        handleClose();
    }, [handleClose]);
    const handleCloseTodoDialog = useCallback(() => {
        setTodoDialogOpen(false);
    }, []);
    const handleSubmenuHover = useCallback((id) => {
        setActiveSubmenu(id);
    }, []);
    const clearSubmenu = useCallback(() => {
        setActiveSubmenu(null);
    }, []);
    const dockingOptions = [
        {
            position: 'left',
            label: 'Dock Left',
            icon: <ViewSidebarIcon />,
        },
        {
            position: 'right',
            label: 'Dock Right',
            icon: <ViewSidebarIcon sx={{ transform: 'scaleX(-1)' }}/>,
        },
        {
            position: 'top',
            label: 'Dock Top',
            icon: <DockIcon sx={{ transform: 'rotate(90deg)' }}/>,
        },
        {
            position: 'bottom',
            label: 'Dock Bottom',
            icon: <DockIcon sx={{ transform: 'rotate(-90deg)' }}/>,
        },
    ];
    const getDockLabel = () => {
        if (currentPosition === 'inline')
            return 'Dock';
        return `Dock (${currentPosition.charAt(0).toUpperCase() + currentPosition.slice(1)})`;
    };
    return (<>
      <IconButton edge="end" onClick={onMenuClick} id="chat-menu-button" data-testid="button-chat-menu">
        <MoreVertIcon data-testid='MoreVertIcon'/>
      </IconButton>
      <Menu id="basic-menu" anchorEl={anchorEl} open={open} onClose={handleClose} slotProps={{
            list: {
                'data-testid': 'chat-menu-list',
                'aria-labelledby': 'chat-menu-button',
                subheader: <></>,
                onClick: clearSubmenu,
            },
        }}>
        <MenuItem onClick={onResetSessionClick} data-testid="menu-item-reset" onMouseEnter={clearSubmenu}>
          Reset chat session
        </MenuItem>

        <Divider />

        <TodoListFlyout onSelectList={handleSelectTodoList} isOpen={activeSubmenu === 'todo'} onHover={() => handleSubmenuHover('todo')}/>

        <Divider />

        <FlyoutMenu label={getDockLabel()} icon={<DockIcon />} dataTestId="menu-item-dock" active={currentPosition !== 'inline'} isOpen={activeSubmenu === 'dock'} onHover={() => handleSubmenuHover('dock')}>
          <MenuItem onClick={onFloatClick} data-testid="menu-item-float">
            <ListItemIcon>
              <OpenInFullIcon fontSize="small"/>
            </ListItemIcon>
            <ListItemText>Float</ListItemText>
          </MenuItem>
          {dockingOptions.map((option) => (<MenuItem key={option.position} onClick={() => onDockClick(option.position)} data-testid={`menu-item-dock-${option.position}`} selected={currentPosition === option.position}>
              <ListItemIcon>{option.icon}</ListItemIcon>
              <ListItemText>{option.label}</ListItemText>
              {currentPosition === option.position && (<CheckIcon fontSize="small" sx={{ ml: 'auto' }}/>)}
            </MenuItem>))}
        </FlyoutMenu>

        <Divider />

        <FlyoutMenu label={`Provider (${activeProviderDisplayName})`} icon={<CloudIcon />} active={true} dataTestId="menu-item-provider" isOpen={activeSubmenu === 'provider'} onHover={() => handleSubmenuHover('provider')}>
          {availableProviders.map((provider) => (<MenuItem data-testid={`menu-item-provider-${provider.id}`} key={provider.id} onClick={() => onProviderSelect(provider.id)} selected={provider.id === activeModelSelection.provider}>
              <ListItemIcon>
                <CloudIcon fontSize="small"/>
              </ListItemIcon>
              <ListItemText>{provider.displayName}</ListItemText>
              {provider.id === activeModelSelection.provider && (<CheckIcon fontSize="small" sx={{ ml: 'auto' }}/>)}
            </MenuItem>))}
        </FlyoutMenu>

        <FlyoutMenu label={`Model (${activeModelDisplayName})`} icon={<CloudIcon />} dataTestId="menu-item-model" active={true} isOpen={activeSubmenu === 'model'} onHover={() => handleSubmenuHover('model')}>
          {currentProvider?.models.map((model) => (<MenuItem data-testid={`menu-item-model-${model.id}`} key={model.id} onClick={() => onModelSelect(model.id)} selected={model.id === activeModelSelection.model} disabled={!model.available}>
              <ListItemText primary={model.displayName} secondary={!model.available ? 'Not available' : undefined}/>
              {model.id === activeModelSelection.model && (<CheckIcon fontSize="small" sx={{ ml: 'auto' }}/>)}
            </MenuItem>)) || (<MenuItem disabled>
              <ListItemText primary="No models available"/>
            </MenuItem>)}
        </FlyoutMenu>
      </Menu>
      <FloatingTodoDialog listId={selectedTodoListId} open={todoDialogOpen} onClose={handleCloseTodoDialog}/>
    </>);
};
//# sourceMappingURL=chat-menu.jsx.map