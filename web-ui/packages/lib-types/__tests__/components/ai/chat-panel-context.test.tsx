/** @jest-environment jsdom */

import React, { PropsWithChildren } from "react";
import { renderHook } from "@testing-library/react";

import {
  ChatPanelContext,
  useChatPanelContext,
} from "../../../src/components/ai/chat-panel/chat-panel-context";
import * as chatPanelIndex from "../../../src/components/ai/chat-panel";
import * as aiIndex from "../../../src/components/ai";

describe("components/ai/chat-panel-context", () => {
  const value = {
    config: {
      position: "inline" as const,
      size: {
        width: 400,
        height: 600,
      },
    },
    setPosition: jest.fn(),
    setSize: jest.fn(),
    setDockSize: jest.fn(),
    setFloating: jest.fn(),
    setCaseFileId: jest.fn(),
    isDocked: false,
    isFloating: false,
    isInline: true,
    caseFileId: null,
    debounced: {
      setSize: jest.fn(async () => undefined),
    },
    dockPanel: null,
    setDockPanel: jest.fn(),
    lastCompletionTime: null,
    setLastCompletionTime: jest.fn(),
  };

  it("throws when required and provider is missing", () => {
    expect(() => renderHook(() => useChatPanelContext())).toThrow(
      "useChatPanelContext must be used within a ChatPanelProvider",
    );
  });

  it("returns undefined when provider is missing and required=false", () => {
    const { result } = renderHook(() =>
      useChatPanelContext({ required: false }),
    );

    expect(result.current).toBeNull();
  });

  it("returns context value when provider is present", () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <ChatPanelContext.Provider value={value as never}>
        {children}
      </ChatPanelContext.Provider>
    );

    const { result } = renderHook(() => useChatPanelContext(), { wrapper });

    expect(result.current).toBe(value);
    expect(result.current.config.position).toBe("inline");
  });

  it("re-exports context and hook from ai index modules", () => {
    expect(chatPanelIndex.ChatPanelContext).toBe(ChatPanelContext);
    expect(aiIndex.ChatPanelContext).toBe(ChatPanelContext);
    expect(typeof chatPanelIndex.useChatPanelContext).toBe("function");
    expect(typeof aiIndex.useChatPanelContext).toBe("function");
  });
});
