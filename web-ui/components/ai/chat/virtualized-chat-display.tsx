'use client';

/**
 * Module: Virtualized Chat Display
 * -------------------------------------------------------------
 * High‑performance, scroll‑virtualized rendering of chat turns/messages.
 *
 * Why virtualization?
 *  - Large chats (hundreds of turns, thousands of messages) can cause DOM bloat,
 *    expensive layout / paint cycles, and sluggish interaction if fully rendered.
 *  - Virtualization keeps only the visible (plus a small overscan buffer) portion
 *    of the chat in the DOM while still preserving accurate scrollbar size and
 *    scroll position semantics.
 *
 * Height Strategy:
 *  - We provide an initial optimistic size estimate per chat turn via the
 *    `estimateSize` callback. This attempts to approximate the total rendered
 *    height of the turn (header, messages, metadata panels, warnings/errors, etc.)
 *    using a markdown + text measurement utility.
 *  - When `ResizeObserver` is available, the virtualization library can refine
 *    the measurement with the actual DOM height (via `measureElement`). This
 *    produces smooth, low-jitter scrolling even for highly variable content.
 *
 * Key Trade‑offs / Assumptions:
 *  - Estimation favors slight overestimation to avoid visual jump when the real
 *    measurement arrives. (Underestimation creates more noticeable layout shifts.)
 *  - We intentionally removed arbitrary maximum height caps so very long AI
 *    responses remain fully accessible.
 *  - Width is derived dynamically from the scroll container (falling back to a
 *    viewport or constant fallback during first render / SSR boundary cases).
 *
 * Accessibility & UX:
 *  - Message and metadata toggles allow users to progressively disclose
 *    diagnostic / system information without penalizing initial load cost.
 *  - Empty state messaging clarifies when a chat has no turns/messages.
 *
 * Performance Notes:
 *  - `overscan` is tuned (currently 3) to balance scroll fluidity and memory
 *    usage. Increase for faster wheels / touchpad momentum; decrease for tight
 *    memory environments.
 *  - Height estimation leverages a shared `textMeasurer` to avoid creating
 *    repeated canvas contexts / DOM nodes.
 *
 * Extension Points:
 *  - Additional per‑message adornments (e.g., token usage bars) should factor
 *    their vertical contribution into `estimateSize` for accuracy.
 *  - Alternate rendering modes (collapsing tool / system messages) can be added
 *    behind new toggles – ensure both estimation and actual DOM reflect changes.
 *
 * Error Handling:
 *  - This component assumes `turns` integrity (e.g., arrays present). Defensive
 *    fallbacks (default heights) ensure resilience if partial data arrives.
 */

import React, { useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, Switch, FormControlLabel, FormGroup, Paper } from '@mui/material';
import { ChatTurnDisplay } from './chat-turn-display';
import {
  createTextMeasurer,
  estimateMarkdownHeight,
} from '@/lib/components/ai/height-estimators';
import { ChatTurn } from '@/lib/ai/chat/types';
import type { SelectedChatItem } from '@/lib/ai/chat/export';
import { type MessageType, searchMessageContent } from './chat-message-filters';

/**
 * Fallback container width for virtualized chat display
 */
export const FALLBACK_CONTAINER_WIDTH = 1200;

/**
 * Delay in milliseconds to wait after accordion state change before remeasuring.
 * This matches Material-UI's default transition duration to ensure the accordion
 * animation completes before height measurement.
 */
const ACCORDION_TRANSITION_DELAY_MS = 300;

/**
 * Text measurement utility for estimating heights of chat messages
 */
const textMeasurer = createTextMeasurer();

/**
 * Props for `VirtualizedChatDisplay`.
 */
interface VirtualizedChatDisplayProps {
  /** Ordered collection of turns to render */
  turns: ChatTurn[];
  /** Explicit pixel height of the scroll container (defaults to 600) */
  height?: number;
  /** Enable selection mode for export functionality */
  enableSelection?: boolean;
  /** Currently selected chat items */
  selectedItems?: SelectedChatItem[];
  /** Callback when selection changes */
  onSelectionChange?: (selectedItems: SelectedChatItem[]) => void;
  /** Global message filters to apply to all turns */
  globalFilters?: {
    typeFilters: Set<MessageType>;
    contentFilter: string;
  };
}

/**
 * Virtualized chat transcript component rendering only the visible subset of
 * turns for scalability. Supports optional disclosure of diagnostic metadata
 * (turn properties, message metadata) without compromising baseline performance.
 *
 * Rendering Flow:
 *  1. Derive an estimated height for each turn synchronously (fast path).
 *  2. Virtualizer positions absolute containers within a tall spacer box.
 *  3. Each visible item mounts `ChatTurnDisplay`, after which (when supported)
 *     a `ResizeObserver` refines the actual measured height.
 *
 * Interaction Toggles:
 *  - Show Turn Properties: reveals model parameters + warnings/errors + metadata.
 *  - Show Message Metadata: reveals per‑message diagnostic JSON blocks.
 *
 * Performance Considerations:
 *  - Avoid injecting heavy synchronous parsing or large JSON serialization into
 *    the `estimateSize` callback; keep it deterministic and CPU‑light.
 *  - For additional data (e.g., token usage charts) remember to adjust both the
 *    estimator and the actual DOM height contributions.
 */
export const VirtualizedChatDisplay: React.FC<VirtualizedChatDisplayProps> = ({
  turns,
  height = 600,
  enableSelection = false,
  selectedItems = [],
  onSelectionChange,
  globalFilters = { typeFilters: new Set(), contentFilter: '' },
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [showTurnProperties, setShowTurnProperties] = useState(false);
  const [showMessageMetadata, setShowMessageMetadata] = useState(false);

  // Store element references for efficient remeasurement
  const elementRefsMap = useRef<Map<number, Element>>(new Map());

  // Store timeout IDs to enable cleanup
  const timeoutIdsMap = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // Clean up all pending timeouts on unmount
  React.useEffect(() => {
    const thisTimeoutIdsMap = timeoutIdsMap.current;
    return () => {
      thisTimeoutIdsMap.forEach((timeoutId) => clearTimeout(timeoutId));
      thisTimeoutIdsMap.clear();
    };
  }, []);

  // Estimate size for each turn based on content using improved measurement
  /**
   * Estimate (optimistically) the vertical pixel footprint of a turn.
   *
   * Goals:
   *  - Be fast (no DOM writes, minimal JSON work) to keep scroll perf smooth.
   *  - Slightly overestimate to reduce post‑measurement visual shifts.
   *  - Account for filtering that may hide messages within the turn.
   *
   * Fallback Paths:
   *  - If a turn or container width is unavailable (initial prerender), uses
   *    conservative defaults and a global fallback width.
   *
   * @param index Index of the virtualized row (turn)
   * @returns Estimated height in pixels (never less than the minimum of 150)
   */
  const estimateSize = useCallback(
    (index: number) => {
      const turn = turns[index];
      if (!turn) return 200; // default fallback

      let width = 0;
      // Get container width for accurate measurement
      if (parentRef.current === null) {
        // Handle case where parentRef is not yet available
        if (typeof window !== 'undefined') {
          width = window.innerWidth * 0.9; // Fallback to 90% of viewport width
        } else {
          width = FALLBACK_CONTAINER_WIDTH; // Fallback to a default width
        }
      } else {
        width = parentRef.current.getBoundingClientRect().width;
      }

      // Base size for turn header and card structure
      let totalHeight = 120; // Increased base turn header height to account for chips and spacing

      // Calculate content width accounting for Card padding and margins
      const contentWidth = Math.max(width * 0.85 - 48, 300); // 85% width minus Card padding, min 300px

      // Filter messages based on global filters if active
      const visibleMessages =
        globalFilters.typeFilters.size > 0 || globalFilters.contentFilter.trim()
          ? turn.messages.filter((message) => {
              // Type filter
              const passesTypeFilter =
                globalFilters.typeFilters.size === 0 ||
                globalFilters.typeFilters.has(message.role as MessageType);
              // Content filter
              const passesContentFilter = searchMessageContent(
                message,
                globalFilters.contentFilter,
              );

              return passesTypeFilter && passesContentFilter;
            })
          : turn.messages;

      // If no messages are visible after filtering, return a minimal height
      if (visibleMessages.length === 0) {
        return Math.max(totalHeight + 60, 150); // Just turn header + empty message indicator
      }

      // Measure each visible message content using sophisticated height estimation
      visibleMessages.forEach((message) => {
        if (message.content && message.content.trim()) {
          // Use sophisticated markdown height estimation
          const estimatedHeight = estimateMarkdownHeight(
            message.content,
            contentWidth,
            textMeasurer,
          );

          // Add message container padding and margins
          totalHeight += estimatedHeight + 32; // content height + message container padding
        } else {
          // Base message height for messages without content (tool calls, etc)
          totalHeight += 60; // Increased from 40 to account for message container
        }

        // Add height for optimized content accordion if present and different from main content
        if (
          message.optimizedContent &&
          message.optimizedContent !== message.content
        ) {
          // Add height for accordion header (collapsed state)
          totalHeight += 48; // Accordion header height with padding

          // Add potential expanded content height - we need to be generous here
          // because the accordion can be expanded by the user
          const optimizedContentHeight = estimateMarkdownHeight(
            message.optimizedContent,
            contentWidth,
            textMeasurer,
          );

          // Add space for the optimized content when expanded
          // We estimate for expanded state to avoid content being cut off
          totalHeight += optimizedContentHeight + 24; // content + accordion details padding
        }

        // Add spacing between messages
        totalHeight += 16;
      });

      // Add size if properties are shown
      if (showTurnProperties) {
        totalHeight += 150; // Increased space for model, temperature, latency etc

        // Add space for warnings and errors using proper estimation
        if (turn.warnings?.length) {
          turn.warnings.forEach((warning) => {
            const warningHeight = estimateMarkdownHeight(
              warning,
              contentWidth * 0.9, // Slightly narrower for alerts
              textMeasurer,
            );
            totalHeight += warningHeight + 24; // Alert padding
          });
        }

        if (turn.errors?.length) {
          turn.errors.forEach((error) => {
            const errorHeight = estimateMarkdownHeight(
              error,
              contentWidth * 0.9, // Slightly narrower for alerts
              textMeasurer,
            );
            totalHeight += errorHeight + 24; // Alert padding
          });
        }

        // Add space for metadata if present
        if (turn.metadata) {
          const metadataLines = JSON.stringify(turn.metadata, null, 2).split(
            '\n',
          ).length;
          totalHeight += Math.min(metadataLines * 16, 200); // Cap metadata display at 200px
        }
      }

      // Add space for message metadata display if enabled (only for visible messages)
      if (showMessageMetadata) {
        visibleMessages.forEach((message) => {
          totalHeight += 80; // Base metadata panel height

          // Add space for function call and metadata JSON
          if (message.functionCall) {
            const funcCallLines = JSON.stringify(
              message.functionCall,
              null,
              2,
            ).split('\n').length;
            totalHeight += Math.min(funcCallLines * 16, 200); // Cap at 200px
          }

          if (message.metadata) {
            const msgMetadataLines = JSON.stringify(
              message.metadata,
              null,
              2,
            ).split('\n').length;
            totalHeight += Math.min(msgMetadataLines * 16, 200); // Cap at 200px
          }
        });
      }

      // Add padding for Paper component and margins
      totalHeight += 48; // Card padding and margins

      // Remove artificial cap - let content be as tall as it needs to be
      // Only set a reasonable minimum height
      return Math.max(totalHeight, 150);
    },
    [turns, showTurnProperties, showMessageMetadata, globalFilters],
  );

  /**
   * Virtualization controller from TanStack Virtual handling item measurement,
   * scroll range projection, and overscan buffering.
   */
  const rowVirtualizer = useVirtualizer({
    count: turns.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 3, // Render more items outside visible area for smoother scrolling
    measureElement:
      typeof window !== 'undefined' && window.ResizeObserver
        ? (element) => element?.getBoundingClientRect().height
        : undefined, // Enable dynamic measurement when ResizeObserver is available
  });

  /**
   * Create a memoized height change handler for a specific turn index.
   * This prevents unnecessary re-renders by creating stable callback references.
   */
  const createHeightChangeHandler = useCallback(
    (itemIndex: number) => () => {
      // Clear any existing timeout for this item
      const existingTimeout = timeoutIdsMap.current.get(itemIndex);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Schedule new measurement after transition completes
      const timeoutId = setTimeout(() => {
        const element = elementRefsMap.current.get(itemIndex);
        if (rowVirtualizer.measureElement && element) {
          rowVirtualizer.measureElement(element);
        }
        // Clean up timeout reference
        timeoutIdsMap.current.delete(itemIndex);
      }, ACCORDION_TRANSITION_DELAY_MS);

      // Store timeout ID for cleanup
      timeoutIdsMap.current.set(itemIndex, timeoutId);
    },
    [rowVirtualizer],
  );

  return (
    <Box>
      {/* Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <FormGroup row>
          <FormControlLabel
            control={
              <Switch
                checked={showTurnProperties}
                onChange={(e) => setShowTurnProperties(e.target.checked)}
              />
            }
            label="Show Turn Properties (model, temp, latency, warnings, errors, token usage)"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showMessageMetadata}
                onChange={(e) => setShowMessageMetadata(e.target.checked)}
              />
            }
            label="Show Message Metadata"
          />
        </FormGroup>
      </Paper>

      {/* Virtualized Chat Display */}
      <Box
        ref={parentRef}
        sx={{
          height: `${height}px`,
          overflow: 'auto',
          width: '100%',
        }}
      >
        <Box
          sx={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const turn = turns[virtualItem.index];
            const itemIndex = virtualItem.index;

            return (
              <Box
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={(el: Element | null) => {
                  // Store element reference in map for efficient remeasurement
                  if (el) {
                    elementRefsMap.current.set(itemIndex, el);
                    // Also pass to virtualizer for ResizeObserver setup
                    if (rowVirtualizer.measureElement) {
                      rowVirtualizer.measureElement(el);
                    }
                  } else {
                    // Clean up when element is unmounted
                    elementRefsMap.current.delete(itemIndex);
                    // Clear any pending timeout for this item
                    const timeoutId = timeoutIdsMap.current.get(itemIndex);
                    if (timeoutId) {
                      clearTimeout(timeoutId);
                      timeoutIdsMap.current.delete(itemIndex);
                    }
                  }
                }}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ChatTurnDisplay
                  turn={turn}
                  showTurnProperties={showTurnProperties}
                  showMessageMetadata={showMessageMetadata}
                  enableSelection={enableSelection}
                  selectedItems={selectedItems}
                  onSelectionChange={onSelectionChange}
                  onHeightChange={createHeightChangeHandler(itemIndex)}
                  globalFilters={globalFilters}
                />
              </Box>
            );
          })}
        </Box>
      </Box>

      {turns.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          No messages found in this chat.
        </Paper>
      )}
    </Box>
  );
};
