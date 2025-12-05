'use client';

import React, { useCallback, useState } from 'react';
import {
  IconButton,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  DialogTitle,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { useTodoList, useToggleTodo } from '@/lib/hooks/use-todo';
import type { Todo } from '@/data-models/api/todo';
import 'react-resizable/css/styles.css';
import { ClientWrapper } from '@/lib/react-util';
import { useChatPanelContext } from '@/components/ai/chat-panel/chat-panel-context';

export interface FloatingTodoDialogProps {
  listId: string | null;
  open: boolean;
  onClose: () => void;
}

/**
 * FloatingTodoDialog - A draggable, resizable dialog for displaying and completing todo items
 *
 * Reuses the floating dialog pattern from the chat panel. Users can:
 * - View all items in a todo list
 * - Toggle item completion with optimistic updates
 * - Drag and resize the dialog
 */
export const FloatingTodoDialog: React.FC<FloatingTodoDialogProps> = ({
  listId,
  open,
  onClose,
}) => {
  const [size, setSize] = useState({ width: 400, height: 500 });
  const { lastCompletionTime } = useChatPanelContext({ required: false });

  const { data: list, isLoading, error, refetch } = useTodoList(listId);
  const { mutate: toggleTodo } = useToggleTodo(listId || '');

  React.useEffect(() => {
    if (lastCompletionTime) {
      refetch();
    }
  }, [lastCompletionTime, refetch]);

  const handleToggle = useCallback(
    (todo: Todo) => {
      toggleTodo({ itemId: todo.id, completed: !todo.completed });
    },
    [toggleTodo],
  );

  const handleResize = useCallback(
    (
      _event: React.SyntheticEvent,
      { size: newSize }: { size: { width: number; height: number } },
    ) => {
      setSize(newSize);
    },
    [],
  );

  const nodeRef = React.useRef<HTMLDivElement>(null);

  if (!open) return null;

  const dialogContent = (
    <Paper
      elevation={8}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <DialogTitle
        className="drag-handle"
        sx={{
          cursor: 'move',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" component="div" noWrap>
          {list?.title || 'Loading...'}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="Close dialog"
          sx={{ ml: 1 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {isLoading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              p: 3,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">Failed to load todo list</Alert>
          </Box>
        )}

        {list && list.todos.length === 0 && (
          <Box sx={{ p: 2 }}>
            <Typography color="text.secondary">
              No items in this list
            </Typography>
          </Box>
        )}

        {list && list.todos.length > 0 && (
          <List sx={{ py: 0 }}>
            {list.todos.map((todo) => (
              <ListItem
                key={todo.id}
                dense
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': {
                    borderBottom: 'none',
                  },
                }}
              >
                <Checkbox
                  edge="start"
                  checked={todo.completed}
                  onChange={() => handleToggle(todo)}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{
                    'aria-labelledby': `todo-${todo.id}-label`,
                  }}
                />
                <ListItemText
                  id={`todo-${todo.id}-label`}
                  primary={todo.title}
                  secondary={todo.description}
                  sx={{
                    '& .MuiListItemText-primary': {
                      textDecoration: todo.completed ? 'line-through' : 'none',
                      color: todo.completed ? 'text.disabled' : 'text.primary',
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );

  return (
    <ClientWrapper>
      <Draggable handle=".drag-handle" bounds="body" nodeRef={nodeRef}>
        <Box
          ref={nodeRef}
          sx={{
            position: 'fixed',
            top: 100,
            left: 100,
            zIndex: 1300,
          }}
        >
          <ResizableBox
            width={size.width}
            height={size.height}
            onResize={handleResize}
            minConstraints={[300, 200]}
            maxConstraints={[800, 800]}
            resizeHandles={['se']}
          >
            {dialogContent}
          </ResizableBox>
        </Box>
      </Draggable>
    </ClientWrapper>
  );
};
