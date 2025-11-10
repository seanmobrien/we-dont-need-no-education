'use client';

import { useMemo, useCallback } from 'react';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import { Box, Button, IconButton, Chip } from '@mui/material';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import Link from '@mui/material/Link';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  useTodoLists,
  useDeleteTodoList,
  useCreateTodoList,
} from '@/lib/hooks/use-todo';
import type { TodoListSummary } from '@/data-models/api/todo';
import type { SxProps, Theme } from '@mui/material/styles';

const stableSx = {
  containerBase: {
    display: 'flex',
    flexDirection: 'column',
    width: 1,
    height: 600,
  } satisfies SxProps<Theme>,
  titleLink: {
    color: 'primary.main',
    textDecoration: 'none',
    '&:hover': { textDecoration: 'underline' },
    '&:focusVisible': {
      outline: '2px solid',
      outlineColor: 'primary.main',
      outlineOffset: 2,
    },
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

export default function TodoListGrid() {
  const router = useRouter();
  const { data: lists = [], isLoading, refetch } = useTodoLists();
  const deleteTodoList = useDeleteTodoList({
    onSuccess: () => {
      refetch();
    },
  });

  const createTodoList = useCreateTodoList({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = useCallback(
    (listId: string) => {
      if (confirm('Are you sure you want to delete this todo list?')) {
        deleteTodoList.mutate(listId);
      }
    },
    [deleteTodoList],
  );

  const handleCreateList = useCallback(() => {
    const title = prompt('Enter todo list title:');
    if (title) {
      createTodoList.mutate({ title });
    }
  }, [createTodoList]);

  const columns: GridColDef<TodoListSummary>[] = useMemo(
    () => [
      {
        field: 'status',
        headerName: 'Status',
        width: 100,
        renderCell: (params) => (
          <Chip
            label={params.value}
            color={getStatusColor(params.value)}
            size="small"
            icon={
              params.value === 'complete' ? (
                <CheckCircleIcon />
              ) : (
                <RadioButtonUncheckedIcon />
              )
            }
          />
        ),
      },
      {
        field: 'title',
        headerName: 'Title',
        flex: 1,
        renderCell: (params) => (
          <Link
            component={
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              NextLink<any>
            }
            href={`/messages/todo-lists/${params.row.id}`}
            title="View todo list"
            aria-label={`Open todo list: ${params.value}`}
            sx={stableSx.titleLink}
          >
            {params.value}
          </Link>
        ),
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
        field: 'totalItems',
        headerName: 'Total',
        width: 80,
        type: 'number',
        valueGetter: (value: number | undefined) => value || 0,
      },
      {
        field: 'completedItems',
        headerName: 'Done',
        width: 80,
        type: 'number',
        valueGetter: (value: number | undefined) => value || 0,
      },
      {
        field: 'pendingItems',
        headerName: 'Pending',
        width: 80,
        type: 'number',
        valueGetter: (value: number | undefined) => value || 0,
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
        width: 100,
        sortable: false,
        renderCell: (params) => (
          <IconButton
            color="error"
            size="small"
            onClick={() => handleDelete(params.row.id)}
            aria-label="Delete todo list"
          >
            <DeleteIcon />
          </IconButton>
        ),
      },
    ],
    [handleDelete],
  );

  const handleRowClick = useCallback(
    (params: GridRowParams<TodoListSummary>) => {
      router.push(`/messages/todo-lists/${params.row.id}`);
    },
    [router],
  );

  return (
    <Box sx={stableSx.containerBase}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <h2>Todo Lists</h2>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateList}
        >
          New List
        </Button>
      </Box>
      <DataGrid
        rows={lists}
        columns={columns}
        loading={isLoading}
        getRowId={(row) => row.id}
        onRowClick={handleRowClick}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 25, page: 0 },
          },
          sorting: {
            sortModel: [{ field: 'updatedAt', sort: 'desc' }],
          },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        disableRowSelectionOnClick
        sx={{
          '& .MuiDataGrid-row': {
            cursor: 'pointer',
          },
        }}
      />
    </Box>
  );
}
