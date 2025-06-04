import classnames, {
  justifyItems,
  margin,
  padding,
  textAlign,
  width,
} from '@/tailwindcss.classnames';
import { Paper, Box } from '@mui/material';
import { Message } from 'ai';
import MuiMarkdown from 'mui-markdown';
import React from 'react';
import { useMemo } from 'react';

const ChatMessage = ({ message }: { message: Message }) => {
  const { role = 'user', parts = [] } = message ?? {};

  const cssJustify = justifyItems({
    'justify-items-end': role === 'user',
    'justify-items-start': role !== 'user',
  });
  const cssAlign = textAlign({
    'text-right': role === 'user',
    'text-left': role !== 'user',
  });
  const cssMargin = margin({
    'mb-2': true,
    'mr-8': role !== 'user',
    'ml-auto': role === 'user',
  });

  return useMemo(
    () => (
      <div
        className={classnames(
          width('w-full'),
          padding(role === 'user' ? 'pl-8' : 'pr-8'),
        )}
      >
        <Paper
          elevation={6}
          className={classnames(
            cssJustify,
            cssAlign,
            cssMargin,
            width('w-fit'),
          )}
        >
          <Box className="p-2">
            {parts
              .map((part, idx) => {
                if (part.type === 'text') {
                  return <MuiMarkdown key={idx}>{part.text}</MuiMarkdown>;
                }
                if (part.type === 'tool-invocation') {
                  return part.toolInvocation ? (
                    <Box key={idx}>
                      <strong>Tool Call:</strong> {part.toolInvocation.toolName}{' '}
                      {part.toolInvocation.args
                        ? `(${Array.isArray(part.toolInvocation.args) ? part.toolInvocation.args.join(', ') : JSON.stringify(part.toolInvocation.args)})`
                        : null}
                    </Box>
                  ) : null;
                }
                return null;
              })
              .filter(Boolean)}
          </Box>
        </Paper>
      </div>
    ),
    [parts, cssAlign, cssJustify, cssMargin],
  );
};

export default ChatMessage;
