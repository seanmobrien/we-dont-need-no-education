'use client';

import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import { TestVirtualizedChat } from '@/components/chat/test-virtualized-chat';

export default function StandaloneChatTest() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Virtualized Chat Display Test
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        This page demonstrates the improved virtualized chat display with
        various content types and sizes. All messages should be fully visible
        without content being cut off.
      </Typography>

      <Box
        sx={{ height: '70vh', border: '1px solid #e0e0e0', borderRadius: 2 }}
      >
        <TestVirtualizedChat />
      </Box>
    </Container>
  );
}
