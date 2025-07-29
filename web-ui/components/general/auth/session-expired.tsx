'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useMediaQuery,
  DialogContentText,
} from '@mui/material';
import { useSession } from '@/lib/react-util';
import { signIn } from 'next-auth/react'; // only needed if you're using next-auth v4-style login helpers
import { useTheme } from '@mui/material/styles';

const handleClose = () => false;
const handleLogin = () => {
  signIn();
};

export function SessionExpiredDialog() {
  const { status } = useSession();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [status]);
  const { breakpoints } = useTheme();
  const fullScreen = useMediaQuery(breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={fullScreen}
      aria-labelledby="session-expired-dialog-title"
      aria-describedby="session-expired-dialog-body"
    >
      <DialogTitle id="session-expired-dialog-title">
        Session Expired
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="session-expired-dialog-body">
          Your session has expired or you are not signed in. Please log in to
          continue.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleLogin}
          variant="contained"
          color="primary"
          aria-roledescription="login-button"
        >
          Log In
        </Button>
      </DialogActions>
    </Dialog>
  );
}
