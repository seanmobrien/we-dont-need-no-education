'use client';
import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CodeIcon from '@mui/icons-material/Code';
import InfoIcon from '@mui/icons-material/Info';
import { ToolDetailsDialog } from './tool-details-dialog';
export const ChatMessageDisplay = ({ message, showMetadata = false, enableSelection = false, isSelected = false, onSelectionChange, onHeightChange, }) => {
    const [metadataExpanded, setMetadataExpanded] = useState(false);
    const [optimizedContentExpanded, setOptimizedContentExpanded] = useState(false);
    const [toolDetailsOpen, setToolDetailsOpen] = useState(false);
    const onHeightChangeRef = React.useRef(onHeightChange);
    React.useEffect(() => {
        onHeightChangeRef.current = onHeightChange;
    }, [onHeightChange]);
    const isInitialMount = React.useRef(true);
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (onHeightChangeRef.current) {
            onHeightChangeRef.current();
        }
    }, [metadataExpanded, optimizedContentExpanded]);
    return (<Box sx={{
            mb: 2,
            p: 2,
            bgcolor: message.role === 'user' ? 'action.hover' : 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
        }}>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
        {enableSelection && (<FormControlLabel control={<Checkbox size="small" checked={isSelected} onChange={(e) => onSelectionChange?.(message.messageId, e.target.checked)}/>} label="" sx={{ mr: 1, '& .MuiFormControlLabel-label': { display: 'none' } }}/>)}
        <Chip label={message.role} size="small" color={message.role === 'user' ? 'secondary' : 'primary'}/>
        {message.toolName && message.toolResult && (<Chip label={`Tool: ${message.toolName}`} size="small" variant="outlined" icon={<CodeIcon fontSize="small"/>} onClick={() => setToolDetailsOpen(true)} sx={{ cursor: 'pointer' }}/>)}
        {showMetadata && (<IconButton size="small" onClick={() => setMetadataExpanded(!metadataExpanded)} sx={{ ml: 'auto' }} aria-label={metadataExpanded ? 'Hide metadata' : 'Show more metadata'}>
            <InfoIcon fontSize="small"/>
          </IconButton>)}
      </Box>
      
      <Typography variant="body2" sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            mb: 1,
            maxWidth: '100%',
        }}>
        {message.content || '<no content>'}
      </Typography>
      
      {message.optimizedContent &&
            message.optimizedContent !== message.content && (<Accordion expanded={optimizedContentExpanded} onChange={(_, isExpanded) => setOptimizedContentExpanded(isExpanded)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="caption">Optimized Content</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                maxWidth: '100%',
            }}>
                {message.optimizedContent}
              </Typography>
            </AccordionDetails>
          </Accordion>)}
      
      {showMetadata && (<Collapse in={metadataExpanded}>
          <Divider sx={{ my: 1 }}/>
          <Paper variant="outlined" sx={{ p: 2 }} elevation={3}>
            <Typography variant="subtitle2" gutterBottom>
              Message Metadata
            </Typography>
            <Grid container spacing={1}>
              <Grid size={6}>
                <Typography variant="caption" display="block">
                  Message ID: {message.messageId}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" display="block">
                  Order: {message.messageOrder}
                </Typography>
              </Grid>
              {message.providerId && (<Grid size={6}>
                  <Typography variant="caption" display="block">
                    Provider: {message.providerId}
                  </Typography>
                </Grid>)}
              <Grid size={6}>
                <Typography variant="caption" display="block">
                  Status ID: {message.statusId}
                </Typography>
              </Grid>
              {message.toolInstanceId && (<Grid size={12}>
                  <Typography variant="caption" display="block">
                    Tool Instance: {message.toolInstanceId}
                  </Typography>
                </Grid>)}
              {message.functionCall && (<Grid size={12}>
                  <Typography variant="caption" display="block">
                    Function Call:
                  </Typography>
                  <Box component="pre" sx={{
                    fontSize: '0.75rem',
                    backgroundColor: 'grey.100',
                    p: 1,
                    borderRadius: 1,
                    overflow: 'auto',
                    maxHeight: 200,
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '100%',
                }}>
                    {JSON.stringify(message.functionCall, null, 2)}
                  </Box>
                </Grid>)}
              {message.toolResult && (<Grid size={12}>
                  <Typography variant="caption" display="block">
                    Tool Result:
                  </Typography>
                  <Box component="pre" sx={{
                    fontSize: '0.75rem',
                    backgroundColor: 'success.light',
                    color: 'success.contrastText',
                    p: 1,
                    borderRadius: 1,
                    overflow: 'auto',
                    maxHeight: 200,
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '100%',
                }}>
                    {JSON.stringify(message.toolResult, null, 2)}
                  </Box>
                </Grid>)}
              {message.metadata && (<Grid size={12}>
                  <Typography variant="caption" display="block">
                    Metadata:
                  </Typography>
                  <Paper elevation={4} component="pre" sx={{
                    fontSize: '0.75rem',
                    p: 1,
                    borderRadius: 1,
                    overflow: 'auto',
                    maxHeight: 200,
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '100%',
                }}>
                    {JSON.stringify(message.metadata, null, 2)}
                  </Paper>
                </Grid>)}
            </Grid>
          </Paper>
        </Collapse>)}

      
      {message.toolName && (<ToolDetailsDialog open={toolDetailsOpen} onClose={() => setToolDetailsOpen(false)} message={message}/>)}
    </Box>);
};
//# sourceMappingURL=chat-message-display.jsx.map