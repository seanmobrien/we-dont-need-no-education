/**
 * @module ToolDetailsDialog
 * @fileoverview
 * Dialog component for displaying tool input parameters and output results.
 * 
 * Features:
 * - Displays tool name
 * - Shows input parameters (functionCall) with inline display for primitives, json-viewer for complex objects
 * - Shows output/return value (toolResult) with inline display for primitives, json-viewer for complex objects
 * - Uses @textea/json-viewer for JSON data visualization
 * - Matches existing UI styling
 */

'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Paper,
} from '@mui/material';
import { JsonViewer } from '@textea/json-viewer';
import type { ChatMessage } from '@/lib/ai/chat/types';

interface ToolDetailsDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
  /** The message containing tool information */
  message: ChatMessage;
}

/**
 * Determines if a value is a complex object/array that should be shown in json-viewer
 */
const isComplexValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  const type = typeof value;
  // Primitives: string, number, boolean
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return false;
  }
  // Objects and arrays are complex
  return type === 'object';
};

/**
 * Renders a value either inline (for primitives) or with json-viewer (for complex objects)
 */
const ValueDisplay: React.FC<{ value: unknown; label: string }> = ({
  value,
  label,
}) => {
  if (value === null || value === undefined) {
    return (
      <Typography variant="body2" color="text.secondary">
        {label}: <em>null</em>
      </Typography>
    );
  }

  if (isComplexValue(value)) {
    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          {label}:
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 1,
            bgcolor: 'grey.50',
            border: 1,
            borderColor: 'grey.300',
            borderRadius: 1,
            overflow: 'auto',
            maxHeight: 400,
          }}
        >
          <JsonViewer
            value={value}
            defaultInspectDepth={3}
            theme="light"
            displayDataTypes={false}
            displayObjectSize={true}
            enableClipboard={true}
            style={{
              fontSize: '0.875rem',
              fontFamily: 'monospace',
            }}
          />
        </Paper>
      </Box>
    );
  }

  // Primitive value - display inline
  const displayValue = typeof value === 'string' ? `"${value}"` : String(value);
  return (
    <Typography variant="body2">
      <strong>{label}:</strong> {displayValue}
    </Typography>
  );
};

/**
 * ToolDetailsDialog component: displays detailed information about a tool invocation
 * including input parameters and output results.
 */
export const ToolDetailsDialog: React.FC<ToolDetailsDialogProps> = ({
  open,
  onClose,
  message,
}) => {
  const { toolName, functionCall, toolResult } = message;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '300px',
        },
      }}
    >
      <DialogTitle>
        Tool Details: <strong>{toolName || 'Unknown Tool'}</strong>
      </DialogTitle>
      <DialogContent>
        {/* Input Parameters Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Input Parameters
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {functionCall ? (
            <Box>
              {typeof functionCall === 'object' &&
              !Array.isArray(functionCall) ? (
                Object.entries(functionCall).map(([key, value]) => (
                  <Box key={key} sx={{ mb: 1.5 }}>
                    <ValueDisplay value={value} label={key} />
                  </Box>
                ))
              ) : (
                <ValueDisplay value={functionCall} label="Parameters" />
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              <em>No input parameters recorded</em>
            </Typography>
          )}
        </Box>

        {/* Output/Return Value Section */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Return Value
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {toolResult ? (
            <Box>
              {typeof toolResult === 'object' &&
              !Array.isArray(toolResult) &&
              Object.keys(toolResult).length > 0 ? (
                Object.entries(toolResult).map(([key, value]) => (
                  <Box key={key} sx={{ mb: 1.5 }}>
                    <ValueDisplay value={value} label={key} />
                  </Box>
                ))
              ) : (
                <ValueDisplay value={toolResult} label="Result" />
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              <em>No return value recorded</em>
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
