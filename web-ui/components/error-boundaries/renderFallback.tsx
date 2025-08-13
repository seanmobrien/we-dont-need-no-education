'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Alert,
  AlertTitle,
  Typography,
  Box,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import BugReportIcon from '@mui/icons-material/BugReport';
import { getRecoveryActions, getDefaultRecoveryAction, classifyError } from '@/lib/error-monitoring/recovery-strategies';
import type { RecoveryAction } from '@/lib/error-monitoring/recovery-strategies';
import { dumpError, LoggedError } from '@/lib/react-util/errors/logged-error';

export const RenderErrorBoundaryFallback = (
  {error, resetErrorBoundary}: {
    error: unknown;
    resetErrorBoundary: (...args: unknown[]) => void;
  }
): React.ReactNode => {
  const [open, setOpen] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const errorMessage = dumpError(error); // error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  // Get recovery actions for this error
  const recoveryActions = getRecoveryActions(errorObj);
  const defaultAction = getDefaultRecoveryAction(errorObj);
  const errorType = classifyError(errorObj);

  // Auto-reset when dialog is closed
  useEffect(() => {
    if (!open) {
      // Small delay to allow dialog close animation
      const timeoutId = setTimeout(() => {
        resetErrorBoundary();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [open, resetErrorBoundary]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleTryAgain = () => {
    if (defaultAction) {
      defaultAction.action();
    } else {
      setOpen(false);
    }
  };

  const handleRecoveryAction = (action: RecoveryAction) => {
    try {
      action.action();
      // Close dialog after successful action
      if (action.id !== 'contact-admin' && action.id !== 'report-bug' && action.id !== 'contact-support') {
        setOpen(false);
      }
    } catch (actionError) {
      LoggedError.isTurtlesAllTheWayDownBaby(actionError, { log: true, source: 'error-boundary' });      
    }
  };

  const handleToggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Disable default close behavior
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      aria-labelledby="error-dialog-title"
      aria-describedby="error-dialog-description"
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: fullScreen ? 0 : 2,
          minHeight: fullScreen ? '100vh' : 'auto',
        },
      }}
    >
      <DialogTitle 
        id="error-dialog-title"
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          pb: 1,
          color: theme.palette.error.main,
        }}
      >
        <ErrorOutlineIcon color="error" />
        <Typography variant="h6" component="span">
          Something went wrong
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <DialogContentText id="error-dialog-description" sx={{ mb: 2 }}>
          We encountered a {errorType.replace('_', ' ')} error. Here are some ways to resolve it:
        </DialogContentText>
        
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <AlertTitle>Error Details</AlertTitle>
          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
            {errorMessage}
          </Typography>
          
          {errorStack && (
            <Box sx={{ mt: 1 }}>
              <Button
                size="small"
                onClick={handleToggleDetails}
                startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ p: 0, minHeight: 'auto', textTransform: 'none' }}
              >
                {showDetails ? 'Hide' : 'Show'} technical details
              </Button>
              
              {showDetails && (
                <Box
                  component="pre"
                  sx={{
                    mt: 1,
                    p: 1,
                    backgroundColor: theme.palette.grey[100],
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '200px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                  }}
                >
                  {errorStack}
                </Box>
              )}
            </Box>
          )}
        </Alert>

        {/* Recovery Actions */}
        {recoveryActions.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600 }}>
              Recovery Options
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recoveryActions.slice(0, 3).map((action) => (
                <Button
                  key={action.id}
                  variant={action.id === defaultAction?.id ? "contained" : "outlined"}
                  onClick={() => handleRecoveryAction(action)}
                  sx={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    textTransform: 'none',
                    p: 1.5,
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {action.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          color="inherit"
          startIcon={<BugReportIcon />}
        >
          Report Issue
        </Button>
        <Button
          onClick={handleTryAgain}
          variant="contained"
          color="primary"
          startIcon={<RestartAltIcon />}
          autoFocus={true}
        >
          {defaultAction?.label || 'Try Again'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
