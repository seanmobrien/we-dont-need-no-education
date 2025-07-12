import { Paper, Box } from '@mui/material';
import { Message } from 'ai';
import MuiMarkdown from 'mui-markdown';
import React from 'react';
import ToolInovocation from './tool-invocation';
import { useMemo } from 'react';

const ChatMessage = ({ message }: { message: Message }) => {
  const { role = 'user', parts = [] } = message ?? {};

  const containerSx = {
    width: '100%',
    paddingLeft: role === 'user' ? '2rem' : 0,
    paddingRight: role !== 'user' ? '2rem' : 0,
  };

  const paperSx = {
    display: 'grid',
    justifyItems: role === 'user' ? 'end' : 'start',
    textAlign: role === 'user' ? 'right' : 'left',
    marginBottom: '0.5rem',
    marginRight: role !== 'user' ? '2rem' : 0,
    marginLeft: role === 'user' ? 'auto' : 0,
    width: 'fit-content',
  };

  const boxSx = {
    padding: '0.5rem',
  };

  return useMemo(
    () => (
      <div style={containerSx}>
        <Paper
          elevation={6}
          sx={paperSx}
        >
          <Box sx={boxSx}>
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
    ),
    [parts, containerSx, paperSx, boxSx],
  );
};

export default ChatMessage;
