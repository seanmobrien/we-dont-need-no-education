'use client';
import * as React from 'react';
import { useState } from 'react';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import ChatList from '@/components/ai/chat/list';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';
export const ChatPageClient = ({ session }) => {
    const [viewType, setViewType] = useState('user');
    const handleToggleChange = (event) => {
        setViewType(event.target.checked ? 'system' : 'user');
    };
    return (<EmailDashboardLayout session={session}>
      <Box sx={{
            width: '100%',
            '& > :not(style)': {
                m: 1,
            },
        }}>
        
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">Chat History</Typography>
          <FormControlLabel control={<Switch checked={viewType === 'system'} onChange={handleToggleChange} name="chatViewToggle" color="primary"/>} label={viewType === 'system' ? 'System Chats' : 'User Chats'} sx={{ ml: 2 }}/>
        </Box>
        <ChatList viewType={viewType}/>
      </Box>
    </EmailDashboardLayout>);
};
//# sourceMappingURL=chat-page-client.jsx.map