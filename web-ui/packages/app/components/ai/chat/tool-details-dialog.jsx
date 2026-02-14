'use client';
import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import { JsonViewer } from '@textea/json-viewer';
const isComplexValue = (value) => {
    if (value === null || value === undefined)
        return false;
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean') {
        return false;
    }
    return type === 'object';
};
const ValueDisplay = ({ value, label, }) => {
    if (value === null || value === undefined) {
        return (<Typography variant="body2" color="text.secondary">
        {label}: <em>null</em>
      </Typography>);
    }
    if (isComplexValue(value)) {
        return (<Box sx={{ mt: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          {label}:
        </Typography>
        <Paper elevation={0} sx={{
                p: 1,
                bgcolor: 'grey.50',
                border: 1,
                borderColor: 'grey.300',
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: 400,
            }}>
          <JsonViewer value={value} defaultInspectDepth={3} theme="light" displayDataTypes={false} enableClipboard={true} style={{
                fontSize: '0.875rem',
                fontFamily: 'monospace',
            }}/>
        </Paper>
      </Box>);
    }
    const displayValue = typeof value === 'string' ? `"${value}"` : String(value);
    return (<Typography variant="body2">
      <strong>{label}:</strong> {displayValue}
    </Typography>);
};
export const ToolDetailsDialog = ({ open, onClose, message, }) => {
    const { toolName, functionCall, toolResult } = message;
    return (<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{
            sx: {
                minHeight: '300px',
            },
        }}>
      <DialogTitle>
        Tool Details: <strong>{toolName || 'Unknown Tool'}</strong>
      </DialogTitle>
      <DialogContent>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Input Parameters
          </Typography>
          <Divider sx={{ mb: 2 }}/>
          {functionCall ? (<Box>
              {typeof functionCall === 'object' &&
                !Array.isArray(functionCall) ? (Object.entries(functionCall).map(([key, value]) => (<Box key={key} sx={{ mb: 1.5 }}>
                    <ValueDisplay value={value} label={key}/>
                  </Box>))) : (<ValueDisplay value={functionCall} label="Parameters"/>)}
            </Box>) : (<Typography variant="body2" color="text.secondary">
              <em>No input parameters recorded</em>
            </Typography>)}
        </Box>

        
        <Box>
          <Typography variant="h6" gutterBottom>
            Return Value
          </Typography>
          <Divider sx={{ mb: 2 }}/>
          {toolResult ? (<Box>
              {typeof toolResult === 'object' &&
                !Array.isArray(toolResult) &&
                Object.keys(toolResult).length > 0 ? (Object.entries(toolResult).map(([key, value]) => (<Box key={key} sx={{ mb: 1.5 }}>
                    <ValueDisplay value={value} label={key}/>
                  </Box>))) : (<ValueDisplay value={toolResult} label="Result"/>)}
            </Box>) : (<Typography variant="body2" color="text.secondary">
              <em>No return value recorded</em>
            </Typography>)}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>);
};
//# sourceMappingURL=tool-details-dialog.jsx.map