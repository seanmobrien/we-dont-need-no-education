'use client';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useEffect, useId, useRef } from 'react';
const stableSx = {
    error: {
        color: 'error.main',
        marginBottom: 2,
        textAlign: 'center',
    },
};
export const Loading = ({ loading, errorMessage, text, }) => {
    const titleId = useId();
    const errorRef = useRef(null);
    useEffect(() => {
        if (errorMessage && errorRef.current) {
            errorRef.current.focus();
        }
    }, [errorMessage]);
    if (loading) {
        return (<Card role="status" aria-live="polite" aria-busy={true} aria-labelledby={titleId}>
        <CardContent>
          <Typography id={titleId} variant="h6" gutterBottom>
            {text ?? 'Loading...'}
          </Typography>
          <LinearProgress aria-describedby={titleId}/>
        </CardContent>
      </Card>);
    }
    if (errorMessage) {
        return (<Box sx={stableSx.error} role="alert" aria-atomic="true" tabIndex={-1} ref={errorRef}>
        <Typography variant="body2" color="error">
          <strong>Error:</strong> {errorMessage}
        </Typography>
      </Box>);
    }
    return <></>;
};
//# sourceMappingURL=index.jsx.map