# Project: LLM Result Batching Framework for Tool-Driven Continuation

## Overview

This project provides a reusable batching system for large LLM output lists, where results are retrieved in chunks (e.g. 10 at a time). It is designed for use in multi-phase legal analysis or compliance workflows using function calling or tool-augmented LLMs.

The system ensures:
- All matching items are returned, even if the list exceeds the LLM's preferred limit (e.g., 10).
- The LLM can request additional results via the `continueMatchRetrieval` tool.
- Each call is scoped to a `queryId`, which helps manage offset tracking for each query session.

---

## Key Classes

### `LLMBatchingManager`
Handles internal storage and retrieval of results per query. It:
- Stores all match results keyed by a `queryId`
- Tracks current offset
- Returns batches of N items at a time (currently 10)
- Allows reset of stored results

➡️ Use Copilot to:
- Add support for batch size override per query
- Add cache eviction logic (e.g. LRU)
- Add ability to stream results instead of batch

---

### `MatchContinuationTool`
An interface defining the tool used by the LLM to fetch more results.

➡️ Use Copilot to:
- Create mock implementations for testing
- Extend the tool to support user-specific filtering

---

### `LLMContinuationRunner`
Automates fetching all results from the LLM tool, calling the `continueMatchRetrieval` tool until the list is complete.

➡️ Use Copilot to:
- Chain continuation output into LLM response format
- Add support for incremental LLM summarization between batches

---

## Prompting Strategy

The prompt instructs the LLM to:
- Return ALL matches
- Call the `continueMatchRetrieval` tool as needed
- Never summarize or finalize until all batches have been returned

---

## Next Goals

Copilot, help me with:
- A wrapper that renders batches into human-readable markdown or JSON
- Logic to rerun the LLM after each batch is appended
- A decorator around `LLMContinuationRunner` that logs or audits each phase of continuation
