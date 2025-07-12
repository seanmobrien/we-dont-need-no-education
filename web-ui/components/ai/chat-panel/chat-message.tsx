import { Paper, Box } from '@mui/material';
import { Message } from 'ai';
import MuiMarkdown from 'mui-markdown';
import React, { useMemo } from 'react';
import ToolInovocation from './tool-invocation';

// Define stable styles outside component to avoid re-renders
const stableBoxSx = {
  padding: '0.5rem',
} as const;

const ChatMessage = ({ message }: { message: Message }) => {
  const { role = 'user', parts = [] } = message ?? {};

  // Only memoize the styles that depend on props
  const containerSx = useMemo(() => ({
    width: '100%',
    paddingLeft: role === 'user' ? '2rem' : 0,
    paddingRight: role !== 'user' ? '2rem' : 0,
  }), [role]);

  const paperSx = useMemo(() => ({
    display: 'grid',
    justifyItems: role === 'user' ? 'end' : 'start',
    textAlign: role === 'user' ? 'right' : 'left',
    marginBottom: '0.5rem',
    marginRight: role !== 'user' ? '2rem' : 0,
    marginLeft: role === 'user' ? 'auto' : 0,
    width: 'fit-content',
  }), [role]);

  return (
    <div style={containerSx}>
      <Paper
        elevation={6}
        sx={paperSx}
      >
        <Box sx={stableBoxSx}>
          {parts
            .map((part, idx) =>
              part.type === 'text' ? (
                <MuiMarkdown key={idx}>{part.text}</MuiMarkdown>
              ) : part.type === 'tool-invocation' ? (
                <ToolInovocation
                  key={idx}
                  toolInvocation={part.toolInvocation}
                />
              ) : null,
            )
            .filter(Boolean)}
        </Box>
      </Paper>
    </div>
  );
};

export default ChatMessage;
