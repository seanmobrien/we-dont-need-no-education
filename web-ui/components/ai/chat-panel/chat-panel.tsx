'use client';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
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
import { /*enhancedChatFetch, */ useChatFetchWrapper } from '@/lib/components/ai/chat-fetch-wrapper';
import { getReactPlugin } from '@/instrument/browser';
import { withAITracking } from '@microsoft/applicationinsights-react-js';
import { ChatWindow } from './chat-window';
import ResizableDraggableDialog from '@/components/mui/resizeable-draggable-dialog';
import type {DockPosition} from './types';
import { useChatPanelContext } from './chat-panel-context';
import { DockedPanel } from './docked-panel';
import { onClientToolRequest } from '@/lib/ai/client';

// Define stable functions and values outside component to avoid re-renders
const getThreadStorageKey = (threadId: string): string =>
  `chatMessages-${threadId}`;
const activeThreadStorageKey = 'chatActiveId';

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


const splitIds = (id: string): [string, string | undefined] => {
  if (!id) {
    log(l => l.warn('No ID provided to splitIds, returning emtpy values.'));
    return ['', undefined];
  }  
  const splitIndex = id.indexOf(':');
  if (splitIndex === -1) {
    log(l => l.warn('No ":" found in ID, returning as is.'));
    return [id, undefined];
  }
  if (splitIndex === 0 || splitIndex === id.length - 1) {
    log(l => l.warn('Invalid ID format, returning empty values.'));
    return ['', undefined];
  }
  return [id.slice(0, splitIndex), id.slice(splitIndex + 1)];
}

const stable_onFinish = (message: Message) => {
  let [threadId, messageId] = splitIds(message.id);
  if (!threadId) {    
    threadId = generateChatId().id;    
  }
  if (!messageId) {
    messageId = generateChatId().id;
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(activeThreadStorageKey, threadId);
  }
  if (typeof localStorage !== 'undefined') {
    const messages = loadCurrentMessageState() ?? [];
    // This may be a revisised message, so first we check if it exists
    const indexOfExisting = messages.findIndex(
      (m) => m.id === message.id,
    );
    let newMessages: Message[];
    if (indexOfExisting !== undefined && indexOfExisting >= 0) {
      // Replace the existing message      
      newMessages = [...messages.slice(0, indexOfExisting), message, ...messages.slice(indexOfExisting + 1)];
    } else {
      newMessages = [...messages, message];
    }
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
    width: '100%',
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

const ChatPanel = ({ page }: { page: string }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string>(getInitialThreadId);
  const [initialMessages, setInitialMessages] = useState<Message[] | undefined>(
    undefined,
  );
  const [activeModel, setActiveModel] = useState<string>('hifi');
  const [rateLimitTimeout, setRateLimitTimeout] = useState<
    Map<AiModelType, Date>
  >(new Map<AiModelType, Date>());
  
  // Use chat panel context for docking state
  const { dockPanel, config, setPosition, isFloating, setFloating, debounced: { setSize: debouncedSetSize } } = useChatPanelContext();

  // Ref for the TextField input to preserve focus in floating mode
  const textFieldRef = useRef<HTMLInputElement>(null);
  const shouldRestoreFocus = useRef<boolean>(false);
  const {chatFetch} = useChatFetchWrapper();

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
    addToolResult,
  } = useChat({
    // id: threadId,
    generateId: generateChatMessageId,
    initialMessages,
    maxSteps: 5,
    api: '/api/ai/chat',
    fetch: chatFetch,
    onToolCall: async ({ toolCall }: { toolCall: ToolCall<string, unknown> }) => {
      onClientToolRequest({toolCall, addToolResult });
    },
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

  // Enhanced input change handler that preserves focus in floating mode
  const handleInputChangeWithFocusPreservation = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      // Track if we should restore focus after the input change
      const isFloatingMode = config.position === 'floating';
      const inputElement = textFieldRef.current;
      const wasFocused = document.activeElement === inputElement;
      
      if (isFloatingMode && wasFocused) {
        shouldRestoreFocus.current = true;
      }
      
      // Call the original input change handler
      handleInputChange(event);
    },
    [handleInputChange, config.position],
  );

  // Effect to restore focus in floating mode after re-renders
  useEffect(() => {
    if (shouldRestoreFocus.current && config.position === 'floating' && textFieldRef.current) {
      // Use a small timeout to ensure the DOM has been updated
      const timeoutId = setTimeout(() => {
        if (textFieldRef.current && shouldRestoreFocus.current) {
          textFieldRef.current.focus();
          shouldRestoreFocus.current = false;
        }
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [input, config.position]); // Trigger on input changes and position changes
  const onSendClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, model?: AiModelType) => {
      let threadPartOfId = threadId;
      if (id) {
        // Get the thread part of the id
        threadPartOfId = id.split(':')[0];
        if (threadPartOfId !== threadId) {
          setThreadId(threadPartOfId);
        }
        sessionStorage.setItem('chatActiveId', threadPartOfId);
        if (messages && messages.length) {
          localStorage.setItem(`chatMessages-${threadPartOfId}`, JSON.stringify(messages));
        }
      }
      setErrorMessage(null);
      const withModel = model ?? activeModel;
      handleSubmit(event, {
        allowEmptySubmit: false,
        data: {
          model: withModel,
          page,
          threadId: threadPartOfId,
        },
        headers: {
          'x-active-model': withModel,
          'x-active-page': page, 
        },
      });
    },
    [activeModel, handleSubmit, id, messages, page, threadId],
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
    // set isFloating to true
    setFloating(true);
  }, [setFloating]);
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onDock = useCallback((position: DockPosition) => {
    setPosition(position);
  }, [setPosition]);

  const onInline = useCallback(() => {
    setPosition('inline');
  }, [setPosition]);





  const stableChatInputSlotProps = useMemo(() => {
    const onResetSession = () => {
      sessionStorage.removeItem('chatActiveId');
      setThreadId(generateChatId().id);
      setInitialMessages(undefined);
      setMessages([]);
    };

    return {
      input: {
        endAdornment: (
          <InputAdornment position="end">
            <Box sx={stableStyles.inputAdornmentBox}>
              <IconButton edge="end" onClick={onSendClick} data-id="ChatMessageSend">
                <PublishIcon />
              </IconButton>
              <ChatMenu
                data-id="ChatMessageMenu"
                activeModel={activeModel}
                setActiveModel={setActiveModel}
                onFloat={onFloat}
                onDock={setPosition}
                currentPosition={config.position}
                onResetSession={onResetSession}
              />
            </Box>
          </InputAdornment>
        ),
      },
    };
  }, [onSendClick, activeModel, onFloat, setPosition, config.position, setMessages]);

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
        inputRef={textFieldRef}
        multiline
        rows={5}
        variant="outlined"
        placeholder="Type your message here..."
        value={input}
        onChange={handleInputChangeWithFocusPreservation}
        onKeyDown={handleInputKeyDown}
        sx={stableStyles.chatInput}
        slotProps={stableChatInputSlotProps}
      />
      <Box sx={stableStyles.chatBox}>
        <ChatWindow
          messages={messages}
          loading={status === 'submitted'}
          errorMessage={errorMessage}
          addToolResult={addToolResult}
        />
      </Box>
    </Stack>
  ), [input, handleInputChangeWithFocusPreservation, handleInputKeyDown, addToolResult, stableChatInputSlotProps, messages, status, errorMessage]);

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
            onUndock={onInline}
            onFloat={onFloat}
            title={`Chat - ${page}`}
          >
            {chatContent}
          </DockedPanel>,
          dockPanel ?? document.body
        )}       
      </>
    );
  }

  // Handle floating state
  if (config.position === 'floating') {
    return (
      <>
        {/* Placeholder for inline position */}
        <Box sx={{ padding: 2, textAlign: 'center', color: 'text.secondary' }}>
          Chat panel is floating
        </Box>
        {/* Floating dialog */}
        <ResizableDraggableDialog
          isOpenState={isFloating}
          title={`Chat - ${page}`}
          modal={false}
          width={config.size.width}
          height={config.size.height}
          onClose={onInline}
          onResize={debouncedSetSize}
        >
          {chatContent}
        </ResizableDraggableDialog>
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
