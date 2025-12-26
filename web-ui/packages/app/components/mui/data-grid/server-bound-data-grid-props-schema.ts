import z from 'zod';

const ServerBoundDataGridPropsSchema = z.object({
  columns: z
    .array(
      z.object({
        field: z.string(),
        headerName: z.string().optional(),
        type: z.string().optional(),
        width: z.number().optional(),
        sortable: z.boolean().optional(),
        filterable: z.boolean().optional(),
        editable: z.boolean().optional(),
        renderCell: z.function().optional(),
        valueGetter: z.function().optional(),
        valueFormatter: z.function().optional(),
      }),
    )
    .nonempty(),
  url: z.union([
    z.string().url(),
    z.object({
      pathname: z.string(),
      searchParams: z.object({}).catchall(z.any()).optional(),
      hash: z.string().optional(),
    }),
  ]).optional(),
  // getRecordData: z.function().optional(),
  idColumn: z.string(),
  slotProps: z
    .object({
      loadingOverlay: z
        .object({
          variant: z
            .enum(['circular-progress', 'skeleton', 'linear-progress'])
            .optional(),
          noRowsVariant: z
            .enum(['circular-progress', 'skeleton', 'linear-progress'])
            .optional(),
        })
        .optional(),
    })
    .catchall(z.any())
    .optional(),
  initialState: z
    .object({
      pagination: z
        .object({
          paginationModel: z
            .object({ pageSize: z.number(), page: z.number() })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export default ServerBoundDataGridPropsSchema;
