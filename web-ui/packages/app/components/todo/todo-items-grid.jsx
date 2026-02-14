'use client';
import { useMemo, useCallback } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import MuiLink from '@mui/material/Link';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NextLink from 'next/link';
import { useTodoList, useCreateTodoItem, useUpdateTodoItem, useDeleteTodoItem, } from '@/lib/hooks/use-todo';
import { useConfirmationDialog } from '@/components/general/dialogs/confirm';
import { usePromptDialog } from '@/components/general/dialogs/prompt';
import siteBuilder from '@/lib/site-util/url-builder';
import { Loading } from '../general/loading';
const stableSx = {
    containerBase: {
        display: 'flex',
        flexDirection: 'column',
        width: 1,
        height: 600,
    },
};
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
export default function TodoItemsGrid({ listId }) {
    const { data: list, isLoading, refetch } = useTodoList(listId);
    const confirm = useConfirmationDialog();
    const prompt = usePromptDialog();
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
    const handleDelete = useCallback(async (itemId) => {
        const confirmed = await confirm.show({
            title: 'Delete Todo Item',
            message: 'Are you sure you want to delete this item?',
            confirmText: 'Delete',
            confirmColor: 'error',
            cancelText: 'Cancel',
        });
        if (confirmed) {
            deleteTodoItem.mutate(itemId);
        }
    }, [deleteTodoItem, confirm]);
    const handleToggleComplete = useCallback((item) => {
        updateTodoItem.mutate({
            itemId: item.id,
            completed: !item.completed,
            status: !item.completed ? 'complete' : 'active',
        });
    }, [updateTodoItem]);
    const handleCreateItem = useCallback(async () => {
        const title = await prompt.show({
            title: 'Create Todo Item',
            label: 'Item Title',
            confirmText: 'Create',
            cancelText: 'Cancel',
            required: true,
        });
        if (title) {
            createTodoItem.mutate({ title });
        }
    }, [createTodoItem, prompt]);
    const handleEditItem = useCallback(async (item) => {
        const title = await prompt.show({
            title: 'Edit Todo Item',
            label: 'Item Title',
            defaultValue: item.title,
            confirmText: 'Save',
            cancelText: 'Cancel',
            required: true,
        });
        if (title && title !== item.title) {
            updateTodoItem.mutate({
                itemId: item.id,
                title,
            });
        }
    }, [updateTodoItem, prompt]);
    const columns = useMemo(() => [
        {
            field: 'completed',
            headerName: 'Done',
            width: 80,
            renderCell: (params) => (<IconButton color={params.value ? 'success' : 'default'} size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleToggleComplete(params.row);
                }} aria-label={params.value ? 'Mark as incomplete' : 'Mark as complete'}>
            {params.value ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
          </IconButton>),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 100,
            renderCell: (params) => (<Chip label={params.value} color={getStatusColor(params.value)} size="small"/>),
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
            valueGetter: (value) => value || '-',
        },
        {
            field: 'priority',
            headerName: 'Priority',
            width: 100,
            renderCell: (params) => (<Chip label={params.value} color={getPriorityColor(params.value)} size="small"/>),
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
            width: 120,
            sortable: false,
            renderCell: (params) => (<>
            <IconButton color="primary" size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleEditItem(params.row);
                }} aria-label="Edit item">
              <EditIcon />
            </IconButton>
            <IconButton color="error" size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(params.row.id);
                }} aria-label="Delete item">
              <DeleteIcon />
            </IconButton>
          </>),
        },
    ], [handleDelete, handleToggleComplete, handleEditItem]);
    if (isLoading) {
        return <Loading loading={true}/>;
    }
    if (!list) {
        return <Typography>Todo list not found</Typography>;
    }
    return (<>
      <Box sx={stableSx.containerBase}>
        <Box sx={{ mb: 2 }}>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
            <MuiLink component={NextLink} underline="hover" color="inherit" href={siteBuilder.messages.page('todo-lists').toString()}>
              <ArrowBackIcon sx={{ mr: 0.5, verticalAlign: 'middle' }}/>
              All Lists
            </MuiLink>
            <Typography color="text.primary">{list.title}</Typography>
          </Breadcrumbs>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4">{list.title}</Typography>
              {list.description && (<Typography variant="body2" color="text.secondary">
                  {list.description}
                </Typography>)}
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateItem}>
              New Item
            </Button>
          </Box>
        </Box>
        <DataGrid rows={list.todos} columns={columns} loading={isLoading} getRowId={(row) => row.id} initialState={{
            pagination: {
                paginationModel: { pageSize: 25, page: 0 },
            },
            sorting: {
                sortModel: [{ field: 'completed', sort: 'asc' }],
            },
        }} pageSizeOptions={[10, 25, 50, 100]} disableRowSelectionOnClick sx={{
            '& .MuiDataGrid-row': {
                cursor: 'default',
            },
        }}/>
      </Box>
      <confirm.Dialog />
      <prompt.Dialog />
    </>);
}
//# sourceMappingURL=todo-items-grid.jsx.map