import React, { useCallback, useMemo } from 'react';
import { Box, Paper, Typography, Avatar, Stack } from '@mui/material';
import { Message } from 'ai';
import { VirtualItem } from '@tanstack/react-virtual';
import MuiMarkdown from 'mui-markdown';
import ToolInovocation from './tool-invocation';
import { notCryptoSafeKeyHash } from '@/lib/ai/core';

interface ChatMessageV2Props {
  message: {
    parts: Message['parts'];
    role: Message['role'];
    id: string;
    createdAt?: Date;
  };
  virtualRow: VirtualItem;
  addToolResult: <TResult>({}:{ toolCallId: string; result: TResult }) => void;
  onMeasureElement: (node: Element) => void;
}

export const ChatMessageV2: React.FC<ChatMessageV2Props> = ({
  message,
  virtualRow,
  onMeasureElement,
  addToolResult,
}) => {
  const { parts = [], role, id: messageId, createdAt } = message;
  const isUser = role === 'user';

  const measureElementCallback = useCallback((node: Element) => {
    if(node) {
      onMeasureElement(node);
    }
  }, [onMeasureElement]);
  const stableSx = useMemo(() => ({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      transform: `translateY(${virtualRow.start}px)`,
      p: 0.5,
    },
    stackWrapper: {
      width: '100%', 
      textAlign: isUser ? 'right' : 'left' 
    },
    avatar: {
      width: 24,
      height: 24,
      float: 'left',
      marginRight: '1em',
      marginTop: '1em',
    },
    paper: {
              p: 2,
              maxWidth: '70%',
              justifyItems: isUser ? 'flex-end' : 'flex-start',
              textAlign: isUser ? 'right' : 'left',
              marginRight: isUser ? 0 : 2,
              marginLeft: isUser ? 'auto' : 0,
              marginBottom: 2,
              display: 'inline-block',
              borderRadius: 2,
            },
            dateline: { display: 'block', textAlign: 'right', mt: 0.5 }
  }), [virtualRow.start, isUser])

  return (
    <Box
      key={virtualRow.key}
      ref={measureElementCallback}
      sx={stableSx.container}
      data-index={virtualRow.index}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems={isUser ? 'flex-end' : 'flex-start'}
      >
        <Box sx={stableSx.stackWrapper}>
          {!isUser && (
            <Avatar
              sx={stableSx.avatar}
            >
              A
            </Avatar>
          )}
          <Paper
            elevation={6}
            sx={stableSx.paper}
          >
            <Box>
              {parts
                .map((part) => {
                  return part.type === 'text' ? (
                    <MuiMarkdown
                      key={`${messageId}-text-${notCryptoSafeKeyHash(part.text)}`}
                    >
                      {part.text}
                    </MuiMarkdown>
                  ) : part.type === 'tool-invocation' ? (
                    <ToolInovocation
                      key={`${messageId}-tool-${part.toolInvocation.toolCallId}-${part.toolInvocation.state}`}
                      toolInvocation={part.toolInvocation}
                      addToolResult={addToolResult}
                    />
                  ) : null;
                })
                .filter(Boolean)}
            </Box>
            {createdAt && (
              <Typography
                variant="caption"
                sx={stableSx.dateline}
              >
                {createdAt.toLocaleString()}
              </Typography>
            )}
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
};
