import { Chips as renderArrayAsChips } from '../cellRenderers';
import renderSeverity from '../cellRenderers/renderSeverity';
import renderProgress from '../cellRenderers/progress/render';
export const defineReasonsColumn = ({ field, headerName = field, width, description, }, args) => {
    return {
        field,
        headerName,
        width,
        description,
        editable: false,
        ...(args ?? {}),
    };
};
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
    complianceRating: {
        field: 'compliance',
        headerName: 'Compliance Rating',
        editable: false,
        type: 'number',
        renderCell: renderProgress,
    },
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
    policyBasis: {
        field: 'policy_basis',
        headerName: 'Policy Basis',
        editable: false,
        width: 300,
        renderCell: renderArrayAsChips,
    },
    sentiment: {
        field: 'sentiment',
        headerName: 'Sentiment',
        editable: false,
        type: 'number',
        renderCell: renderProgress,
    },
    sentimentReasons: defineReasonsColumn({
        field: 'sentiment_reasons',
        headerName: 'Sentiment Reasons',
    }),
    severity: {
        field: 'severity',
        headerName: 'Severity',
        description: 'Degree to which this item has potential to expose the District to liability',
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
    tags: {
        field: 'tags',
        headerName: 'Tags',
        editable: false,
        width: 400,
        renderCell: renderArrayAsChips,
    },
};
//# sourceMappingURL=shared-cells-defs.jsx.map