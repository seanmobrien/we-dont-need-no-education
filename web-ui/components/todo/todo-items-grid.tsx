'use client';

import { useMemo, useCallback } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Box,
  Button,
  IconButton,
  Chip,
  Typography,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NextLink from 'next/link';
import {
  useTodoList,
  useCreateTodoItem,
  useUpdateTodoItem,
  useDeleteTodoItem,
} from '@/lib/hooks/use-todo';
import type { TodoItem } from '@/data-models/api/todo';
import type { SxProps, Theme } from '@mui/material/styles';

const stableSx = {
  containerBase: {
    display: 'flex',
    flexDirection: 'column',
    width: 1,
    height: 600,
  } satisfies SxProps<Theme>,
} as const;

const getStatusColor = (
  status: string,
): 'default' | 'primary' | 'success' | 'warning' => {
  switch (status) {
    case 'complete':
      return 'success';
    case 'active':
      return 'primary';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

const getPriorityColor = (
  priority: string,
): 'default' | 'error' | 'warning' | 'info' => {
  switch (priority) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'default';
  }
};

type TodoItemsGridProps = {
  listId: string;
};

export default function TodoItemsGrid({
  listId,
}: TodoItemsGridProps): JSX.Element {
  const { data: list, isLoading, refetch } = useTodoList(listId);
  const createTodoItem = useCreateTodoItem(listId, {
    onSuccess: () => {
      refetch();
    },
  });
  const updateTodoItem = useUpdateTodoItem(listId, {
    onSuccess: () => {
      refetch();
    },
  });
  const deleteTodoItem = useDeleteTodoItem(listId, {
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = useCallback(
    (itemId: string) => {
      if (confirm('Are you sure you want to delete this item?')) {
        deleteTodoItem.mutate(itemId);
      }
    },
    [deleteTodoItem],
  );

  const handleToggleComplete = useCallback(
    (item: TodoItem) => {
      updateTodoItem.mutate({
        itemId: item.itemId,
        completed: !item.completed,
        status: !item.completed ? 'complete' : 'active',
      });
    },
    [updateTodoItem],
  );

  const handleCreateItem = useCallback(() => {
    const title = prompt('Enter todo item title:');
    if (title) {
      createTodoItem.mutate({ title });
    }
  }, [createTodoItem]);

  const handleEditItem = useCallback(
    (item: TodoItem) => {
      const title = prompt('Edit todo item title:', item.title);
      if (title && title !== item.title) {
        updateTodoItem.mutate({
          itemId: item.itemId,
          title,
        });
      }
    },
    [updateTodoItem],
  );

  const columns: GridColDef<TodoItem>[] = useMemo(
    () => [
      {
        field: 'completed',
        headerName: 'Done',
        width: 80,
        renderCell: (params) => (
          <IconButton
            color={params.value ? 'success' : 'default'}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleComplete(params.row);
            }}
            aria-label={
              params.value ? 'Mark as incomplete' : 'Mark as complete'
            }
          >
            {params.value ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
          </IconButton>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 100,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color={getStatusColor(params.value)}
            size="small"
          />
        ),
      },
      {
        field: 'title',
        headerName: 'Title',
        flex: 1,
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1,
        valueGetter: (value: string | undefined) => value || '-',
      },
      {
        field: 'priority',
        headerName: 'Priority',
        width: 100,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color={getPriorityColor(params.value)}
            size="small"
          />
        ),
      },
      {
        field: 'updatedAt',
        headerName: 'Updated',
        width: 150,
        type: 'dateTime',
        valueGetter: (value: Date) => new Date(value),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 120,
        sortable: false,
        renderCell: (params) => (
          <>
            <IconButton
              color="primary"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleEditItem(params.row);
              }}
              aria-label="Edit item"
            >
              <EditIcon />
            </IconButton>
            <IconButton
              color="error"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(params.row.itemId);
              }}
              aria-label="Delete item"
            >
              <DeleteIcon />
            </IconButton>
          </>
        ),
      },
    ],
    [handleDelete, handleToggleComplete, handleEditItem],
  );

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  if (!list) {
    return <Typography>Todo list not found</Typography>;
  }

  return (
    <Box sx={stableSx.containerBase}>
      <Box sx={{ mb: 2 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink
            component={NextLink}
            underline="hover"
            color="inherit"
            href="/messages/todo-lists"
          >
            <ArrowBackIcon sx={{ mr: 0.5, verticalAlign: 'middle' }} />
            All Lists
          </MuiLink>
          <Typography color="text.primary">{list.title}</Typography>
        </Breadcrumbs>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4">{list.title}</Typography>
            {list.description && (
              <Typography variant="body2" color="text.secondary">
                {list.description}
              </Typography>
            )}
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateItem}
          >
            New Item
          </Button>
        </Box>
      </Box>
      <DataGrid
        rows={list.items}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.itemId}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25, page: 0 },
          },
          sorting: {
            sortModel: [{ field: 'completed', sort: 'asc' }],
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        sx={{
          '& .MuiDataGrid-row': {
            cursor: 'default',
          },
        }}
      />
    </Box>
  );
}
