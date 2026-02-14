import React, { useEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Box from '@mui/material/Box';
import { Loading } from '@/components/general/loading';
import { ChatMessageV2 } from './chat-message';
import { createElementMeasurer } from '@/lib/components/ai/height-estimators';
import { log } from '@compliance-theater/logger';
import { useChatPanelContext } from '@/components/ai/chat-panel/chat-panel-context';
const elementMeasurer = createElementMeasurer();
export const ChatWindow = ({ messages, loading, errorMessage, addToolResult, }) => {
    const parentRef = useRef(null);
    const { config: { size: { height }, position: dockPosition, }, } = useChatPanelContext();
    useEffect(() => {
        if (!parentRef.current) {
            return;
        }
        if (dockPosition === 'inline') {
            parentRef.current.style.maxHeight = 'initial';
            return;
        }
        let parent = parentRef.current;
        const body = document.body;
        while (parent && !body.isSameNode(parent)) {
            if (parent.dataset['component'] === 'chat-panel') {
                break;
            }
            parent = parent.parentElement;
        }
        if (!parent) {
            parent = parentRef.current;
        }
        const availableHeight = height - parent.getBoundingClientRect().x;
        parentRef.current.style.maxHeight = `${availableHeight - 25}px`;
    }, [height, dockPosition]);
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    const estimateSize = useCallback((index) => {
        const message = messagesRef.current[index];
        let width = 0;
        if (parentRef.current === null) {
            log((l) => l.verbose('Measurement attempted before parentRef is available to provide width'));
            if (typeof window !== 'undefined') {
                width = window.innerWidth * 0.7;
            }
            else {
                width = 829;
            }
        }
        else {
            width = parentRef.current.getBoundingClientRect().width;
        }
        const markdownText = message.parts
            ?.filter((part) => part.type === 'text')
            .map((part) => part.text)
            .join('\n') || '';
        const estimatedHeight = elementMeasurer.measureMarkdown
            ? elementMeasurer.measureMarkdown({ text: markdownText, width })
            : 80;
        const toolInvocations = message.parts?.filter((part) => part.type === 'tool-invocation')
            .length || 0;
        const toolHeight = toolInvocations * 40;
        const paperPadding = 32;
        const marginBetween = 16;
        return estimatedHeight + toolHeight + paperPadding + marginBetween;
    }, [parentRef]);
    const getScrollElement = useCallback(() => parentRef.current, []);
    const getItemKey = useCallback((index) => messagesRef.current[index].id, []);
    const rowVirtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement,
        estimateSize,
        overscan: 10,
        scrollPaddingStart: 0,
        getItemKey,
    });
    const items = [...messages].reverse();
    return (<Box ref={parentRef} sx={{
            height: '100%',
            width: '100%',
            border: '1px solid #ccc',
            backgroundColor: 'var(--color-surface-overlay)',
            borderRadius: 4,
            p: 2,
            display: 'flex',
            flexDirection: 'column-reverse',
        }}>
      {loading && (<Box sx={{ textAlign: 'center', width: '100%' }}>
          <Loading loading={loading} errorMessage={errorMessage}/>
        </Box>)}
      <Box sx={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
            overflowY: 'auto',
        }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const { parts = [], role, id: messageId, } = items[virtualRow.index];
            return (<ChatMessageV2 key={messageId} message={{
                    parts,
                    role,
                    id: messageId,
                }} virtualRow={virtualRow} addToolResult={addToolResult} onMeasureElement={rowVirtualizer.measureElement}/>);
        })}
      </Box>
    </Box>);
};
//# sourceMappingURL=chat-window.jsx.map