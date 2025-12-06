'use client';
import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react';
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
import { UIMessage, DefaultChatTransport } from 'ai';
import { ChatMenu } from './chat-menu';
import { isAnnotatedRetryMessage } from '@/lib/ai/core/guards';
import type { AiModelType } from '@/lib/ai/core/unions';
import type { AnnotatedRetryMessage } from '@/lib/ai/core/types';
import { splitIds, generateChatId } from '@/lib/ai/core/chat-ids';
import { log } from '@/lib/logger';
import { useChatFetchWrapper } from '@/lib/components/ai/chat-fetch-wrapper';
import { getReactPlugin } from '@/instrument/browser';
import { withAITracking } from '@microsoft/applicationinsights-react-js';
import { ChatWindow } from './chat-window';
import ResizableDraggableDialog from '@/components/mui/resizeable-draggable-dialog';
import type {
  AiProvider,
  DockPosition,
  ModelSelection,
  ModelType,
} from './types';
import { useChatPanelContext } from './chat-panel-context';
import { DockedPanel } from './docked-panel';
import { onClientToolRequest } from '@/lib/ai/client';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { FirstParameter } from '@/lib/typescript';
import { panelStableStyles } from './styles';
import { AllFeatureFlagsDefault } from '@/lib/site-util/feature-flags/known-feature-defaults';
import type { KnownFeatureValueType } from '@/lib/site-util/feature-flags/types';
import { useFeatureFlags } from '@/lib/site-util/feature-flags';

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

const loadCurrentMessageState = (): UIMessage[] | undefined => {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }
  const threadId = getInitialThreadId();
  const threadStorageKey = getThreadStorageKey(threadId);
  const messages = localStorage.getItem(threadStorageKey);
  if (!messages) {
    return undefined;
  }
  return JSON.parse(messages) as Array<UIMessage> | undefined;
};

const stable_onFinish = ({ message }: { message: UIMessage }) => {
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
    const indexOfExisting = messages.findIndex((m) => m.id === message.id);
    let newMessages: UIMessage[];
    if (indexOfExisting !== undefined && indexOfExisting >= 0) {
      // Replace the existing message
      newMessages = [
        ...messages.slice(0, indexOfExisting),
        message,
        ...messages.slice(indexOfExisting + 1),
      ];
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

const ChatPanel = ({ page }: { page: string }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string>(getInitialThreadId);
  const [initialMessages, setInitialMessages] = useState<
    UIMessage[] | undefined
  >(undefined);
  const { getFlag } = useFeatureFlags();
  const modelFlag = getFlag(
    'models_defaults',
    AllFeatureFlagsDefault['models_defaults'],
  ) ?? { provider: 'azure', chat_model: 'lofi' };
  const { provider, chat_model } =
    modelFlag as KnownFeatureValueType<'models_defaults'>;
  const [activeModelSelection, setActiveModelSelection] =
    useState<ModelSelection>({
      provider: provider as AiProvider,
      model: chat_model as ModelType,
    });
  const [rateLimitTimeout, setRateLimitTimeout] = useState<
    Map<AiModelType, Date>
  >(new Map<AiModelType, Date>());

  // Use chat panel context for docking state
  const {
    caseFileId,
    dockPanel,
    config,
    setPosition,
    isFloating,
    setFloating,
    debounced: { setSize: debouncedSetSize },
    setLastCompletionTime,
  } = useChatPanelContext();

  // Using ref for input element in order to minimize renders on text change
  const textFieldRef = useRef<HTMLInputElement>(null);
  const shouldRestoreFocus = useRef<boolean>(false);
  const { chatFetch } = useChatFetchWrapper();

  if (!initialMessages) {
    const messages = loadCurrentMessageState();
    if (messages) {
      setInitialMessages(messages);
    }
  }

  const onChatError = useCallback(
    (error: Error) => {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'chat-panel',
      });
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
    status,
    regenerate,
    setMessages,
    sendMessage,
    addToolResult: addToolResultFromHook,
  } = useChat({
    generateId: generateChatMessageId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/ai/chat',
      fetch: chatFetch,
    }),
    onToolCall: ({ toolCall }) => {
      onClientToolRequest({ toolCall, addToolResult });
    },
    onFinish: (message) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stable_onFinish(message as any);
      setLastCompletionTime(new Date());
    },
    onData: (data) => {
      if (isAnnotatedRetryMessage(data)) {
        onModelTimeout(data);
      } else {
        log((l) => l.warn('Unhandled item type:', data));
      }
    },
    onError: onChatError,
    experimental_throttle: 100,
  });

  // Effect to restore focus in floating mode after re-renders
  useEffect(() => {
    if (
      shouldRestoreFocus.current &&
      config.position === 'floating' &&
      textFieldRef.current
    ) {
      // Use a small timeout to ensure the DOM has been updated
      const timeoutId = setTimeout(() => {
        if (textFieldRef.current && shouldRestoreFocus.current) {
          textFieldRef.current.focus();
          shouldRestoreFocus.current = false;
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [/*input, */ config.position]); // Trigger on input changes and position changes
  // Convert ModelSelection to provider-prefixed model string
  const getModelString = useCallback((selection: ModelSelection): string => {
    return `${selection.provider}:${selection.model}`;
  }, []);

  const onSendClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, model?: AiModelType) => {
      const inputElement = textFieldRef.current;
      if (!inputElement) {
        log((l) => l.warn('No input element available for sending message'));
        return;
      }
      const chatText = inputElement.value.trim();
      let threadPartOfId = threadId;
      if (id) {
        // Get the thread part of the id
        threadPartOfId = id.split(':')[0];
        if (threadPartOfId !== threadId) {
          setThreadId(threadPartOfId);
        }
        sessionStorage.setItem('chatActiveId', threadPartOfId);
        if (messages && messages.length) {
          localStorage.setItem(
            `chatMessages-${threadPartOfId}`,
            JSON.stringify(messages),
          );
        }
      }
      setErrorMessage(null);
      const withModel = model ?? getModelString(activeModelSelection);
      sendMessage(
        {
          text: chatText,
        },
        {
          metadata: {
            model: withModel,
            page,
            threadId: threadPartOfId,
          },
          headers: {
            'x-active-model': withModel,
            'x-active-page': page,
            ...(caseFileId ? { 'x-casefile-id': caseFileId } : {}),
            // still available: x-write-enabled, x-memory-disabled, x-memory-disabled
          },
        },
      );
      inputElement.value = '';
    },
    [
      activeModelSelection,
      getModelString,
      sendMessage,
      id,
      messages,
      page,
      threadId,
      textFieldRef,
      caseFileId,
    ],
  );

  const addToolResult = useCallback(
    async (props: FirstParameter<typeof addToolResultFromHook>) => {
      const ret = await addToolResultFromHook(props);
      onSendClick(
        new MouseEvent(
          'click',
        ) as unknown as React.MouseEvent<HTMLButtonElement>,
      );
      return ret;
    },
    [addToolResultFromHook, onSendClick],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const inputElement = textFieldRef.current;
      if (!inputElement) {
        log((l) => l.warn('No input element available for sending message'));
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        e.preventDefault();
        onSendClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
      } else if (e.key === 'ArrowUp' && inputElement.value.trim() === '') {
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
                inputElement.value = messageText;
                break;
              }
            }
          }
        }
      }
    },
    [textFieldRef, messages, onSendClick],
  );

  const onFloat = useCallback(() => {
    // set isFloating to true
    setFloating(true);
  }, [setFloating]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onDock = useCallback(
    (position: DockPosition) => {
      setPosition(position);
    },
    [setPosition],
  );

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
            <Box sx={panelStableStyles.inputAdornmentBox}>
              <IconButton
                edge="end"
                onClick={onSendClick}
                data-testid="ChatMessageSend"
              >
                <PublishIcon />
              </IconButton>
              <ChatMenu
                data-id="ChatMessageMenu"
                activeModelSelection={activeModelSelection}
                setActiveModelSelection={setActiveModelSelection}
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
  }, [
    onSendClick,
    activeModelSelection,
    onFloat,
    setPosition,
    config.position,
    setMessages,
  ]);

  useEffect(() => {
    if (!messages?.length) {
      return;
    }
    const lastMessage = messages[messages.length - 1];
    const timeoutIds: Array<NodeJS.Timeout | number> = [];
    const thisData = [...(lastMessage.parts ?? [])].filter(
      isAnnotatedRetryMessage,
    ) as Array<AnnotatedRetryMessage>;
    const onRateLimitTimeout = (model: string) => {
      lastMessage.parts = lastMessage.parts?.filter(
        (item) => !isAnnotatedRetryMessage(item) || item.data.model !== model,
      );
      setMessages((prevMessages) => {
        return [
          ...prevMessages!.slice(0, prevMessages!.length - 1),
          lastMessage,
        ];
      });
    };
    if (thisData.length > 0) {
      thisData.forEach(({ data: { retryAt, model } }) => {
        const thisModel = model;
        const timeout = new Date(Date.parse(retryAt));
        const rateLimitExpires = timeout.getTime() - Date.now();
        if (rateLimitExpires <= 0) {
          onRateLimitTimeout(thisModel);
          regenerate();
        } else {
          timeoutIds.push(
            setTimeout(() => {
              onRateLimitTimeout(thisModel);
              log((l) =>
                l.warn('Rate limit timeout expired, resending message.'),
              );
              regenerate();
            }, rateLimitExpires),
          );
        }
      });
      return () => timeoutIds.forEach(clearTimeout);
    }
  }, [rateLimitTimeout, regenerate, messages, setMessages]);

  // Create chat content component
  const chatContent = useMemo(
    () => (
      <Stack spacing={2} sx={panelStableStyles.stack}>
        <TextField
          inputRef={textFieldRef}
          multiline
          rows={5}
          variant="outlined"
          placeholder="Type your message here..."
          // onChange={handleInputChangeWithFocusPreservation}
          onKeyDown={handleInputKeyDown}
          sx={panelStableStyles.chatInput}
          slotProps={stableChatInputSlotProps}
        />
        <Box sx={panelStableStyles.chatBox}>
          <ChatWindow
            messages={messages}
            loading={status === 'submitted'}
            errorMessage={errorMessage}
            addToolResult={addToolResult}
          />
        </Box>
      </Stack>
    ),
    [
      textFieldRef,
      // handleInputChangeWithFocusPreservation,
      handleInputKeyDown,
      addToolResult,
      stableChatInputSlotProps,
      messages,
      status,
      errorMessage,
    ],
  );

  // Handle docked positions
  if (config.position !== 'inline' && config.position !== 'floating') {
    return (
      <>
        {/* Placeholder for inline position */}
        <Box sx={{ padding: 2, textAlign: 'center', color: 'text.secondary' }}>
          Chat panel is docked to {config.position}
        </Box>
        {/* Docked panel - render using portal to escape layout context */}
        {typeof document !== 'undefined' &&
          createPortal(
            <DockedPanel
              position={config.position}
              onUndock={onInline}
              onFloat={onFloat}
              title={`Chat - ${page}`}
            >
              {chatContent}
            </DockedPanel>,
            dockPanel ?? document.body,
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
    <Box
      id={`chat-panel-${threadId}`}
      data-component="chat-panel"
      sx={panelStableStyles.container}
    >
      {chatContent}
    </Box>
  );
};

export default withAITracking(getReactPlugin(), ChatPanel);
