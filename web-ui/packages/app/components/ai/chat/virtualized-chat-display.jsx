'use client';
import React, { useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Paper from '@mui/material/Paper';
import { ChatTurnDisplay } from './chat-turn-display';
import { createTextMeasurer, estimateMarkdownHeight, } from '@/lib/components/ai/height-estimators';
import { searchMessageContent } from './chat-message-filters';
export const FALLBACK_CONTAINER_WIDTH = 1200;
const ACCORDION_TRANSITION_DELAY_MS = 300;
const textMeasurer = createTextMeasurer();
export const VirtualizedChatDisplay = ({ turns, height = 600, enableSelection = false, selectedItems = [], onSelectionChange, globalFilters = { typeFilters: new Set(), contentFilter: '' }, }) => {
    const parentRef = useRef(null);
    const [showTurnProperties, setShowTurnProperties] = useState(false);
    const [showMessageMetadata, setShowMessageMetadata] = useState(false);
    const elementRefsMap = useRef(new Map());
    const timeoutIdsMap = useRef(new Map());
    React.useEffect(() => {
        const thisTimeoutIdsMap = timeoutIdsMap.current;
        return () => {
            thisTimeoutIdsMap.forEach((timeoutId) => clearTimeout(timeoutId));
            thisTimeoutIdsMap.clear();
        };
    }, []);
    const estimateSize = useCallback((index) => {
        const turn = turns[index];
        if (!turn)
            return 200;
        let width = 0;
        if (parentRef.current === null) {
            if (typeof window !== 'undefined') {
                width = window.innerWidth * 0.9;
            }
            else {
                width = FALLBACK_CONTAINER_WIDTH;
            }
        }
        else {
            width = parentRef.current.getBoundingClientRect().width;
        }
        let totalHeight = 120;
        const contentWidth = Math.max(width * 0.85 - 48, 300);
        const visibleMessages = globalFilters.typeFilters.size > 0 || globalFilters.contentFilter.trim()
            ? turn.messages.filter((message) => {
                const passesTypeFilter = globalFilters.typeFilters.size === 0 ||
                    globalFilters.typeFilters.has(message.role);
                const passesContentFilter = searchMessageContent(message, globalFilters.contentFilter);
                return passesTypeFilter && passesContentFilter;
            })
            : turn.messages;
        if (visibleMessages.length === 0) {
            return Math.max(totalHeight + 60, 150);
        }
        visibleMessages.forEach((message) => {
            if (message.content && message.content.trim()) {
                const estimatedHeight = estimateMarkdownHeight(message.content, contentWidth, textMeasurer);
                totalHeight += estimatedHeight + 32;
            }
            else {
                totalHeight += 60;
            }
            if (message.optimizedContent &&
                message.optimizedContent !== message.content) {
                totalHeight += 48;
                const optimizedContentHeight = estimateMarkdownHeight(message.optimizedContent, contentWidth, textMeasurer);
                totalHeight += optimizedContentHeight + 24;
            }
            totalHeight += 16;
        });
        if (showTurnProperties) {
            totalHeight += 150;
            if (turn.warnings?.length) {
                turn.warnings.forEach((warning) => {
                    const warningHeight = estimateMarkdownHeight(warning, contentWidth * 0.9, textMeasurer);
                    totalHeight += warningHeight + 24;
                });
            }
            if (turn.errors?.length) {
                turn.errors.forEach((error) => {
                    const errorHeight = estimateMarkdownHeight(error, contentWidth * 0.9, textMeasurer);
                    totalHeight += errorHeight + 24;
                });
            }
            if (turn.metadata) {
                const metadataLines = JSON.stringify(turn.metadata, null, 2).split('\n').length;
                totalHeight += Math.min(metadataLines * 16, 200);
            }
        }
        if (showMessageMetadata) {
            visibleMessages.forEach((message) => {
                totalHeight += 80;
                if (message.functionCall) {
                    const funcCallLines = JSON.stringify(message.functionCall, null, 2).split('\n').length;
                    totalHeight += Math.min(funcCallLines * 16, 200);
                }
                if (message.metadata) {
                    const msgMetadataLines = JSON.stringify(message.metadata, null, 2).split('\n').length;
                    totalHeight += Math.min(msgMetadataLines * 16, 200);
                }
            });
        }
        totalHeight += 48;
        return Math.max(totalHeight, 150);
    }, [turns, showTurnProperties, showMessageMetadata, globalFilters]);
    const rowVirtualizer = useVirtualizer({
        count: turns.length,
        getScrollElement: () => parentRef.current,
        estimateSize,
        overscan: 3,
        measureElement: typeof window !== 'undefined' && window.ResizeObserver
            ? (element) => element?.getBoundingClientRect().height
            : undefined,
    });
    const createHeightChangeHandler = useCallback((itemIndex) => () => {
        const existingTimeout = timeoutIdsMap.current.get(itemIndex);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        const timeoutId = setTimeout(() => {
            const element = elementRefsMap.current.get(itemIndex);
            if (rowVirtualizer.measureElement && element) {
                rowVirtualizer.measureElement(element);
            }
            timeoutIdsMap.current.delete(itemIndex);
        }, ACCORDION_TRANSITION_DELAY_MS);
        timeoutIdsMap.current.set(itemIndex, timeoutId);
    }, [rowVirtualizer]);
    return (<Box>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <FormGroup row>
          <FormControlLabel control={<Switch checked={showTurnProperties} onChange={(e) => setShowTurnProperties(e.target.checked)}/>} label="Show Turn Properties (model, temp, latency, warnings, errors, token usage)"/>
          <FormControlLabel control={<Switch checked={showMessageMetadata} onChange={(e) => setShowMessageMetadata(e.target.checked)}/>} label="Show Message Metadata"/>
        </FormGroup>
      </Paper>

      
      <Box ref={parentRef} sx={{
            height: `${height}px`,
            overflow: 'auto',
            width: '100%',
        }}>
        <Box sx={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
        }}>
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const turn = turns[virtualItem.index];
            const itemIndex = virtualItem.index;
            return (<Box key={virtualItem.key} data-index={virtualItem.index} ref={(el) => {
                    if (el) {
                        elementRefsMap.current.set(itemIndex, el);
                        if (rowVirtualizer.measureElement) {
                            rowVirtualizer.measureElement(el);
                        }
                    }
                    else {
                        elementRefsMap.current.delete(itemIndex);
                        const timeoutId = timeoutIdsMap.current.get(itemIndex);
                        if (timeoutId) {
                            clearTimeout(timeoutId);
                            timeoutIdsMap.current.delete(itemIndex);
                        }
                    }
                }} sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                }}>
                <ChatTurnDisplay turn={turn} showTurnProperties={showTurnProperties} showMessageMetadata={showMessageMetadata} enableSelection={enableSelection} selectedItems={selectedItems} onSelectionChange={onSelectionChange} onHeightChange={createHeightChangeHandler(itemIndex)} globalFilters={globalFilters}/>
              </Box>);
        })}
        </Box>
      </Box>

      {turns.length === 0 && (<Paper sx={{ p: 4, textAlign: 'center' }}>
          No messages found in this chat.
        </Paper>)}
    </Box>);
};
//# sourceMappingURL=virtualized-chat-display.jsx.map