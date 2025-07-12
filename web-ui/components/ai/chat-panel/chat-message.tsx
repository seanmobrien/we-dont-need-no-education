import classnames, {
  justifyItems,
  margin,
  padding,
  textAlign,
  width,
} from "clsx";
import { Paper, Box } from '@mui/material';
import { Message } from 'ai';
import MuiMarkdown from 'mui-markdown';
import React from 'react';
import ToolInovocation from './tool-invocation';
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

  const cssContainerPadding = padding({
    'pl-8': role === 'user',
    'pr-8': role !== 'user',
  });
  const cssContainer = classnames(width('w-full'), cssContainerPadding);

  return useMemo(
    () => (
      <div className={cssContainer}>
        <Paper
          elevation={6}
          className={classnames(
            cssJustify,
            cssAlign,
            cssMargin,
            width('w-fit'),
          )}
        >
          <Box className={classnames(padding('p-2'))}>
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
