---
applyTo: '**/*.ts,**/*.tsx'
---

# Project coding standards for TypeScript and React

- Always write testable code. Dependencies should be referenced via injection (clasess) or arguments (functions), never global statics.
- When generating documentation, keep it as close to the described item as possible, eg opt for documentation on fields and functions over
  classes

## TypeScript Guidelines

- Use TypeScript for any new code that is not defining an encapsulatd React component
- Follow functional programming principles where possible
- Use type (eg export type MyType = { myField: string; }) for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators

## React Guidelines

- Use functional components with hooks
- Follow the React hooks rules (no conditional hooks)
- Avoid using `React.FC` or `React.FunctionComponent` for component type annotations. Instead, prefer `JSX.Element` over `React.ReactNode`.
- Use explicitly defined component properties. Non-functional types should always be defined within a `types.ts` file in the same folder that uses them when possible.
- All exports intended to be globally accessible (eg used outside of the curent folder) should be exported via an idex.ts file.
- Keep components small and focused
- Use Material UI component library to provide a consistent UX

## Test guidlelines

- All newly created code should have unit test cases written that demonstrate the function is behaving as intended.
- Unit test files live underneath the **tests** subfolder and include a .test.js, .test.ts, or .test.tex suffix. For example, the file containing unit tests for folder1/folder2/some-file.ts would be **tests**/folder1/folder2/some-file.test.ts
