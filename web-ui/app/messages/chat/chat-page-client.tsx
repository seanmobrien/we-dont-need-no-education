'use client';
import type { Session } from '@auth/core/types';
import * as React from 'react';
import { useState } from 'react';
import Box from '@mui/material/Box';
import { FormControlLabel, Switch, Typography } from '@mui/material';
import ChatList from '@/components/chat/list';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';

interface ChatPageClientProps {
  session: Session | null;
}

export const ChatPageClient = ({ session }: ChatPageClientProps) => {
  const [viewType, setViewType] = useState<'user' | 'system'>('user');

  const handleToggleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setViewType(event.target.checked ? 'system' : 'user');
  };

  return (
    <EmailDashboardLayout session={session}>
      <Box
        sx={{
          width: '100%',
          '& > :not(style)': {
            m: 1,
          },
        }}
      >
        {/* Chat History Toggle */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">Chat History</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={viewType === 'system'}
                onChange={handleToggleChange}
                name="chatViewToggle"
                color="primary"
              />
            }
            label={viewType === 'system' ? 'System Chats' : 'User Chats'}
            sx={{ ml: 2 }}
          />
        </Box>
        <ChatList viewType={viewType} />
      </Box>
    </EmailDashboardLayout>
  );
};
