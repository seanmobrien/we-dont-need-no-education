import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeSelector } from "../../src/themes/theme-selector";
import { ThemeProvider } from "../../src/themes";

describe("ThemeSelector", () => {
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    document.cookie = "theme=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {
      // expected by MUI Popover in jsdom layout-less runtime
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("opens menu and selects a different theme", async () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeSelector />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    const lightOptions = document.querySelectorAll(
      '[data-id="menu-id-theme-selector-light"]',
    );
    expect(lightOptions.length).toBeGreaterThan(0);
    fireEvent.click(lightOptions[0]);

    expect(document.cookie).toContain("theme=light");
  });

  it("does not set theme when selecting the current theme", async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeSelector />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    const lightOptions = document.querySelectorAll(
      '[data-id="menu-id-theme-selector-light"]',
    );
    fireEvent.click(lightOptions[0]);

    expect(document.cookie).toBe("");
  });
});
