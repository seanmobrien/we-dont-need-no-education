import React from 'react';
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
  onMeasureElement: (node: Element) => void;
}

export const ChatMessageV2: React.FC<ChatMessageV2Props> = ({
  message,
  virtualRow,
  onMeasureElement,
}) => {
  const { parts = [], role, id: messageId, createdAt } = message;
  const isUser = role === 'user';

  return (
    <Box
      key={virtualRow.key}
      ref={(node: Element) => onMeasureElement(node)}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        transform: `translateY(${virtualRow.start}px)`,
        p: 0.5,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems={isUser ? 'flex-end' : 'flex-start'}
      >
        <Box sx={{ width: '100%', textAlign: isUser ? 'right' : 'left' }}>
          {!isUser && (
            <Avatar
              sx={{
                width: 24,
                height: 24,
                float: 'left',
                marginRight: '1em',
                marginTop: '1em',
              }}
            >
              A
            </Avatar>
          )}
          <Paper
            elevation={6}
            sx={{
              p: 2,
              maxWidth: '70%',
              justifyItems: isUser ? 'flex-end' : 'flex-start',
              textAlign: isUser ? 'right' : 'left',
              marginRight: isUser ? 0 : 2,
              marginLeft: isUser ? 'auto' : 0,
              marginBottom: 2,
              display: 'inline-block',
              // bgcolor: isUser ? 'primary.main' : 'grey.200',
              // color: isUser ? 'white' : 'black',
              borderRadius: 2,
            }}
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
                    />
                  ) : null;
                })
                .filter(Boolean)}
            </Box>
            {createdAt && (
              <Typography
                variant="caption"
                sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}
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
