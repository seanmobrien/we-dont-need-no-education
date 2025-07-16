import React, { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box } from '@mui/material';
import { Message } from 'ai';
import Loading from '@/components/general/loading';
import { ChatMessageV2 } from './chat-message-v2';
import { createElementMeasurer } from '@/lib/components/ai/height-estimators';
import { log } from '@/lib/logger';
import { useChatPanelContext } from '@/components/ai/chat-panel/chat-panel-context';

const elementMeasurer = createElementMeasurer();

export const ChatWindow = ({
  messages,
  loading,
  errorMessage,
}: {
  messages: Array<Message>;
  loading: boolean;
  errorMessage?: string | null;
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const {config: { size: { height } }} = useChatPanelContext();
  useEffect(() => {
    if (!parentRef.current) {
      return;
    }
    const availableHeight = height - parentRef.current.getBoundingClientRect().x;
    parentRef.current.style.maxHeight = `${availableHeight - 25}px`;


  }, [height]);



  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const message = messages[index];

      let width = 0;
      // Attach message to a ChatMessageV2 component and use createElementMeasurer to estimate height
      // Import createElementMeasurer from your height-estimators utility
      // (Assume it's imported at the top: import { createElementMeasurer } from '@/lib/components/ai/height-esimators';)
      if (parentRef.current === null) {
        // Handle case where parentRef is not yet available
        log((l) =>
          l.verbose(
            'Measurement attempted before parentRef is available to provide width',
          ),
        );
        if (typeof window !== 'undefined') {
          width = window.innerWidth * 0.7; // Fallback to 70% of viewport width
        } else {
          width = 829; // Fallback to a default width (70% of 1184px)
        }
      } else {
        width = parentRef.current.getBoundingClientRect().width;
      }

      // Combine all text parts for markdown estimation
      const markdownText =
        message.parts
          ?.filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('\n') || '';

      // Use the elementMeasurer to estimate markdown height
      const estimatedHeight = elementMeasurer.measureMarkdown
        ? elementMeasurer.measureMarkdown({ text: markdownText, width })
        : 80;

      // Add extra height for tool invocations
      const toolInvocations =
        message.parts?.filter((part) => part.type === 'tool-invocation')
          .length || 0;
      const toolHeight = toolInvocations * 40;

      // Add space for Paper padding (assume 16px top + 16px bottom)
      const paperPadding = 32;

      // Add m-2 (theme.spacing(2)) margin between components (assume 16px)
      const marginBetween = 16;

      return estimatedHeight + toolHeight + paperPadding + marginBetween;
    },
    overscan: 10,
    // ⬇️ Inverted scrolling
    scrollPaddingStart: 0,
    getItemKey: (index) => messages[index].id,
  });

  const items = [...messages].reverse(); // For inverted render

  return (    
    <Box      
      ref={parentRef}
      sx={{
        height: '100%',
        width: '100%',
        border: '1px solid #ccc',
        marginTop: 2,
        backgroundColor: '#8f8f8f',
        borderRadius: 4,
        p: 2,
        display: 'flex',
        flexDirection: 'column-reverse', // ⬇️ invert flex order
      }}
    >
      {loading && (
        <Box sx={{ textAlign: 'center', width: '100%' }}>
          <Loading loading={loading} errorMessage={errorMessage} />
        </Box>
      )}
      <Box
        sx={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const {
            parts = [],
            role,
            id: messageId,
            createdAt,
          } = items[virtualRow.index];

          return (
            <ChatMessageV2
              key={messageId}
              message={{
                parts,
                role,
                id: messageId,
                createdAt,
              }}
              virtualRow={virtualRow}
              onMeasureElement={(node) => rowVirtualizer.measureElement(node)}
            />            
          );
        })}
      </Box>
    </Box>    
  );
};
