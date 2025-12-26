---
trigger: always_on
---

When creating or working with unit tests, these guidelines will help you be successful.

- Before creating or modifying unit tests, you must first ensure an in-depth understanding of the test environment by analyzing @/jest.config.mjs and it's related setupFiles/setupFilesAfterEnv entries.
- NEVER use jest.clearAllMocks within a unit test file. Mocks are automatically reset every test run within @/**tests**/jest.setup.ts.
- Unit tests should be created underneath the `__tests__` folder and then mirroring project location; for example, unit tests for source file `folderA/folder-2/file1.ts` should live in `__tests__/folderA/folder-2/file1.test.ts`.
- Test runs are fast and cheap; when validating changes, always ensure at least one run of the **full test suite** has been executed and verified.
