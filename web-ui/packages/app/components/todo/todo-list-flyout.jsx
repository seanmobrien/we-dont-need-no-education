'use client';
import React, { useCallback } from 'react';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import ChecklistIcon from '@mui/icons-material/Checklist';
import { useTodoLists } from '@/lib/hooks/use-todo';
import { Loading } from '../general/loading';
import { FlyoutMenu } from '@/components/flyout-menu';
export const TodoListFlyout = ({ onSelectList, isOpen, onHover, }) => {
    const { data: lists = [], isLoading } = useTodoLists();
    const handleListClick = useCallback((listId) => {
        onSelectList(listId);
    }, [onSelectList]);
    return (<FlyoutMenu label="Todo Lists" icon={<ChecklistIcon fontSize="small"/>} isOpen={isOpen} onHover={onHover} dataTestId="menu-item-todo-lists">
      <Loading loading={isLoading}/>

      {!isLoading && lists.length === 0 && (<MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            No todo lists available
          </Typography>
        </MenuItem>)}

      {!isLoading &&
            lists.map((list) => (<MenuItem key={list.id} onClick={() => handleListClick(list.id)} data-testid={`todo-list-item-${list.id}`}>
            <ListItemText primary={list.title} secondary={`${list.totalItems ?? 0} item${(list.totalItems ?? 0) !== 1 ? 's' : ''}`}/>
          </MenuItem>))}
    </FlyoutMenu>);
};
//# sourceMappingURL=todo-list-flyout.jsx.map