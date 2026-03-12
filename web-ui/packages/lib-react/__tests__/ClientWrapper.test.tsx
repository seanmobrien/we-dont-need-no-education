import React from "react";
import { render, screen } from "@testing-library/react";
import { ClientWrapper } from "../src/ClientWrapper";

describe("ClientWrapper", () => {
  it("renders children unchanged", () => {
    render(
      <ClientWrapper>
        <div data-testid="child">child-content</div>
      </ClientWrapper>,
    );

    expect(screen.getByTestId("child").textContent).toBe("child-content");
  });
});
