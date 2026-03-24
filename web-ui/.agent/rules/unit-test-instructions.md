---
trigger: always_on
---

# When creating or working with unit tests, these guidelines will help you be successful

- Before creating or modifying unit tests, you must first ensure an in-depth understanding of the test environment by analyzing the package's `jest.config.mjs` and its related `setupFilesAfterEnv` entries.
- NEVER use `jest.clearAllMocks` or `jest.resetAllMocks` within a unit test file. Mocks are automatically cleared every test run via `clearMocks: true` in the shared jest config. Use targeted `mockFn.mockClear()` / `mockFn.mockReset()` only for mocks owned by that suite.
- Unit tests should be created underneath the `__tests__` folder mirroring project location; for example, unit tests for source file `folderA/folder-2/file1.ts` should live in `__tests__/folderA/folder-2/file1.test.ts`.
- Test runs are fast and cheap; when validating changes, always ensure at least one run of the **full test suite** has been executed and verified.
