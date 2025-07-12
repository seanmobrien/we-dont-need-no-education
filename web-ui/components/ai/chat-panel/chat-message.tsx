import clsx from 'clsx';
import { Paper, Box } from '@mui/material';
import { Message } from 'ai';
import MuiMarkdown from 'mui-markdown';
import React from 'react';
import ToolInovocation from './tool-invocation';
import { useMemo } from 'react';

const ChatMessage = ({ message }: { message: Message }) => {
  const { role = 'user', parts = [] } = message ?? {};

  const cssJustify = role === 'user' ? 'justify-items-end' : 'justify-items-start';
  const cssAlign = role === 'user' ? 'text-right' : 'text-left';
  const cssMargin = clsx('mb-2', {
    'mr-8': role !== 'user',
    'ml-auto': role === 'user',
  });

  const cssContainerPadding = role === 'user' ? 'pl-8' : 'pr-8';
  const cssContainer = clsx('w-full', cssContainerPadding);

  return useMemo(
    () => (
      <div className={cssContainer}>
        <Paper
          elevation={6}
          className={clsx(
            cssJustify,
            cssAlign,
            cssMargin,
            'w-fit',
          )}
        >
          <Box className="p-2">
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
    [parts, cssAlign, cssJustify, cssMargin, cssContainer],
  );
};

export default ChatMessage;
