'use client';
import React, { useCallback, useEffect, useState, useMemo, useRef, } from 'react';
import { createPortal } from 'react-dom';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import PublishIcon from '@mui/icons-material/Publish';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ChatMenu } from './chat-menu';
import { isAnnotatedRetryMessage } from '@/lib/ai/core/guards';
import { splitIds, generateChatId } from '@/lib/ai/core/chat-ids';
import { log, LoggedError } from '@compliance-theater/logger';
import { useChatFetchWrapper } from '@/lib/components/ai/chat-fetch-wrapper';
import { getReactPlugin } from '@/instrument/browser';
import { withAITracking } from '@microsoft/applicationinsights-react-js';
import { ChatWindow } from './chat-window';
import ResizableDraggableDialog from '@/components/mui/resizeable-draggable-dialog';
import { useChatPanelContext } from './chat-panel-context';
import { DockedPanel } from './docked-panel';
import { onClientToolRequest } from '@/lib/ai/client';
import { panelStableStyles } from './styles';
import { AllFeatureFlagsDefault } from '@compliance-theater/feature-flags/known-feature-defaults';
import { useFeatureFlags } from '@compliance-theater/feature-flags';
import { useRouter } from 'next/navigation';
const getThreadStorageKey = (threadId) => `chatMessages-${threadId}`;
const activeThreadStorageKey = 'chatActiveId';
const getInitialThreadId = () => {
    if (typeof sessionStorage !== 'undefined') {
        let chatId = sessionStorage.getItem(activeThreadStorageKey);
        if (chatId) {
            return chatId;
        }
        chatId = generateChatId().id;
        sessionStorage.setItem(activeThreadStorageKey, chatId);
    }
    return generateChatId().id;
};
const loadCurrentMessageState = () => {
    if (typeof localStorage === 'undefined') {
        return undefined;
    }
    const threadId = getInitialThreadId();
    const threadStorageKey = getThreadStorageKey(threadId);
    const messages = localStorage.getItem(threadStorageKey);
    if (!messages) {
        return undefined;
    }
    return JSON.parse(messages);
};
const stable_onFinish = ({ message }) => {
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
        const indexOfExisting = messages.findIndex((m) => m.id === message.id);
        let newMessages;
        if (indexOfExisting !== undefined && indexOfExisting >= 0) {
            newMessages = [
                ...messages.slice(0, indexOfExisting),
                message,
                ...messages.slice(indexOfExisting + 1),
            ];
        }
        else {
            newMessages = [...messages, message];
        }
        localStorage.setItem(getThreadStorageKey(threadId), JSON.stringify(newMessages));
    }
};
const generateChatMessageId = () => {
    const threadId = getInitialThreadId();
    const { id: messageId } = generateChatId();
    return `${threadId}:${messageId}`;
};
const ChatPanel = ({ page }) => {
    const [errorMessage, setErrorMessage] = useState(null);
    const [threadId, setThreadId] = useState(getInitialThreadId);
    const [initialMessages, setInitialMessages] = useState(undefined);
    const { getFlag } = useFeatureFlags();
    const modelFlag = getFlag('models_defaults', AllFeatureFlagsDefault['models_defaults']) ?? { provider: 'azure', chat_model: 'lofi' };
    const { provider, chat_model } = modelFlag;
    const [activeModelSelection, setActiveModelSelection] = useState({
        provider: provider,
        model: chat_model,
    });
    const [rateLimitTimeout, setRateLimitTimeout] = useState(new Map());
    const { refresh } = useRouter();
    const { caseFileId, dockPanel, config, setPosition, isFloating, setFloating, debounced: { setSize: debouncedSetSize }, setLastCompletionTime, } = useChatPanelContext();
    const textFieldRef = useRef(null);
    const shouldRestoreFocus = useRef(false);
    const { chatFetch } = useChatFetchWrapper();
    if (!initialMessages) {
        const messages = loadCurrentMessageState();
        if (messages) {
            setInitialMessages(messages);
        }
    }
    const onChatError = useCallback((error) => {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'chat-panel',
        });
        setErrorMessage((current) => current === error.message ? current : error.message);
    }, [setErrorMessage]);
    const onModelTimeout = useCallback(({ data: { model, retryAt } }) => {
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
    }, [setRateLimitTimeout]);
    const { id, messages, status, regenerate, setMessages, sendMessage, addToolResult: addToolResultFromHook, } = useChat({
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
            stable_onFinish(message);
            setLastCompletionTime(new Date());
        },
        onData: (data) => {
            if (isAnnotatedRetryMessage(data)) {
                onModelTimeout(data);
            }
            else {
                log((l) => l.warn('Unhandled item type:', data));
            }
        },
        onError: onChatError,
        experimental_throttle: 100,
    });
    useEffect(() => {
        if (shouldRestoreFocus.current &&
            config.position === 'floating' &&
            textFieldRef.current) {
            const timeoutId = setTimeout(() => {
                if (textFieldRef.current && shouldRestoreFocus.current) {
                    textFieldRef.current.focus();
                    shouldRestoreFocus.current = false;
                }
            }, 0);
            return () => clearTimeout(timeoutId);
        }
    }, [config.position]);
    const getModelString = useCallback((selection) => {
        return `${selection.provider}:${selection.model}`;
    }, []);
    const onSendClick = useCallback((event, model) => {
        const inputElement = textFieldRef.current;
        if (!inputElement) {
            log((l) => l.warn('No input element available for sending message'));
            return;
        }
        const chatText = inputElement.value.trim();
        let threadPartOfId = threadId;
        if (id) {
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
        const withModel = model ?? getModelString(activeModelSelection);
        sendMessage({
            text: chatText,
        }, {
            metadata: {
                model: withModel,
                page,
                threadId: threadPartOfId,
            },
            headers: {
                'x-active-model': withModel,
                'x-active-page': page,
                ...(caseFileId ? { 'x-casefile-id': caseFileId } : {}),
            },
        });
        inputElement.value = '';
    }, [
        activeModelSelection,
        getModelString,
        sendMessage,
        id,
        messages,
        page,
        threadId,
        textFieldRef,
        caseFileId,
    ]);
    const addToolResult = useCallback(async (props) => {
        const ret = await addToolResultFromHook(props);
        onSendClick(new MouseEvent('click'));
        return ret;
    }, [addToolResultFromHook, onSendClick]);
    const handleInputKeyDown = useCallback((e) => {
        const inputElement = textFieldRef.current;
        if (!inputElement) {
            log((l) => l.warn('No input element available for sending message'));
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
            e.preventDefault();
            onSendClick(e);
        }
        else if (e.key === 'ArrowUp' && inputElement.value.trim() === '') {
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
    }, [textFieldRef, messages, onSendClick]);
    const onFloat = useCallback(() => {
        setFloating(true);
    }, [setFloating]);
    const onInline = useCallback(() => {
        setPosition('inline');
    }, [setPosition]);
    const stableChatInputSlotProps = useMemo(() => {
        const onResetSession = () => {
            sessionStorage.removeItem('chatActiveId');
            setThreadId(generateChatId().id);
            setInitialMessages(undefined);
            setMessages([]);
            refresh();
        };
        return {
            input: {
                endAdornment: (<InputAdornment position="end">
            <Box sx={panelStableStyles.inputAdornmentBox}>
              <IconButton edge="end" onClick={onSendClick} data-testid="ChatMessageSend">
                <PublishIcon />
              </IconButton>
              <ChatMenu data-id="ChatMessageMenu" activeModelSelection={activeModelSelection} setActiveModelSelection={setActiveModelSelection} onFloat={onFloat} onDock={setPosition} currentPosition={config.position} onResetSession={onResetSession}/>
            </Box>
          </InputAdornment>),
            },
        };
    }, [
        onSendClick,
        activeModelSelection,
        onFloat,
        setPosition,
        config.position,
        setMessages,
        refresh,
    ]);
    useEffect(() => {
        if (!messages?.length) {
            return;
        }
        const lastMessage = messages[messages.length - 1];
        const timeoutIds = [];
        const thisData = [...(lastMessage.parts ?? [])].filter(isAnnotatedRetryMessage);
        const onRateLimitTimeout = (model) => {
            lastMessage.parts = lastMessage.parts?.filter((item) => !isAnnotatedRetryMessage(item) || item.data.model !== model);
            setMessages((prevMessages) => {
                return [
                    ...prevMessages.slice(0, prevMessages.length - 1),
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
                }
                else {
                    timeoutIds.push(setTimeout(() => {
                        onRateLimitTimeout(thisModel);
                        log((l) => l.warn('Rate limit timeout expired, resending message.'));
                        regenerate();
                    }, rateLimitExpires));
                }
            });
            return () => timeoutIds.forEach(clearTimeout);
        }
    }, [rateLimitTimeout, regenerate, messages, setMessages]);
    const chatContent = useMemo(() => (<Stack spacing={2} sx={panelStableStyles.stack}>
        <TextField inputRef={textFieldRef} multiline rows={5} variant="outlined" placeholder="Type your message here..." onKeyDown={handleInputKeyDown} sx={panelStableStyles.chatInput} slotProps={stableChatInputSlotProps}/>
        <Box sx={panelStableStyles.chatBox}>
          <ChatWindow messages={messages} loading={status === 'submitted'} errorMessage={errorMessage} addToolResult={addToolResult}/>
        </Box>
      </Stack>), [
        textFieldRef,
        handleInputKeyDown,
        addToolResult,
        stableChatInputSlotProps,
        messages,
        status,
        errorMessage,
    ]);
    if (config.position !== 'inline' && config.position !== 'floating') {
        return (<>
        
        <Box sx={{ padding: 2, textAlign: 'center', color: 'text.secondary' }}>
          Chat panel is docked to {config.position}
        </Box>
        
        {typeof document !== 'undefined' &&
                createPortal(<DockedPanel position={config.position} onUndock={onInline} onFloat={onFloat} title={`Chat - ${page}`}>
              {chatContent}
            </DockedPanel>, dockPanel ?? document.body)}
      </>);
    }
    if (config.position === 'floating') {
        return (<>
        
        <Box sx={{ padding: 2, textAlign: 'center', color: 'text.secondary' }}>
          Chat panel is floating
        </Box>
        
        <ResizableDraggableDialog isOpenState={isFloating} title={`Chat - ${page}`} modal={false} width={config.size.width} height={config.size.height} onClose={onInline} onResize={debouncedSetSize}>
          {chatContent}
        </ResizableDraggableDialog>
      </>);
    }
    return (<Box id={`chat-panel-${threadId}`} data-component="chat-panel" sx={panelStableStyles.container}>
      {chatContent}
    </Box>);
};
export default withAITracking(getReactPlugin(), ChatPanel);
//# sourceMappingURL=chat-panel.jsx.map