import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { ThemeSelector } from "../../src/themes/theme-selector";

const mockSetTheme = jest.fn();
const mockUseTheme = jest.fn();

jest.mock("../../src/themes", () => ({
  useTheme: () => mockUseTheme(),
  themeDisplayNames: {
    dark: "Dark",
    light: "Light",
  },
}));

describe("ThemeSelector", () => {
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    mockSetTheme.mockReset();
    mockUseTheme.mockReset();
    document.cookie = "theme=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {
      // expected by MUI Popover in jsdom layout-less runtime
    });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("opens menu and selects a different theme", async () => {
    mockUseTheme.mockReturnValue({
      currentTheme: "dark",
      setTheme: mockSetTheme,
    });

    render(<ThemeSelector />);

    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    const lightOptions = document.querySelectorAll(
      '[data-id="menu-id-theme-selector-light"]',
    );
    expect(lightOptions.length).toBeGreaterThan(0);
    fireEvent.click(lightOptions[0]);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
    expect(document.cookie).toContain("theme=light");
  });

  it("does not set theme when selecting the current theme", async () => {
    mockUseTheme.mockReturnValue({
      currentTheme: "light",
      setTheme: mockSetTheme,
    });

    render(<ThemeSelector />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    const lightOptions = document.querySelectorAll(
      '[data-id="menu-id-theme-selector-light"]',
    );
    fireEvent.click(lightOptions[0]);

    expect(mockSetTheme).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");
  });
});
