# Agent Instructions for Title IX Victim Advocacy Platform

This document provides comprehensive guidelines for LLM-based development assistance on the Title IX Victim Advocacy Platform. These instructions optimize AI assistance for the specific architecture, patterns, and requirements of this victim empowerment and evidence analysis system.

## Project Overview

The Title IX Victim Advocacy Platform is a sophisticated advocacy technology solution that combines AI-powered evidence analysis with modern web interfaces to help victims, families, and advocates fight back against educational institutions that mishandle Title IX cases.

### Core Technologies

- Next.js 15

### Tool Use

- Use MCP tools to their fullest capacity
- Before using a tool, always explain to the user why you are using it.
- If you are using a tool that requires a file path, always use the absolute path.
- Tools provided by the "memory-for-llms" provide useful cross-conversation context, so use them liberally.
- Before executing any multi-step action, always use the `sequentialthinking` tool to break it down into steps.
  - This is especially useful when combined with your task or todo list.

### Frontend (TypeScript/React)

- See [typescript-react-instructions.md](typescript-react.instructions.md) for React-specific guidelines.
- See [./mcp.md](./mcp.md) for MCP tool usage guidelines.
- See [./mem0.md](./mem0.md) for Mem0 implementation guidelines
- See [./vercel-ai.md](./vercel-ai.md) for Vercel AI integration guidelines.
