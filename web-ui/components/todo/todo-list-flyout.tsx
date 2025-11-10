'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  MenuItem,
  ListItemIcon,
  ListItemText,
  Menu,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import ChecklistIcon from '@mui/icons-material/Checklist';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTodoLists } from '@/lib/hooks/use-todo-lists';

export interface TodoListFlyoutProps {
  onSelectList: (listId: string) => void;
}

/**
 * TodoListFlyout - A submenu that appears on hover/click for selecting todo lists
 * 
 * Displays a fly-out menu of available todo lists. When a list is selected,
 * it calls onSelectList with the list ID.
 */
export const TodoListFlyout: React.FC<TodoListFlyoutProps> = ({
  onSelectList,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuItemRef = useRef<HTMLLIElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: listsData, isLoading } = useTodoLists();
  const lists = listsData?.lists || [];

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (menuItemRef.current) {
      setAnchorEl(menuItemRef.current);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setAnchorEl(null);
    }, 300);
  }, []);

  const handleSubmenuEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const handleSubmenuLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setAnchorEl(null);
    }, 300);
  }, []);

  const handleListClick = useCallback(
    (listId: string) => {
      setAnchorEl(null);
      onSelectList(listId);
    },
    [onSelectList],
  );

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <MenuItem
        ref={menuItemRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-testid="menu-item-todo-lists"
      >
        <ListItemIcon>
          <ChecklistIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>To-do lists</ListItemText>
        <ChevronRightIcon fontSize="small" sx={{ ml: 'auto' }} />
      </MenuItem>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            onMouseEnter: handleSubmenuEnter,
            onMouseLeave: handleSubmenuLeave,
            sx: {
              ml: 0.5,
              minWidth: 200,
            },
          },
        }}
      >
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!isLoading && lists.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No todo lists available
            </Typography>
          </MenuItem>
        )}

        {!isLoading &&
          lists.map((list) => (
            <MenuItem
              key={list.id}
              onClick={() => handleListClick(list.id)}
              data-testid={`todo-list-item-${list.id}`}
            >
              <ListItemText
                primary={list.title}
                secondary={`${list.todos.length} item${list.todos.length !== 1 ? 's' : ''}`}
              />
            </MenuItem>
          ))}
      </Menu>
    </>
  );
};
