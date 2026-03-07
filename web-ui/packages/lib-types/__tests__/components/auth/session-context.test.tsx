/** @jest-environment jsdom */

import React, { PropsWithChildren } from "react";
import { renderHook } from "@testing-library/react";

import {
  SessionContext,
  useSession,
} from "../../../src/components/auth/session-context";
import { ValidKeyValidationStatusValues } from "../../../src/components/auth/key-validation-status";
import * as authIndex from "../../../src/components/auth";
import * as rootComponentsIndex from "../../../src/components";

describe("components/auth/session-context", () => {
  it("throws when useSession is called without provider", () => {
    expect(() => renderHook(() => useSession())).toThrow(
      "useSession must be used within a SessionProvider",
    );
  });

  it("returns session context value when provider is present", () => {
    const value = {
      status: "authenticated" as const,
      data: { user: { name: "Sam" } },
      isFetching: false,
      refetch: jest.fn(),
      keyValidation: {
        status: "valid" as const,
      },
    };

    const wrapper = ({ children }: PropsWithChildren) => (
      <SessionContext.Provider value={value as never}>
        {children}
      </SessionContext.Provider>
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current).toBe(value);
    expect(result.current.keyValidation.status).toBe("valid");
  });

  it("exports expected key validation statuses", () => {
    expect(ValidKeyValidationStatusValues).toEqual([
      "unknown",
      "validating",
      "valid",
      "invalid",
      "synchronizing",
      "synchronized",
      "failed",
    ]);
  });

  it("re-exports auth symbols from auth and root components index modules", () => {
    expect(authIndex.ValidKeyValidationStatusValues).toBe(
      ValidKeyValidationStatusValues,
    );
    expect(rootComponentsIndex.ValidKeyValidationStatusValues).toBe(
      ValidKeyValidationStatusValues,
    );
    expect(authIndex.SessionContext).toBe(SessionContext);
    expect(rootComponentsIndex.SessionContext).toBe(SessionContext);
    expect(typeof authIndex.useSession).toBe("function");
    expect(typeof rootComponentsIndex.useSession).toBe("function");
  });
});
