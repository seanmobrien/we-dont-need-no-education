import { GridColDef } from '@mui/x-data-grid-pro';
import { renderArrayAsChips, renderProgress } from '../cellRenderers';
import { renderSeverity } from '../cellRenderers/renderSeverity';

export const defineReasonsColumn = (
  {
    field,
    headerName = field,
    width,
    description,
  }: {
    field: string;
    headerName?: string;
    width?: number;
    description?: string;
  },
  args?: object,
): GridColDef => {
  return {
    field,
    headerName,
    width,
    description,
    editable: false,
    ...(args ?? {}),
  };
};

/**
 * A collection of shared column definitions for use in MUI Data Grid components.
 *
 * Each entry in the `SharedCellDefinitions` object defines the configuration for a specific column,
 * including its field name, header label, editability, width, and custom cell rendering logic.
 *
 * @remarks
 * - The `renderCell` property uses the `renderArrayAsChips` function to display array values as chips.
 * - The definitions are marked as `const` to ensure immutability.
 *
 * @example
 * ```tsx
 * <DataGrid columns={[SharedCellDefinitions.policyBasis, SharedCellDefinitions.tags]} ... />
 * ```
 */

export const SharedCellDefinitions = {
  compliance: {
    chapter_13: {
      field: 'compliance_average_chapter_13',
      headerName: 'Chpt 13',
      description: 'Chpt 13 Compliance (Avg)',
      editable: false,
      type: 'number',
      renderCell: renderProgress,
    },
    chapter_13_reasons: defineReasonsColumn({
      field: 'compliance_chapter_13_reasons',
      headerName: 'Chpt 13 Reasons',
      description: 'Reasons for Chpt 13 Compliance',
    }),
  },
  /**
   * Column definition for the `compliance_rating` field.
   * Displays the compliance rating of an email property.
   */
  complianceRating: {
    field: 'compliance',
    headerName: 'Compliance Rating',
    editable: false,
    type: 'number',
    renderCell: renderProgress,
  },
  /**
   * Column definition for the `compliance_rating_reasons` field.
   * Displays the reasons for the compliance rating assigned to a document.
   */
  complianceRatingReasons: defineReasonsColumn({
    field: 'complianceReasons',
    headerName: 'Compliance Rating Reasons',
  }),
  created_on: {
    field: 'created_on',
    headerName: 'Date',
    editable: false,
    type: 'dateTime',
    width: 120,
  },
  inferred: {
    field: 'inferred',
    headerName: 'Inferred',
    type: 'boolean',
    editable: false,
  },
  /**
   * Column definition for the `policy_basis` field.
   * Displays the policy basis of an email property as chips.
   */
  policyBasis: {
    field: 'policy_basis',
    headerName: 'Policy Basis',
    editable: false,
    width: 300,
    renderCell: renderArrayAsChips,
  },
  /**
   * Column definition for the `sentiment` field.
   * Displays the sentiment of an email property.
   */
  sentiment: {
    field: 'sentiment',
    headerName: 'Sentiment',
    editable: false,
    type: 'number',
    renderCell: renderProgress,
  },
  /**
   * Column definition for the `sentiment_reasons` field.
   * Displays the reasons for the sentiment rating assigned to a document.
   */
  sentimentReasons: defineReasonsColumn({
    field: 'sentiment_reasons',
    headerName: 'Sentiment Reasons',
  }),
  severity: {
    field: 'severity',
    headerName: 'Severity',
    description:
      'Degree to which this item has potential to expose the District to liability',
    width: 80,
    editable: false,
    type: 'number',
    renderCell: renderSeverity,
  },
  severityReason: {
    ...defineReasonsColumn({
      field: 'severity_reason',
      description: 'Reasons the Severity rating was assigned',
      headerName: 'Severity Reasons',
    }),
  },
  /**
   * Column definition for the `tags` field.
   * Displays the tags of an email property as chips.
   */
  tags: {
    field: 'tags',
    headerName: 'Tags',
    editable: false,
    width: 400,
    renderCell: renderArrayAsChips,
  },
} as const;
