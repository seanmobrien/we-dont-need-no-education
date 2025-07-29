'use client';

import React from 'react';
import { Box, Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ChatPanelProvider } from '@/components/ai/chat-panel/chat-panel-context';
import { ChatPanelLayout } from '@/components/ai/chat-panel/chat-panel-layout';
import ChatPanel from '@/components/ai/chat-panel/chat-panel';

// Create a simple dark theme for testing
const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

// Simple test page to demonstrate chat panel docking
export default function ChatPanelDockingTest() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ChatPanelProvider>
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <ChatPanelLayout>
            <Container maxWidth="lg" sx={{ flex: 1, py: 2 }}>
              <Box 
                sx={{ 
                  height: '100%', 
                  backgroundColor: 'background.paper', 
                  borderRadius: 1,
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
              >
                <h1>Chat Panel Docking Test</h1>
                <p>This page demonstrates the chat panel docking functionality.</p>
                
                <Box sx={{ backgroundColor: 'grey.900', p: 2, borderRadius: 1, flex: 1 }}>
                  <h2>Main Content Area</h2>
                  <p>When you dock the chat panel, this content area should adjust to accommodate the docked panel:</p>
                  <ul>
                    <li><strong>Dock Left:</strong> Main content should shift right</li>
                    <li><strong>Dock Right:</strong> Main content should shift left</li>
                    <li><strong>Dock Top:</strong> Main content should shift down</li>
                    <li><strong>Dock Bottom:</strong> Main content should shift up</li>
                    <li><strong>Float:</strong> Main content should remain unchanged, panel floats over</li>
                  </ul>
                  
                  <p>To test docking:</p>
                  <ol>
                    <li>Look for the chat panel at the bottom of this page</li>
                    <li>Click the menu button (⋮) in the chat panel</li>
                    <li>Select different docking options</li>
                    <li>Observe how the layout adjusts</li>
                  </ol>
                </Box>
              </Box>
            </Container>
          </ChatPanelLayout>
          
          {/* Chat Panel */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
            <ChatPanel page="docking-test" />
          </Box>
        </Box>
      </ChatPanelProvider>
    </ThemeProvider>
  );
}