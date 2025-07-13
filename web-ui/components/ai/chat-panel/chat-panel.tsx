'use client';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { ChatMenu } from './chat-menu';
import {
  AiModelType,
  AnnotatedRetryMessage,
  isAnnotatedRetryMessage,
  generateChatId,
} from '@/lib/ai/core';
import { log } from '@/lib/logger';
import { enhancedChatFetch } from '@/lib/components/ai/chat-fetch-wrapper';
import { getReactPlugin } from '@/instrument/browser';
import { withAITracking } from '@microsoft/applicationinsights-react-js';
import { ChatWindow } from './chat-window';
import ResizableDraggableDialog from '@/components/mui/resizeable-draggable-dialog';
import { DockPosition, useChatPanelContext } from './chat-panel-context';
import { DockingOverlay, useDocking } from './docking-overlay';
import { DockedPanel } from './docked-panel';

// Define stable functions and values outside component to avoid re-renders
const getThreadStorageKey = (threadId: string): string =>
  `chatMessages-${threadId}`;
const activeThreadStorageKey = 'chatActiveId';
const chatDialogSizeStorageKey = 'chatDialogSize';

const getInitialThreadId = (): string => {
  if (typeof sessionStorage !== 'undefined') {
    let chatId = sessionStorage.getItem(activeThreadStorageKey);
    if (chatId) {
      return chatId;
    }
    chatId = generateChatId().id;
    sessionStorage.setItem(activeThreadStorageKey, chatId!);
  }
  return generateChatId().id;
};

const loadCurrentMessageState = (): Message[] | undefined => {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }
  const threadId = getInitialThreadId();
  const threadStorageKey = getThreadStorageKey(threadId);
  const messages = localStorage.getItem(threadStorageKey);
  if (!messages) {
    return undefined;
  }
  return JSON.parse(messages) as Array<Message> | undefined;
};

const getStoredDialogSize = (): { width: number; height: number } => {
  if (typeof localStorage === 'undefined') {
    return { width: 600, height: 500 };
  }
  const stored = localStorage.getItem(chatDialogSizeStorageKey);
  if (!stored) {
    return { width: 600, height: 500 };
  }
  try {
    return JSON.parse(stored) as { width: number; height: number };
  } catch {
    return { width: 600, height: 500 };
  }
};

const saveDialogSize = (width: number, height: number): void => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(chatDialogSizeStorageKey, JSON.stringify({ width, height }));
  }
};

const stable_onFinish = (message: Message) => {
  let threadId: string;
  let messageId = message.id;
  if (messageId) {
    const parts = messageId.split(':');
    if (parts.length < 2) {
      console.warn('warning - unable to extract current thread id');
      messageId = '1';
      threadId = generateChatId().id;
    } else {
      threadId = parts[0];
      messageId = parts[1];
    }
  } else {
    const newId = generateChatId().id;
    messageId = `${newId}:1`;
    threadId = newId;
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(activeThreadStorageKey, threadId);
  }
  if (typeof localStorage !== 'undefined') {
    const messages = loadCurrentMessageState();
    const newMessages = [...(messages ?? []), message];
    localStorage.setItem(
      getThreadStorageKey(threadId),
      JSON.stringify(newMessages),
    );
  }
};

const generateChatMessageId = (): string => {
  const threadId = getInitialThreadId();
  const { id: messageId } = generateChatId();
  return `${threadId}:${messageId}`;
};

// Stable style objects
const stableStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 2,
    width: '100%',
    height: '100%', // Fill available height instead of viewport
    boxSizing: 'border-box',
  } as const,
  chatInput: { 
    marginBottom: 2,
    flexShrink: 0,
  } as const,
  stack: { 
    flexGrow: 1, 
    overflow: 'hidden',
    width: '100%',
    minHeight: 0, // Allow flex shrinking
    maxHeight: '100%',
  } as const,
  chatBox: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  } as const,
  placeholderBox: {
    padding: 2,
    textAlign: 'center',
    color: 'text.secondary',
  } as const,
  inputAdornmentBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  } as const,
} as const;

const ChatPanel = ({ page, isDashboardLayout = false }: { page: string; isDashboardLayout?: boolean }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string>(getInitialThreadId());
  const [initialMessages, setInitialMessages] = useState<Message[] | undefined>(
    undefined,
  );
  const [activeModel, setActiveModel] = useState<string>('hifi');
  const [rateLimitTimeout, setRateLimitTimeout] = useState<
    Map<AiModelType, Date>
  >(new Map<AiModelType, Date>());
  
  // Use chat panel context for docking state
  const { config, setPosition, setSize } = useChatPanelContext();
  const { isDragging, startDragging, stopDragging } = useDocking();
  
  // Legacy floating state for backward compatibility
  const [isFloating, setIsFloating] = useState(false);
  const [dialogSize, setDialogSize] = useState(() => getStoredDialogSize());

  // Listen for drag events from the dialog
  useEffect(() => {
    const handleDragStart = () => startDragging();
    const handleDragStop = () => stopDragging();

    window.addEventListener('chatPanelDragStart', handleDragStart);
    window.addEventListener('chatPanelDragStop', handleDragStop);

    return () => {
      window.removeEventListener('chatPanelDragStart', handleDragStart);
      window.removeEventListener('chatPanelDragStop', handleDragStop);
    };
  }, [startDragging, stopDragging]);

  if (!initialMessages) {
    const messages = loadCurrentMessageState();
    if (messages) {
      setInitialMessages(messages);
    }
  }

  const onChatError = useCallback(
    (error: Error) => {
      console.error('Chat error:', error);
      setErrorMessage((current) =>
        current === error.message ? current : error.message,
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

  const onModelTimeout = useCallback(
    ({ data: { model, retryAt } }: AnnotatedRetryMessage) => {
      const now = Date.now();
      const retryAtDate = Date.parse(retryAt);
      if (now < retryAtDate) {
        setRateLimitTimeout((prevTimeout) => {
          const newTimeout = new Map(prevTimeout);
          const retryOn = new Date(retryAtDate);
          const current = newTimeout.get(model);
          if (!current || current.getTime() < retryAtDate) {
            newTimeout.set(model, retryOn);
            return newTimeout;
          }
          return prevTimeout;
        });
      }
    },
    [setRateLimitTimeout],
  );

  const {
    id,
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    data,
    setData,
    reload,
    setMessages,
  } = useChat({
    id: threadId,
    generateId: generateChatMessageId,
    initialMessages,
    maxSteps: 5,
    api: '/api/ai/chat',
    fetch: enhancedChatFetch,
    onToolCall: onChatToolCall,
    onFinish: stable_onFinish,
    onResponse: () => {
      (data ?? []).forEach((item) => {
        if (isAnnotatedRetryMessage(item)) {
          onModelTimeout(item);
        } else {
          log((l) => l.warn('Unhandled item type:', item));
        }
      });
    },
    onError: onChatError,
    experimental_throttle: 100,
  });
  const onSendClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, model?: AiModelType) => {
      if (id) {
        sessionStorage.setItem('chatActiveId', id);
        if (messages && messages.length) {
          localStorage.setItem(`chatMessages-${id}`, JSON.stringify(messages));
        }
      }
      setErrorMessage(null);
      const withModel = model ?? activeModel;
      handleSubmit(event, {
        allowEmptySubmit: false,
        data: {
          model: withModel,
          page,
          threadId: id,
        },
        headers: {
          'x-active-model': withModel,
          'x-active-page': page,
          //'x-traceable': 'false',
        },
      });
    },
    [activeModel, handleSubmit, id, messages, page],
  );
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        onSendClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
      } else if (e.key === 'ArrowUp' && input === '') {
        // If the input is empty, allow the user to navigate through previous messages
        e.preventDefault();
        if (messages && messages.length > 0) {
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
              const messageText = messages[i].parts
                ?.filter((x) => x.type === 'text')
                .map((x) => x.text)
                .join(' ')
                .trim();
              if (messageText) {
                handleInputChange({
                  target: { value: messageText },
                } as React.ChangeEvent<HTMLInputElement>);
                break;
              }
            }
          }
        }
      }
    },
    [handleInputChange, input, messages, onSendClick],
  );

  const onFloat = useCallback(() => {
    setPosition('floating');
    setIsFloating(true);
  }, [setPosition]);

  const onDock = useCallback((position: DockPosition) => {
    setPosition(position);
    setIsFloating(false);
  }, [setPosition]);

  const onUndock = useCallback(() => {
    setPosition('inline');
    setIsFloating(false);
  }, [setPosition]);

  const onCloseFloat = useCallback(() => {
    setPosition('inline');
    setIsFloating(false);
  }, [setPosition]);

  const onDialogResize = useCallback((width: number, height: number) => {
    setDialogSize({ width, height });
    setSize(width, height);
    saveDialogSize(width, height);
  }, [setSize]);

  const stableChatInputSlotProps = useMemo(() => {
    return {
      input: {
        endAdornment: (
          <InputAdornment position="end">
            <Box sx={stableStyles.inputAdornmentBox}>
              <IconButton edge="end" onClick={onSendClick}>
                <PublishIcon />
              </IconButton>
              <ChatMenu
                activeModel={activeModel}
                setActiveModel={setActiveModel}
                onFloat={onFloat}
                onDock={onDock}
                currentPosition={config.position}
                onResetSession={() => {
                  sessionStorage.removeItem('chatActiveId');
                  setThreadId(generateChatId().id);
                  setInitialMessages(undefined);
                  setMessages([]);
                }}
              />
            </Box>
          </InputAdornment>
        ),
      },
    };
  }, [onSendClick, activeModel, setMessages, onFloat, onDock, config.position]);

  useEffect(() => {
    const timeoutIds: Array<NodeJS.Timeout | number> = [];
    const thisData = [...(data ?? [])].filter(isAnnotatedRetryMessage);
    const onRateLimitTimeout = (model: string) => {
      setData((prevData) => {
        const newData = prevData?.filter(
          (item) => !isAnnotatedRetryMessage(item) || item.data.model !== model,
        );
        return newData?.length === prevData?.length ? prevData : newData;
      });
    };
    if (thisData.length > 0) {
      thisData.forEach(
        ({ data: { retryAt, model } }: AnnotatedRetryMessage) => {
          const thisModel = model;
          const timeout = new Date(Date.parse(retryAt));
          const rateLimitExpires = timeout.getTime() - Date.now();
          if (rateLimitExpires <= 0) {
            onRateLimitTimeout(thisModel);
            reload();
          } else {
            timeoutIds.push(
              setTimeout(() => {
                onRateLimitTimeout(thisModel);
                console.warn('Rate limit timeout expired, resending message.');
                reload();
              }, rateLimitExpires),
            );
          }
        },
      );
      return () => timeoutIds.forEach(clearTimeout);
    }
  }, [rateLimitTimeout, reload, data, setData]);

  // Create chat content component
  const chatContent = useMemo(() => (
    <Stack 
      spacing={2} 
      sx={stableStyles.stack}
    >
      <TextField
        multiline
        rows={5}
        variant="outlined"
        placeholder="Type your message here..."
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        sx={{ ...stableStyles.chatInput, width: '100%' }}
        slotProps={stableChatInputSlotProps}
      />
      <Box sx={stableStyles.chatBox}>
        <ChatWindow
          messages={messages}
          loading={status === 'submitted'}
          errorMessage={errorMessage}
        />
      </Box>
    </Stack>
  ), [input, handleInputChange, handleInputKeyDown, stableChatInputSlotProps, messages, status, errorMessage]);

  // Handle docked positions
  if (config.position !== 'inline' && config.position !== 'floating') {
    return (
      <>
        {/* Placeholder for inline position */}
        <Box sx={{ padding: 2, textAlign: 'center', color: 'text.secondary' }}>
          Chat panel is docked to {config.position}
        </Box>
        {/* Docked panel - render using portal to escape layout context */}
        {typeof document !== 'undefined' && createPortal(
          <DockedPanel
            position={config.position}
            onUndock={onUndock}
            onFloat={onFloat}
            title={`Chat - ${page}`}
          >
            {chatContent}
          </DockedPanel>,
          document.body
        )}
        {/* Docking overlay when dragging */}
        <DockingOverlay
          isActive={isDragging}
          onDock={onDock}
          isDashboardLayout={isDashboardLayout}
        />
      </>
    );
  }

  // Handle floating state
  if (config.position === 'floating' || isFloating) {
    return (
      <>
        {/* Placeholder for inline position */}
        <Box sx={{ padding: 2, textAlign: 'center', color: 'text.secondary' }}>
          Chat panel is floating
        </Box>
        {/* Floating dialog */}
        <ResizableDraggableDialog
          isOpenState={[isFloating, setIsFloating]}
          title={`Chat - ${page}`}
          modal={false}
          initialWidth={dialogSize.width}
          initialHeight={dialogSize.height}
          onClose={onCloseFloat}
          onResize={onDialogResize}
        >
          {chatContent}
        </ResizableDraggableDialog>
        {/* Docking overlay when dragging */}
        <DockingOverlay
          isActive={isDragging}
          onDock={onDock}
          isDashboardLayout={isDashboardLayout}
        />
      </>
    );
  }

  return (
    <Box id={`chat-panel-${threadId}`} sx={stableStyles.container}>
      {chatContent}
    </Box>
  );
};

export default withAITracking(getReactPlugin(), ChatPanel);
