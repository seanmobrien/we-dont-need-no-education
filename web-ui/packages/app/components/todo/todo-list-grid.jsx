'use client';
import { useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import NextLink from 'next/link';
import Link from '@mui/material/Link';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useTodoLists, useDeleteTodoList, useCreateTodoList, } from '@/lib/hooks/use-todo';
import { useConfirmationDialog } from '@/components/general/dialogs/confirm';
import { usePromptDialog } from '@/components/general/dialogs/prompt';
import siteBuilder from '@/lib/site-util/url-builder';
import { DataGridPro } from '@mui/x-data-grid-pro/DataGridPro';
import { StableLargePageSizeOptions } from '@/lib/components/mui/data-grid/default-values';
const stableSx = {
    containerBase: {
        display: 'flex',
        flexDirection: 'column',
        width: 1,
        height: 600,
    },
    containedBox: {
        mb: 2,
        display: 'flex',
        justifyContent: 'space-between',
    },
    titleLink: {
        color: 'primary.main',
        textDecoration: 'none',
        '&:hover': { textDecoration: 'underline' },
        '&:focusVisible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2,
        },
    },
    grid: {
        '& .MuiDataGrid-row': {
            cursor: 'pointer',
        },
    },
};
const stableInitialState = {
    pagination: {
        paginationModel: { pageSize: 25, page: 0 },
    },
    sorting: {
        sortModel: [{ field: 'updatedAt', sort: 'desc' }],
    },
};
const getRowId = (row) => row.id;
const getStatusColor = (status) => {
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
const getPriorityColor = (priority) => {
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
export const TodoListGrid = () => {
    const { data: lists = [], isLoading, refetch } = useTodoLists();
    const confirm = useConfirmationDialog();
    const prompt = usePromptDialog();
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
    const handleDelete = useCallback(async (listId) => {
        const confirmed = await confirm.show({
            title: 'Delete Todo List',
            message: 'Are you sure you want to delete this todo list? This action cannot be undone.',
            confirmText: 'Delete',
            confirmColor: 'error',
            cancelText: 'Cancel',
        });
        if (confirmed) {
            deleteTodoList.mutate(listId);
        }
    }, [deleteTodoList, confirm]);
    const handleCreateList = useCallback(async () => {
        const title = await prompt.show({
            title: 'Create Todo List',
            label: 'List Title',
            confirmText: 'Create',
            cancelText: 'Cancel',
            required: true,
        });
        if (title) {
            createTodoList.mutate({ title });
        }
    }, [createTodoList, prompt]);
    const columns = useMemo(() => [
        {
            field: 'status',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => (<Chip label={params.value} color={getStatusColor(params.value)} size="small" icon={params.value === 'complete' ? (<CheckCircleIcon />) : (<RadioButtonUncheckedIcon />)}/>),
        },
        {
            field: 'title',
            headerName: 'Title',
            flex: 1,
            renderCell: (params) => (<Link component={NextLink} href={siteBuilder.messages.todoLists(encodeURIComponent(params.row.id)).toString()} title="View todo list" aria-label={`Open todo list: ${params.value}`} sx={stableSx.titleLink}>
            {params.value}
          </Link>),
        },
        {
            field: 'description',
            headerName: 'Description',
            flex: 1,
            valueGetter: (value) => value || '-',
        },
        {
            field: 'priority',
            headerName: 'Priority',
            width: 100,
            renderCell: (params) => (<Chip label={params.value} color={getPriorityColor(params.value)} size="small"/>),
        },
        {
            field: 'totalItems',
            headerName: 'Total',
            width: 80,
            type: 'number',
            valueGetter: (value) => value || 0,
        },
        {
            field: 'completedItems',
            headerName: 'Done',
            width: 80,
            type: 'number',
            valueGetter: (value) => value || 0,
        },
        {
            field: 'pendingItems',
            headerName: 'Pending',
            width: 80,
            type: 'number',
            valueGetter: (value) => value || 0,
        },
        {
            field: 'updatedAt',
            headerName: 'Updated',
            width: 150,
            type: 'dateTime',
            valueGetter: (value) => new Date(value),
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 100,
            sortable: false,
            renderCell: (params) => (<IconButton color="error" size="small" onClick={() => handleDelete(params.row.id)} aria-label="Delete todo list">
            <DeleteIcon />
          </IconButton>),
        },
    ], [handleDelete]);
    return (<>
      <Box sx={stableSx.containerBase}>
        <Box sx={stableSx.containedBox}>
          <h2>Todo Lists</h2>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateList}>
            New List
          </Button>
        </Box>
        <DataGridPro rows={lists} columns={columns} loading={isLoading} getRowId={getRowId} initialState={stableInitialState} pageSizeOptions={StableLargePageSizeOptions} disableRowSelectionOnClick sx={stableSx.grid}/>
      </Box>
      <confirm.Dialog />
      <prompt.Dialog />
    </>);
};
export default TodoListGrid;
//# sourceMappingURL=todo-list-grid.jsx.map