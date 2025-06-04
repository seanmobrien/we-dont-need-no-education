'use client';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import PublishIcon from '@mui/icons-material/Publish';
import { useChat } from '@ai-sdk/react';
import { Message, ToolCall } from 'ai';
import { Loading } from '@/components/general/loading';
import { ChatMenu } from './chat-menu';
import ChatMessage from './chat-message';
import classnames, {
  alignItems,
  display,
  flexDirection,
  width,
} from '@/tailwindcss.classnames';

const ChatPanel = ({ page }: { page: string }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialId, setInitialId] = useState<string | undefined>(undefined);
  const [initialMessages, setInitialMessages] = useState<Message[] | undefined>(
    undefined,
  );
  const [activeModel, setActiveModel] = useState<string>('hifi');

  useEffect(() => {
    const chatId = sessionStorage.getItem('chatActiveId');
    const chatMessages = sessionStorage.getItem(`chatMessages-${chatId}`);

    if (chatId) {
      setInitialId(chatId);
    }
    if (chatMessages) {
      try {
        setInitialMessages(JSON.parse(chatMessages));
      } catch (error) {
        console.error(
          'Failed to parse chat messages from sessionStorage:',
          error,
        );
      }
    }
  }, []);

  const onChatError = useCallback(
    (error: Error) => {
      setErrorMessage((current) =>
        current == error?.message
          ? current
          : error?.message
            ? error?.message
            : '',
      );
    },
    [setErrorMessage],
  );

  const onChatToolCall = useCallback(
    async ({ toolCall }: { toolCall: ToolCall<string, unknown> }) => {
      if (toolCall.toolName === 'getLocation') {
        const cities = ['New York', 'Los Angeles', 'Chicago', 'San Francisco'];
        return cities[Math.floor(Math.random() * cities.length)];
      }
    },
    [],
  );
  const onResetSession = useCallback(() => {
    sessionStorage.removeItem('chatActiveId');
    setInitialId(undefined);
    setInitialMessages(undefined);
  }, []);

  const { id, messages, input, handleInputChange, handleSubmit, status } =
    useChat({
      id: initialId,
      initialMessages,
      maxSteps: 5,
      api: '/api/ai/chat',
      onToolCall: onChatToolCall,
      onFinish: (message: Message) => {
        sessionStorage.setItem('chatActiveId', id ?? '');
        sessionStorage.setItem(
          `chatMessages-${id}`,
          JSON.stringify([...(messages ?? []), message]),
        );
      },
      onError: onChatError,
    });

  const onSendClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (id) {
        sessionStorage.setItem('chatActiveId', id);
      }
      if (messages && messages.length) {
        sessionStorage.setItem(`chatMessages-${id}`, JSON.stringify(messages));
      }
      setErrorMessage(null);
      handleSubmit(event, {
        allowEmptySubmit: false,
        data: {
          model: activeModel,
          page,
        },
      });
    },
    [activeModel, handleSubmit, id, messages, page],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 2,
        width: '96%',
      }}
    >
      <Stack className="w-full" spacing={2}>
        <TextField
          multiline
          rows={5}
          className="w-full"
          variant="outlined"
          placeholder="Type your message here..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
              e.preventDefault();
              onSendClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
            }
          }}
          sx={{ marginBottom: 2 }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <IconButton edge="end" onClick={onSendClick}>
                    <PublishIcon />
                  </IconButton>
                  <ChatMenu
                    activeModel={activeModel}
                    setActiveModel={setActiveModel}
                    onResetSession={onResetSession}
                  />
                </Box>
              </InputAdornment>
            ),
          }}
        />
        <Box
          sx={{
            marginTop: 2,
            padding: 2,
            border: '1px solid #ccc',
            borderRadius: 4,
            backgroundColor: '--color-gray-800',
            maxHeight: '450px',
            overflowY: 'auto',
          }}
          className={classnames(
            width('w-full'),
            flexDirection('flex-col'),
            display('flex'),
            alignItems('items-start'),
          )}
        >
          <Loading
            loading={status === 'submitted'}
            errorMessage={errorMessage}
          />
          {messages?.length &&
            messages
              .slice(0, messages.length)
              .reverse()
              .map((message) => (
                <ChatMessage message={message} key={message.id} />
              ))}
        </Box>
      </Stack>
    </Box>
  );
};

export default ChatPanel;
