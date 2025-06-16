# Mem0: Complete Developer Guide for LLMs

## Table of Contents

1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [Installation & Setup](#installation--setup)
4. [Basic Usage](#basic-usage)
5. [Core Components](#core-components)
6. [Memory Operations](#memory-operations)
7. [Configuration](#configuration)
8. [Integrations](#integrations)
9. [Examples](#examples)
10. [Testing](#testing)
11. [OpenMemory API](#openmemory-api)
12. [Development Guidelines](#development-guidelines)
13. [Troubleshooting](#troubleshooting)

## Overview

Mem0 (pronounced "mem-zero") is an intelligent memory layer for AI assistants and agents that enables personalized AI interactions. It provides a persistent memory system that:

- **Remembers user preferences**: Adapts to individual needs and learns over time
- **Multi-level memory**: Supports User, Session, and Agent state management
- **Performance optimized**: +26% accuracy over OpenAI Memory, 91% faster responses, 90% lower token usage
- **Developer-friendly**: Intuitive API with cross-platform SDKs

### Key Research Highlights

- **+26% Accuracy** over OpenAI Memory on the LOCOMO benchmark
- **91% Faster Responses** than full-context, ensuring low-latency at scale
- **90% Lower Token Usage** than full-context, cutting costs without compromise

### Primary Use Cases

- **AI Assistants**: Consistent, context-rich conversations
- **Customer Support**: Recall past tickets and user history for tailored help
- **Healthcare**: Track patient preferences and history for personalized care
- **Productivity & Gaming**: Adaptive workflows and environments based on user behavior
- **Personal AI Tutors**: Build educational assistants that track student progress and adapt to learning patterns
- **Enterprise Knowledge Management**: Power systems that learn from organizational interactions
- **Personalized AI Assistants**: Create assistants that learn user preferences and adapt responses over time

## Core Architecture

Mem0's memory layer combines LLMs with vector-based storage in a dual architecture:

### Memory Processing Pipeline

1. **Information Extraction**: LLMs automatically extract and store important information from conversations
2. **Memory Management**: Continuously updates and resolves contradictions in stored information
3. **Dual Storage**:
   - **Vector Database**: For memory storage and semantic search
   - **Graph Database**: For relationship tracking and entity connections
4. **Smart Retrieval**: Employs semantic search and graph queries based on importance and recency

### Core Operations

- **Add Endpoint**: Processes conversations through information extraction, conflict resolution, and memory storage
- **Search Endpoint**: Retrieves relevant memories using query processing, vector search, and result ranking

## Installation & Setup

Mem0 offers two deployment options: hosted platform and self-hosted open source.

### Hosted Platform (Recommended)

Get up and running in minutes with automatic updates, analytics, and enterprise security.

1. Sign up on [Mem0 Platform](https://app.mem0.ai)
2. Get your API key from the dashboard
3. Install the SDK:

```bash
# Python
pip install mem0ai

# TypeScript/JavaScript
npm install mem0ai

# For Vercel AI SDK integration
npm install @mem0/vercel-ai-provider
```

4. Set up your client:

```python
import os
from mem0 import MemoryClient

os.environ["MEM0_API_KEY"] = "your-api-key"
client = MemoryClient()
```

```typescript
import MemoryClient from 'mem0ai';

const client = new MemoryClient({
  apiKey: 'your-api-key',
  // Optional: specify organization and project
  organizationName: 'your-org',
  projectName: 'your-project',
});
```

```javascript
const MemoryClient = require('mem0ai').default;

const client = new MemoryClient({
  apiKey: 'your-api-key',
});
```

### Self-Hosted (Open Source)

```bash
# Install via pip
pip install mem0ai

# Install via npm for TypeScript/JavaScript
npm install mem0ai
```

**Requirements**: Mem0 requires an LLM to function, with `gpt-4o-mini` from OpenAI as the default. Supports various LLMs - see [Supported LLMs documentation](#supported-llms).

### Basic Instantiation

**Python:**

```python
from openai import OpenAI
from mem0 import Memory

# For self-hosted
memory = Memory()

# With custom configuration
config = {
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4o-mini",
            "temperature": 0.2,
            "max_tokens": 1500,
        }
    }
}
memory = Memory.from_config(config)
```

**TypeScript:**

```typescript
import { Memory } from 'mem0ai/oss';
import dotenv from 'dotenv';

dotenv.config();

// Basic usage with default configuration
const memory = new Memory();

// With custom configuration
const memory = new Memory({
  version: 'v1.1',
  llm: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxTokens: 1500,
    },
  },
  embedder: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
    },
  },
  vectorStore: {
    provider: 'memory', // In-memory store
    config: {
      collectionName: 'memories',
      dimension: 1536,
    },
  },
});
```

## Basic Usage

### Core Chat Pattern with Memory

**Python:**

```python
from openai import OpenAI
from mem0 import Memory

openai_client = OpenAI()
memory = Memory()

def chat_with_memories(message: str, user_id: str = "default_user") -> str:
    # Retrieve relevant memories
    relevant_memories = memory.search(query=message, user_id=user_id, limit=3)
    memories_str = "\n".join(f"- {entry['memory']}" for entry in relevant_memories["results"])

    # Generate Assistant response
    system_prompt = f"You are a helpful AI. Answer the question based on query and memories.\nUser Memories:\n{memories_str}"
    messages = [{"role": "system", "content": system_prompt}, {"role": "user", "content": message}]
    response = openai_client.chat.completions.create(model="gpt-4o-mini", messages=messages)
    assistant_response = response.choices[0].message.content

    # Create new memories from the conversation
    messages.append({"role": "assistant", "content": assistant_response})
    memory.add(messages, user_id=user_id)

    return assistant_response

# Usage
def main():
    print("Chat with AI (type 'exit' to quit)")
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == 'exit':
            print("Goodbye!")
            break
        print(f"AI: {chat_with_memories(user_input)}")
```

**TypeScript:**

```typescript
import { Memory } from 'mem0ai/oss';
import OpenAI from 'openai';

const openai = new OpenAI();
const memory = new Memory();

async function chatWithMemories(
  message: string,
  userId: string = 'default_user',
): Promise<string> {
  // Retrieve relevant memories
  const relevantMemories = await memory.search({
    query: message,
    userId,
    limit: 3,
  });
  const memoriesStr = relevantMemories.results
    .map((entry) => `- ${entry.memory}`)
    .join('\n');

  // Generate Assistant response
  const systemPrompt = `You are a helpful AI. Answer the question based on query and memories.\nUser Memories:\n${memoriesStr}`;
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: message },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
  });

  const assistantResponse = response.choices[0].message.content!;

  // Create new memories from the conversation
  const conversationMessages = [
    ...messages,
    { role: 'assistant' as const, content: assistantResponse },
  ];
  await memory.add(conversationMessages, userId);

  return assistantResponse;
}

// Usage
async function main() {
  console.log("Chat with AI (type 'exit' to quit)");
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    readline.question('You: ', async (userInput: string) => {
      if (userInput.toLowerCase() === 'exit') {
        console.log('Goodbye!');
        readline.close();
        return;
      }
      const response = await chatWithMemories(userInput);
      console.log(`AI: ${response}`);
      askQuestion();
    });
  };

  askQuestion();
}
```

### Platform Client Usage

**Python:**

```python
from mem0 import MemoryClient

client = MemoryClient()

# Add memories
messages = [
    {"role": "user", "content": "Thinking of making a sandwich. What do you recommend?"},
    {"role": "assistant", "content": "How about adding some cheese for extra flavor?"},
    {"role": "user", "content": "Actually, I don't like cheese."},
    {"role": "assistant", "content": "I'll remember that you don't like cheese for future recommendations."}
]
client.add(messages, user_id="alex")

# Search memories
memories = client.search("food preferences", user_id="alex")
print(memories)
```

**TypeScript:**

```typescript
import MemoryClient from 'mem0ai';

const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });

// Add memories
const messages = [
  {
    role: 'user',
    content: 'Thinking of making a sandwich. What do you recommend?',
  },
  {
    role: 'assistant',
    content: 'How about adding some cheese for extra flavor?',
  },
  { role: 'user', content: "Actually, I don't like cheese." },
  {
    role: 'assistant',
    content:
      "I'll remember that you don't like cheese for future recommendations.",
  },
];

await client.add(messages, { user_id: 'alex' });

// Search memories
const memories = await client.search('food preferences', { user_id: 'alex' });
console.log(memories);
```

### Multi-Modal Support

**Python:**

```python
# Add image or PDF as memory
pdf_message = {"role": "user", "content": {"type": "pdf_url", "pdf_url": {"url": "https://example.com/document.pdf"}}}
client.add([pdf_message], user_id="user123")

image_message = {"role": "user", "content": {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}}
client.add([image_message], user_id="user123")
```

**TypeScript:**

```typescript
// Add image or PDF as memory
const pdfMessage = {
  role: 'user' as const,
  content: {
    type: 'pdf_url',
    pdf_url: { url: 'https://example.com/document.pdf' },
  },
};
await client.add([pdfMessage], { user_id: 'user123' });

const imageMessage = {
  role: 'user' as const,
  content: {
    type: 'image_url',
    image_url: { url: 'https://example.com/image.jpg' },
  },
};
await client.add([imageMessage], { user_id: 'user123' });
```

## Core Components

### Memory Types

Mem0 implements sophisticated memory systems:

#### Short-Term Memory

- **Conversation History**: Recent messages and their order
- **Working Memory**: Temporary variables and state
- **Attention Context**: Current focus of the conversation

#### Long-Term Memory

- **Factual Memory**: Stored knowledge about users, preferences, and domain-specific information
- **Episodic Memory**: Past interactions and experiences
- **Semantic Memory**: Understanding of concepts and their relationships

| Type       | Persistence | Access Speed | Use Case                     |
| ---------- | ----------- | ------------ | ---------------------------- |
| Short-Term | Temporary   | Instant      | Active conversations         |
| Long-Term  | Persistent  | Fast         | User preferences and history |

### Memory Architecture Components

#### 1. Memory Base Class

Core abstract interface defining memory operations:

```python
class MemoryBase(ABC):
    def get(self, memory_id):        # Retrieve memory by ID
    def get_all(self):               # List all memories
    def update(self, memory_id, data): # Update memory by ID
    def delete(self, memory_id):     # Delete memory by ID
    def history(self, memory_id):    # Get memory change history
```

#### 2. Vector Store Integration

Supported vector databases:

- **Pinecone**: Cloud-native vector database
- **Qdrant**: Open-source vector search engine
- **Chroma**: AI-native open-source embedding database
- **Weaviate**: Vector database with advanced features
- **Faiss**: Facebook AI Similarity Search
- **Milvus**: Open-source vector database
- **PostgreSQL (pgvector)**: Vector extension for PostgreSQL
- **Redis**: In-memory data structure store with vector search
- **Supabase**: Open source Firebase alternative

#### 3. LLM Providers

Supported language models:

- **OpenAI**: GPT-4, GPT-3.5-turbo, etc.
- **Anthropic**: Claude models
- **Google**: Gemini Pro, Gemini models
- **Azure OpenAI**: Enterprise OpenAI models
- **AWS Bedrock**: Amazon's managed LLM service
- **Groq**: High-performance LLM inference
- **Together**: Open-source model hosting
- **xAI**: Grok models
- **Deepseek**: Advanced reasoning models
- **LM Studio**: Local model hosting
- **Ollama**: Local LLM runner

#### 4. Embedding Models

Supported embedding providers:

- **OpenAI**: text-embedding-ada-002, text-embedding-3-small/large
- **HuggingFace**: all-MiniLM-L6-v2, sentence-transformers
- **Azure OpenAI**: Enterprise embedding models
- **Vertex AI**: Google's managed embeddings
- **Gemini**: Google's multimodal embeddings
- **LangChain**: Integration with LangChain embeddings

## Memory Operations

### Core API Methods

#### Adding Memories

**Python:**

```python
# Platform client
client.add(messages, user_id="user123", metadata={}, output_format="v1.1")

# Self-hosted
memory.add(messages, user_id="user123", metadata={})
```

**TypeScript:**

```typescript
// Platform client
await client.add(messages, {
  user_id: 'user123',
  metadata: {},
  output_format: 'v1.1',
});

// Self-hosted OSS
await memory.add(messages, 'user123', { category: 'food' });
```

**Parameters:**

- `messages`: List of conversation messages with roles (user/assistant/system)
- `user_id`: Unique identifier for the user (optional)
- `agent_id`: Unique identifier for the agent (optional)
- `run_id`: Unique identifier for the session/run (optional)
- `metadata`: Additional context data (optional)
- `output_format`: Response format version (platform only)

**Message Formats:**

**Python:**

```python
# Text messages
messages = [
    {"role": "user", "content": "I prefer vegetarian food"},
    {"role": "assistant", "content": "I'll remember your vegetarian preference"}
]

# Multimodal messages
messages = [
    {"role": "user", "content": {"type": "text", "text": "What's in this image?"}},
    {"role": "user", "content": {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}}
]
```

**TypeScript:**

```typescript
// Text messages
const messages = [
  { role: 'user' as const, content: 'I prefer vegetarian food' },
  {
    role: 'assistant' as const,
    content: "I'll remember your vegetarian preference",
  },
];

// Multimodal messages
const multimodalMessages = [
  {
    role: 'user' as const,
    content: { type: 'text', text: "What's in this image?" },
  },
  {
    role: 'user' as const,
    content: {
      type: 'image_url',
      image_url: { url: 'https://example.com/image.jpg' },
    },
  },
];
```

#### Searching Memories

**Python:**

```python
# Basic search
memories = client.search("vegetarian preferences", user_id="user123")

# Advanced search with filters
memories = client.search(
    query="food preferences",
    user_id="user123",
    agent_id="chef_bot",
    limit=10,
    filters={"category": "food"},
    threshold=0.7
)
```

**TypeScript:**

```typescript
// Platform client - basic search
const memories = await client.search('vegetarian preferences', {
  user_id: 'user123',
});

// Platform client - advanced search with filters
const filteredMemories = await client.search('food preferences', {
  user_id: 'user123',
  agent_id: 'chef_bot',
  limit: 10,
  filters: { category: 'food' },
  threshold: 0.7,
});

// OSS - search with options
const ossMemories = await memory.search({
  query: 'food preferences',
  userId: 'user123',
  limit: 10,
  threshold: 0.7,
});
```

**Parameters:**

- `query`: Search query string
- `user_id`, `agent_id`, `run_id`: Filter by identifiers
- `limit`: Maximum number of results (default: 100)
- `filters`: Dictionary of metadata filters
- `threshold`: Minimum similarity score

**Response Format:**

```python
{
    "results": [
        {
            "id": "mem_123",
            "memory": "User prefers vegetarian food",
            "hash": "abc123...",
            "metadata": {"category": "food", "timestamp": "2024-01-01"},
            "score": 0.95,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    ]
}
```

#### Memory Management

**Python:**

```python
# Get specific memory
memory_detail = client.get("mem_123")

# Get all memories for user
all_memories = client.get_all(user_id="user123")

# Update memory
updated = client.update("mem_123", data="Updated preference: vegan food only")

# Delete memory
client.delete("mem_123")

# Delete all memories for user
client.delete_all(user_id="user123")

# Get memory history
history = client.history("mem_123")
```

**TypeScript:**

```typescript
// Platform client
// Get specific memory
const memoryDetail = await client.get('mem_123');

// Get all memories for user
const allMemories = await client.get_all({ user_id: 'user123' });

// Update memory
const updated = await client.update('mem_123', {
  data: 'Updated preference: vegan food only',
});

// Delete memory
await client.delete('mem_123');

// Delete all memories for user
await client.delete_all({ user_id: 'user123' });

// Get memory history
const history = await client.history('mem_123');

// OSS client
// Get specific memory
const ossMemoryDetail = await memory.get('mem_123');

// Update memory
const ossUpdated = await memory.update(
  'mem_123',
  'Updated preference: vegan food only',
);

// Delete memory
await memory.delete('mem_123');

// Reset all memories
await memory.reset();
```

### Advanced Features

#### Custom Prompts

```python
# Custom fact extraction prompt
config = {
    "custom_fact_extraction_prompt": """
    Extract key facts from this conversation that should be remembered:
    - User preferences and dislikes
    - Important personal information
    - Goals and objectives
    Conversation: {conversation}
    """
}

# Custom memory update prompt
config = {
    "custom_update_memory_prompt": """
    Update the existing memory with new information:
    Existing: {existing_memory}
    New info: {new_info}
    Updated memory:
    """
}

memory = Memory.from_config(config)
```

#### Graph Memory

```python
# Enable graph-based memory storage
config = {
    "graph_store": {
        "provider": "neo4j",  # or "memgraph"
        "config": {
            "url": "bolt://localhost:7687",
            "username": "neo4j",
            "password": "password",
        }
    }
}
memory = Memory.from_config(config)
```

### Memory Lifecycle

#### Information Extraction Process

1. **LLM Analysis**: Extract relevant memories from conversation
2. **Entity Recognition**: Identify important entities and relationships
3. **Conflict Detection**: Compare with existing memories
4. **Resolution**: Merge or update conflicting information
5. **Storage**: Save to vector and graph databases

#### Retrieval Process

1. **Query Processing**: LLM optimizes search query
2. **Vector Search**: Semantic similarity search in vector store
3. **Graph Traversal**: Find related entities and connections
4. **Ranking**: Score results by relevance and recency
5. **Filtering**: Apply user/agent/metadata filters
6. **Response**: Return ranked, filtered results

## Configuration

### Memory Configuration

**Python:**

```python
from mem0 import Memory
from mem0.configs.base import MemoryConfig

# Basic configuration
config = MemoryConfig()
memory = Memory(config)

# Detailed configuration
config = {
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4o-mini",
            "temperature": 0.1,
            "max_tokens": 2000,
            "api_key": "your-api-key"
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small",
            "api_key": "your-api-key"
        }
    },
    "vector_store": {
        "provider": "qdrant",
        "config": {
            "collection_name": "mem0_collection",
            "embedding_model_dims": 1536,
            "url": "localhost",
            "port": 6333
        }
    },
    "graph_store": {
        "provider": "neo4j",
        "config": {
            "url": "bolt://localhost:7687",
            "username": "neo4j",
            "password": "password"
        }
    },
    "history_db_path": "~/.mem0/history.db"
}

memory = Memory.from_config(config)
```

**TypeScript:**

```typescript
import { Memory } from 'mem0ai/oss';

// Basic configuration
const memory = new Memory();

// Detailed configuration
const memory = new Memory({
  version: 'v1.1',
  llm: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000,
    },
  },
  embedder: {
    provider: 'openai',
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
    },
  },
  vectorStore: {
    provider: 'qdrant',
    config: {
      collectionName: 'mem0_collection',
      embeddingModelDims: 1536,
      url: 'localhost',
      port: 6333,
    },
  },
  graphStore: {
    provider: 'neo4j',
    config: {
      url: 'bolt://localhost:7687',
      username: 'neo4j',
      password: 'password',
    },
  },
  historyDbPath: './memory.db',
});
```

### LLM Configuration Options

#### OpenAI Configuration

**Python:**

```python
llm_config = {
    "provider": "openai",
    "config": {
        "model": "gpt-4o-mini",           # or gpt-4, gpt-3.5-turbo
        "temperature": 0.1,               # 0.0 to 1.0
        "max_tokens": 2000,               # Response length limit
        "top_p": 0.1,                     # Nucleus sampling
        "api_key": "your-api-key",
        "openai_base_url": "https://api.openai.com/v1",  # Custom endpoint
        "enable_vision": True,            # For multimodal models
        "vision_details": "auto"          # auto, low, high
    }
}
```

**TypeScript:**

```typescript
const llmConfig = {
  provider: 'openai',
  config: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini', // or gpt-4, gpt-3.5-turbo
    temperature: 0.1, // 0.0 to 1.0
    maxTokens: 2000, // Response length limit
    topP: 0.1, // Nucleus sampling
    baseURL: 'https://api.openai.com/v1', // Custom endpoint
    enableVision: true, // For multimodal models
    visionDetails: 'auto', // auto, low, high
  },
};
```

#### Anthropic Configuration

**Python:**

```python
llm_config = {
    "provider": "anthropic",
    "config": {
        "model": "claude-3-haiku-20240307",  # or claude-3-sonnet, claude-3-opus
        "temperature": 0.1,
        "max_tokens": 2000,
        "api_key": "your-anthropic-key"
    }
}
```

**TypeScript:**

```typescript
const llmConfig = {
  provider: 'anthropic',
  config: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-haiku-20240307', // or claude-3-sonnet, claude-3-opus
    temperature: 0.1,
    maxTokens: 2000,
  },
};
```

#### Mistral Configuration

**TypeScript:**

```typescript
const llmConfig = {
  provider: 'mistral',
  config: {
    apiKey: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest',
    temperature: 0.1,
    maxTokens: 2000,
  },
};
```

#### Local LLM Configuration (Ollama)

**Python:**

```python
llm_config = {
    "provider": "ollama",
    "config": {
        "model": "llama3.1:8b",
        "temperature": 0.1,
        "ollama_base_url": "http://localhost:11434"
    }
}
```

**TypeScript:**

```typescript
const llmConfig = {
  provider: 'ollama',
  config: {
    model: 'llama3.1:8b',
    temperature: 0.1,
    baseURL: 'http://localhost:11434',
  },
};
```

#### Azure OpenAI Configuration

**Python:**

```python
llm_config = {
    "provider": "azure_openai",
    "config": {
        "model": "gpt-4",
        "azure_kwargs": {
            "api_key": "your-azure-key",
            "api_version": "2024-02-01",
            "azure_endpoint": "https://your-resource.openai.azure.com",
            "azure_deployment": "your-deployment-name"
        }
    }
}
```

**TypeScript:**

```typescript
const llmConfig = {
  provider: 'azure_openai',
  config: {
    model: 'gpt-4',
    azureKwargs: {
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: '2024-02-01',
      azureEndpoint: 'https://your-resource.openai.azure.com',
      azureDeployment: 'your-deployment-name',
    },
  },
};
```

### Vector Store Configuration Options

#### Qdrant Configuration

**Python:**

```python
vector_config = {
    "provider": "qdrant",
    "config": {
        "collection_name": "mem0_collection",
        "embedding_model_dims": 1536,
        "url": "localhost",
        "port": 6333,
        "path": "/path/to/qdrant/storage"  # For local storage
    }
}
```

**TypeScript:**

```typescript
const vectorConfig = {
  provider: 'qdrant',
  config: {
    collectionName: 'mem0_collection',
    embeddingModelDims: 1536,
    url: 'localhost',
    port: 6333,
    path: '/path/to/qdrant/storage', // For local storage
  },
};
```

#### Supabase Configuration

**TypeScript:**

```typescript
const vectorConfig = {
  provider: 'supabase',
  config: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,
    tableName: 'memories',
    embeddingColumnName: 'embedding',
    metadataColumnName: 'metadata',
  },
};
```

#### In-Memory Configuration

**TypeScript:**

```typescript
const vectorConfig = {
  provider: 'memory',
  config: {
    collectionName: 'mem0_collection',
    dimension: 1536,
  },
};
```

#### Pinecone Configuration

**Python:**

```python
vector_config = {
    "provider": "pinecone",
    "config": {
        "api_key": "your-pinecone-key",
        "index_name": "mem0-index",
        "environment": "us-west1-gcp"
    }
}
```

**TypeScript:**

```typescript
const vectorConfig = {
  provider: 'pinecone',
  config: {
    apiKey: process.env.PINECONE_API_KEY,
    indexName: 'mem0-index',
    environment: 'us-west1-gcp',
  },
};
```

#### Chroma Configuration

**Python:**

```python
vector_config = {
    "provider": "chroma",
    "config": {
        "collection_name": "mem0_collection",
        "path": "/path/to/chroma/db",
        "host": "localhost",
        "port": 8000
    }
}
```

**TypeScript:**

```typescript
const vectorConfig = {
  provider: 'chroma',
  config: {
    collectionName: 'mem0_collection',
    path: '/path/to/chroma/db',
    host: 'localhost',
    port: 8000,
  },
};
```

### Embedding Configuration Options

#### OpenAI Embeddings

**Python:**

```python
embedder_config = {
    "provider": "openai",
    "config": {
        "model": "text-embedding-3-small",  # or text-embedding-3-large
        "api_key": "your-api-key"
    }
}
```

**TypeScript:**

```typescript
const embedderConfig = {
  provider: 'openai',
  config: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-3-small', // or text-embedding-3-large
  },
};
```

#### HuggingFace Embeddings

**Python:**

```python
embedder_config = {
    "provider": "huggingface",
    "config": {
        "model": "all-MiniLM-L6-v2",  # or any sentence-transformer model
        "api_key": "your-hf-token"    # Optional for private models
    }
}
```

**TypeScript:**

```typescript
const embedderConfig = {
  provider: 'huggingface',
  config: {
    model: 'all-MiniLM-L6-v2', // or any sentence-transformer model
    apiKey: process.env.HF_TOKEN, // Optional for private models
  },
};
```

### Environment Variables

**Shell:**

```bash
# API Keys
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
export MEM0_API_KEY="your-mem0-platform-key"

# Vector Store
export PINECONE_API_KEY="your-pinecone-key"
export QDRANT_URL="localhost:6333"

# Custom paths
export MEM0_DIR="/custom/mem0/directory"
```

**TypeScript (.env file):**

```bash
# API Keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
MISTRAL_API_KEY=your-mistral-key
MEM0_API_KEY=your-mem0-platform-key

# Vector Store
PINECONE_API_KEY=your-pinecone-key
QDRANT_URL=localhost:6333
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# Neo4j (for graph memory)
NEO4J_URL=neo4j://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
```

### Custom Prompts Configuration

```python
config = {
    "custom_fact_extraction_prompt": """
    Extract important facts from this conversation:
    - User preferences and interests
    - Personal information and relationships
    - Goals and objectives
    - Specific requirements

    Conversation: {conversation}

    Return facts as JSON: {"facts": ["fact1", "fact2"]}
    """,

    "custom_update_memory_prompt": """
    Update existing memory with new information:

    Existing Memory: {existing_memory}
    New Information: {new_info}

    Decide action: ADD, UPDATE, DELETE, or NONE
    Return updated memory with action labels.
    """
}
```

## Integrations

### LangChain Integration

Build personalized AI applications using LangChain for conversation flow and Mem0 for memory retention.

```python
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from mem0 import MemoryClient

# Initialize components
llm = ChatOpenAI(model="gpt-4o-mini")
mem0 = MemoryClient()

# Create prompt template
prompt = ChatPromptTemplate.from_messages([
    SystemMessage(content="You are a helpful AI assistant with access to conversation history."),
    MessagesPlaceholder(variable_name="context"),
    HumanMessage(content="{input}")
])

# Helper functions
def retrieve_context(query: str, user_id: str):
    memories = mem0.search(query, user_id=user_id)
    return [{"role": "system", "content": f"Context: {' '.join([m['memory'] for m in memories])}"}]

def generate_response(input_text: str, user_id: str):
    context = retrieve_context(input_text, user_id)
    chain = prompt | llm
    response = chain.invoke({"context": context, "input": input_text})

    # Save interaction
    mem0.add([
        {"role": "user", "content": input_text},
        {"role": "assistant", "content": response.content}
    ], user_id=user_id)

    return response.content
```

### Vercel AI SDK Integration

Build conversational AI applications with persistent memory using the Vercel AI SDK integration.

```bash
npm install @mem0/vercel-ai-provider
```

#### Basic Usage with Mem0 Provider

```typescript
import { generateText } from 'ai';
import { createMem0 } from '@mem0/vercel-ai-provider';

// Initialize Mem0 provider
const mem0 = createMem0({
  provider: 'openai',
  mem0ApiKey: process.env.MEM0_API_KEY,
  apiKey: process.env.OPENAI_API_KEY,
  config: {
    compatibility: 'strict',
  },
});

// Generate text with memory context
const { text } = await generateText({
  model: mem0('gpt-4o', {
    user_id: 'user123',
  }),
  prompt: 'What did I tell you about my preferences?',
});

console.log(text); // AI responds with remembered information
```

#### Streaming Support

```typescript
import { streamText } from 'ai';
import { createMem0 } from '@mem0/vercel-ai-provider';

const mem0 = createMem0();

const { textStream } = await streamText({
  model: mem0('gpt-4o', {
    user_id: 'user123',
  }),
  prompt: 'Suggest me a good car to buy based on my preferences!',
});

for await (const textPart of textStream) {
  process.stdout.write(textPart);
}
```

#### Memory Utilities

```typescript
import {
  addMemories,
  retrieveMemories,
  getMemories,
} from '@mem0/vercel-ai-provider';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// Add memories manually
const memories = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'I love red cars.' },
      { type: 'text', text: 'I prefer Toyota cars.' },
      { type: 'text', text: 'I like SUVs.' },
    ],
  },
];

await addMemories(memories, { user_id: 'user123' });

// Retrieve memories for context
const prompt = 'Suggest me a good car to buy.';
const memoryContext = await retrieveMemories(prompt, { user_id: 'user123' });

const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: prompt,
  system: memoryContext,
});

// Get memories in array format
const userMemories = await getMemories('car preferences', {
  user_id: 'user123',
});
console.log(userMemories);
```

#### Advanced Integration with Multiple Providers

```typescript
import { generateText, LanguageModelV1Prompt } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { retrieveMemories } from '@mem0/vercel-ai-provider';

const messages: LanguageModelV1Prompt = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Suggest me a good car to buy.' },
      { type: 'text', text: 'Why is it better than other cars for me?' },
    ],
  },
];

// Retrieve memories based on conversation
const memories = await retrieveMemories(messages, { user_id: 'user123' });

const { text } = await generateText({
  model: anthropic('claude-3-haiku-20240307'),
  messages: messages,
  system: memories,
});
```

### AutoGen Integration

Create conversational AI agents with memory capabilities using AutoGen and Mem0.

```python
from autogen import ConversableAgent
from mem0 import MemoryClient

# Setup
memory_client = MemoryClient()
agent = ConversableAgent(
    "chatbot",
    llm_config={"config_list": [{"model": "gpt-4", "api_key": "your-key"}]},
    code_execution_config=False,
    human_input_mode="NEVER",
)

def get_context_aware_response(question, user_id):
    # Retrieve relevant memories
    relevant_memories = memory_client.search(question, user_id=user_id)
    context = "\n".join([m["memory"] for m in relevant_memories])

    prompt = f"""Answer considering previous interactions:
    Context: {context}
    Question: {question}
    """

    response = agent.generate_reply(messages=[{"content": prompt, "role": "user"}])

    # Store interaction
    memory_client.add([
        {"role": "user", "content": message},
        {"role": "assistant", "content": response}
    ], user_id=user_id)

    return response
```

## Examples

### 1. Customer Support Chatbot

Build a context-aware customer support system that remembers past interactions:

**Python:**

```python
import os
from typing import List, Dict
from mem0 import Memory
from datetime import datetime
import anthropic

class SupportChatbot:
    def __init__(self):
        self.config = {
            "llm": {
                "provider": "anthropic",
                "config": {
                    "model": "claude-3-5-sonnet-latest",
                    "temperature": 0.1,
                    "max_tokens": 2000,
                },
            }
        }
        self.client = anthropic.Client()
        self.memory = Memory.from_config(self.config)

    def handle_customer_query(self, user_id: str, query: str) -> str:
        # Get relevant past interactions
        relevant_history = self.memory.search(query=query, user_id=user_id, limit=5)

        # Build context
        context = "Previous interactions:\n"
        for memory in relevant_history:
            context += f"- {memory['memory']}\n"

        prompt = f"""
        You are a customer support agent. Use past interactions for context.

        {context}

        Current query: {query}
        Provide helpful response based on history.
        """

        response = self.client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        # Store interaction
        self.memory.add([
            {"role": "user", "content": query},
            {"role": "assistant", "content": response.content[0].text}
        ], user_id=user_id, metadata={"timestamp": datetime.now().isoformat()})

        return response.content[0].text

# Usage
chatbot = SupportChatbot()
response = chatbot.handle_customer_query("user123", "I need help with my order")
```

**TypeScript:**

```typescript
import { Memory } from 'mem0ai/oss';
import Anthropic from '@anthropic-ai/sdk';

class SupportChatbot {
  private client: Anthropic;
  private memory: Memory;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.memory = new Memory({
      version: 'v1.1',
      llm: {
        provider: 'anthropic',
        config: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: 'claude-3-5-sonnet-latest',
          temperature: 0.1,
          maxTokens: 2000,
        },
      },
    });
  }

  async handleCustomerQuery(userId: string, query: string): Promise<string> {
    // Get relevant past interactions
    const relevantHistory = await this.memory.search({
      query,
      userId,
      limit: 5,
    });

    // Build context
    let context = 'Previous interactions:\n';
    for (const memory of relevantHistory.results) {
      context += `- ${memory.memory}\n`;
    }

    const prompt = `
        You are a customer support agent. Use past interactions for context.
        
        ${context}
        
        Current query: ${query}
        Provide helpful response based on history.
        `;

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Store interaction
    await this.memory.add(
      [
        { role: 'user', content: query },
        { role: 'assistant', content: responseText },
      ],
      userId,
      { timestamp: new Date().toISOString() },
    );

    return responseText;
  }
}

// Usage
const chatbot = new SupportChatbot();
const response = await chatbot.handleCustomerQuery(
  'user123',
  'I need help with my order',
);
```

### 2. Personal AI Study Buddy

Create an AI tutor that tracks learning progress and adapts to individual needs:

```python
from mem0 import MemoryClient
from agents import Agent, Runner

client = MemoryClient()

study_agent = Agent(
    name="StudyBuddy",
    instructions="""You are a helpful study coach. You:
    - Track what the user has studied before
    - Identify topics the user has struggled with
    - Help with spaced repetition by suggesting topics to revisit
    - Personalize answers using stored memories
    """,
)

async def study_buddy(user_id: str, topic: str, user_input: str):
    # Get relevant study memories
    memories = client.search(f"{topic}", user_id=user_id)
    memory_context = "\n".join(f"- {m['memory']}" for m in memories)

    prompt = f"""
    You are helping the user study: {topic}
    Past study sessions: {memory_context}

    User question/comment: {user_input}
    """

    result = await Runner.run(study_agent, prompt)
    response = result.final_output

    # Store study session
    client.add([{
        "role": "user",
        "content": f"Topic: {topic}\nUser: {user_input}\nStudy Assistant: {response}"
    }], user_id=user_id, metadata={"topic": topic})

    return response

# Upload PDF study materials
def upload_pdf(pdf_url: str, user_id: str):
    pdf_message = {"role": "user", "content": {"type": "pdf_url", "pdf_url": {"url": pdf_url}}}
    client.add([pdf_message], user_id=user_id)
```

### 3. Movie Recommendation System

Build a personalized movie recommender that learns user preferences:

**Python:**

```python
from mem0 import Memory
from openai import OpenAI

# Configure with local models for privacy
config = {
    "vector_store": {"provider": "qdrant", "config": {"embedding_model_dims": 384}},
    "llm": {
        "provider": "xai",
        "config": {
            "model": "grok-3-beta",
            "temperature": 0.1,
            "max_tokens": 2000,
        },
    },
    "embedder": {
        "provider": "huggingface",
        "config": {"model": "all-MiniLM-L6-v2"}
    },
}

memory = Memory.from_config(config)
grok_client = OpenAI(api_key=os.getenv("XAI_API_KEY"), base_url="https://api.x.ai/v1")

def recommend_movie_with_memory(user_id: str, user_query: str):
    # Get movie preferences from memory
    past_memories = memory.search("movie preferences", user_id=user_id)

    prompt = user_query
    if past_memories:
        preferences = "\n".join([m["memory"] for m in past_memories])
        prompt += f"\nUser's movie preferences: {preferences}"

    response = grok_client.chat.completions.create(
        model="grok-3-beta",
        messages=[{"role": "user", "content": prompt}]
    )
    recommendation = response.choices[0].message.content

    # Store interaction
    memory.add([
        {"role": "user", "content": user_query},
        {"role": "assistant", "content": recommendation}
    ], user_id=user_id)

    return recommendation

# Example usage
recommendation = recommend_movie_with_memory("user123", "I want a sci-fi movie")
```

**TypeScript:**

```typescript
import { Memory } from 'mem0ai/oss';
import OpenAI from 'openai';

// Configure with local models for privacy
const memory = new Memory({
  version: 'v1.1',
  vectorStore: {
    provider: 'qdrant',
    config: { embeddingModelDims: 384 },
  },
  llm: {
    provider: 'openai', // Using OpenAI instead of xAI for TS compatibility
    config: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4o',
      temperature: 0.1,
      maxTokens: 2000,
    },
  },
  embedder: {
    provider: 'huggingface',
    config: { model: 'all-MiniLM-L6-v2' },
  },
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function recommendMovieWithMemory(
  userId: string,
  userQuery: string,
): Promise<string> {
  // Get movie preferences from memory
  const pastMemories = await memory.search({
    query: 'movie preferences',
    userId,
  });

  let prompt = userQuery;
  if (pastMemories.results.length > 0) {
    const preferences = pastMemories.results.map((m) => m.memory).join('\n');
    prompt += `\nUser's movie preferences: ${preferences}`;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
  });

  const recommendation = response.choices[0].message.content || '';

  // Store interaction
  await memory.add(
    [
      { role: 'user', content: userQuery },
      { role: 'assistant', content: recommendation },
    ],
    userId,
  );

  return recommendation;
}

// Example usage
const recommendation = await recommendMovieWithMemory(
  'user123',
  'I want a sci-fi movie',
);
console.log(recommendation);
```

### 4. Personal Fitness Tracker

Create a fitness assistant that remembers health goals and progress:

```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from mem0 import MemoryClient

memory_client = MemoryClient()

agent = Agent(
    name="Fitness Agent",
    model=OpenAIChat(id="gpt-4o"),
    description="Fitness assistant who remembers past workouts and gives personalized suggestions",
    markdown=True,
)

def fitness_coach(user_input: str, user_id: str = "fitness_user"):
    # Search for relevant fitness memories
    memories = memory_client.search(user_input, user_id=user_id)
    memory_context = "\n".join(f"- {m['memory']}" for m in memories)

    prompt = f"""
    You are a fitness assistant for {user_id}. Use your memory to personalize suggestions.

    What you remember about this user:
    {memory_context}

    User's current input: {user_input}

    Provide personalized fitness advice based on their history, goals, and preferences.
    """

    response = agent.run(prompt)

    # Store the interaction
    memory_client.add(
        f"User: {user_input}\nAssistant: {response.content}",
        user_id=user_id
    )

    return response.content

# Example usage
advice = fitness_coach("I want to start a new workout routine", "user123")
```

### 5. Healthcare Assistant

Build a healthcare assistant that maintains patient history and preferences:

```python
from mem0 import MemoryClient
import json

class HealthcareAssistant:
    def __init__(self):
        self.memory = MemoryClient()

    def add_patient_info(self, patient_id: str, info: dict):
        """Add patient information to memory"""
        messages = [{
            "role": "system",
            "content": f"Patient information: {json.dumps(info)}"
        }]
        self.memory.add(messages, user_id=patient_id, metadata={"type": "patient_info"})

    def get_patient_context(self, patient_id: str, query: str):
        """Get relevant patient context for query"""
        memories = self.memory.search(query, user_id=patient_id)
        return "\n".join([m["memory"] for m in memories])

    def provide_care_recommendations(self, patient_id: str, symptoms: str):
        """Provide personalized care recommendations"""
        context = self.get_patient_context(patient_id, symptoms)

        # Note: This is a simplified example. Real healthcare AI needs medical validation
        prompt = f"""
        Based on patient history: {context}
        Current symptoms: {symptoms}

        Provide general wellness recommendations.
        Always recommend consulting healthcare professionals for medical advice.
        """

        # Store the consultation
        self.memory.add([
            {"role": "user", "content": f"Symptoms: {symptoms}"},
            {"role": "assistant", "content": "Provided wellness recommendations"}
        ], user_id=patient_id)

# Usage
assistant = HealthcareAssistant()
assistant.add_patient_info("patient123", {
    "age": 35,
    "allergies": ["peanuts"],
    "conditions": ["hypertension"],
    "medications": ["lisinopril"]
})
```

### 6. Enterprise Knowledge Assistant

Create an AI assistant that learns from organizational knowledge:

```python
from mem0 import Memory
from typing import List, Dict

class EnterpriseAssistant:
    def __init__(self):
        self.memory = Memory()

    def ingest_document(self, doc_content: str, doc_metadata: Dict):
        """Ingest enterprise documents into memory"""
        messages = [{"role": "system", "content": doc_content}]
        self.memory.add(messages,
                       user_id="enterprise",
                       metadata=doc_metadata)

    def answer_query(self, query: str, department: str = None):
        """Answer queries using enterprise knowledge"""
        # Search for relevant information
        filters = {"department": department} if department else {}
        memories = self.memory.search(query,
                                    user_id="enterprise",
                                    filters=filters,
                                    limit=5)

        context = "\n".join([m["memory"] for m in memories])

        # Generate response (integrate with your preferred LLM)
        response = f"Based on enterprise knowledge: {context}"

        return response

# Usage
assistant = EnterpriseAssistant()
assistant.ingest_document(
    "Company policy on remote work...",
    {"department": "HR", "document_type": "policy"}
)
answer = assistant.answer_query("What is the remote work policy?", "HR")
```

## Testing

### Test Structure

Mem0 uses pytest for Python and Jest for TypeScript testing. The test suite covers:

**Python:**

```python
import pytest
from mem0 import Memory

@pytest.fixture
def memory_store():
    return Memory()

def test_memory_operations(memory_store):
    # Test adding memories
    messages = [{"role": "user", "content": "I like pizza"}]
    result = memory_store.add(messages, user_id="test_user")
    assert len(result) > 0

    # Test searching memories
    memories = memory_store.search("food preferences", user_id="test_user")
    assert len(memories) > 0

    # Test memory retrieval
    memory_id = result[0]["id"]
    retrieved = memory_store.get(memory_id)
    assert retrieved is not None

    # Test memory update
    updated = memory_store.update(memory_id, "I prefer Italian food")
    assert "Italian" in updated["memory"]

    # Test memory deletion
    memory_store.delete(memory_id)
    deleted = memory_store.get(memory_id)
    assert deleted is None
```

**TypeScript:**

```typescript
import { Memory } from 'mem0ai/oss';
import MemoryClient from 'mem0ai';

describe('Memory Operations', () => {
  let memory: Memory;
  let client: MemoryClient;

  beforeEach(() => {
    memory = new Memory();
    client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
  });

  test('should add and retrieve memories', async () => {
    // Test OSS memory operations
    const messages = [{ role: 'user' as const, content: 'I like pizza' }];
    const result = await memory.add(messages, 'test_user');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);

    // Test searching memories
    const memories = await memory.search({
      query: 'food preferences',
      userId: 'test_user',
    });
    expect(memories.results.length).toBeGreaterThan(0);
  });

  test('should handle client operations', async () => {
    // Test platform client
    const messages = [{ role: 'user' as const, content: 'I enjoy hiking' }];
    await client.add(messages, { user_id: 'test_user' });

    const memories = await client.search('outdoor activities', {
      user_id: 'test_user',
    });
    expect(memories.results).toBeDefined();
  });

  test('should update and delete memories', async () => {
    // Add memory
    const messages = [{ role: 'user' as const, content: 'I like cats' }];
    const result = await memory.add(messages, 'test_user');
    const memoryId = result[0].id;

    // Update memory
    const updated = await memory.update(memoryId, 'I love cats and dogs');
    expect(updated.memory).toContain('dogs');

    // Delete memory
    await memory.delete(memoryId);
    const deleted = await memory.get(memoryId);
    expect(deleted).toBeNull();
  });
});
```

### Testing Integrations

```python
import pytest
from unittest.mock import MagicMock

class TestMemoryIntegrations:
    @pytest.fixture
    def mock_memory(self, mocker):
        mock_llm = mocker.MagicMock()
        mock_vector_store = mocker.MagicMock()
        mock_embedder = mocker.MagicMock()

        mocker.patch("mem0.utils.factory.LlmFactory.create", mock_llm)
        mocker.patch("mem0.utils.factory.VectorStoreFactory.create", mock_vector_store)
        mocker.patch("mem0.utils.factory.EmbedderFactory.create", mock_embedder)

        return Memory()

    def test_llm_integration(self, mock_memory):
        # Test LLM response handling
        mock_memory.llm.generate_response.return_value = '{"facts": ["test fact"]}'

        result = mock_memory.add([{"role": "user", "content": "test"}])
        assert mock_memory.llm.generate_response.called

    def test_vector_store_integration(self, mock_memory):
        # Test vector store operations
        mock_memory.vector_store.search.return_value = []

        result = mock_memory.search("test query")
        assert mock_memory.vector_store.search.called
```

### Running Tests

**Python:**

```bash
# Install dependencies
pip install pytest pytest-mock

# Run all tests
pytest tests/

# Run specific test file
pytest tests/memory/test_main.py

# Run with coverage
pytest --cov=mem0 tests/

# Run async tests
pytest -k "async" tests/
```

**TypeScript:**

```bash
# Install dependencies
npm install --save-dev jest @types/jest ts-jest

# Run all tests
npm test

# Run specific test file
npm test -- memory.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# For OSS package specifically
cd mem0-ts
npm run test

# For Vercel AI SDK package
cd vercel-ai-sdk
npm run test
```

## OpenMemory API

OpenMemory provides a local-first memory server for MCP-compatible tools, running entirely on your machine.

### Architecture

OpenMemory consists of:

- **Backend API**: FastAPI-based memory management service
- **Frontend UI**: React-based dashboard for memory visualization
- **MCP Server**: Model Context Protocol server for AI tool integration
- **Database**: Local SQLite storage for memories

### API Schemas

```python
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class MemoryBase(BaseModel):
    content: str
    metadata_: Optional[dict] = {}

class MemoryCreate(MemoryBase):
    user_id: UUID
    app_id: UUID

class Memory(MemoryBase):
    id: UUID
    user_id: UUID
    app_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    state: str
    categories: Optional[List[str]] = None

class MemoryResponse(BaseModel):
    id: UUID
    content: str
    created_at: int
    state: str
    app_id: UUID
    app_name: str
    categories: List[str]
    metadata_: Optional[dict] = None
```

### Setup and Installation

```bash
# Prerequisites
# - Docker and Docker Compose
# - OpenAI API Key

# Quick setup
curl -sL https://raw.githubusercontent.com/mem0ai/mem0/main/openmemory/run.sh | bash

# Or with API key
curl -sL https://raw.githubusercontent.com/mem0ai/mem0/main/openmemory/run.sh | OPENAI_API_KEY=your_key bash

# Manual setup
cp api/.env.example api/.env
cp ui/.env.example ui/.env

# Configure environment variables
# api/.env
OPENAI_API_KEY=sk-xxx
USER=<user-id>

# ui/.env
NEXT_PUBLIC_API_URL=http://localhost:8765
NEXT_PUBLIC_USER_ID=<user-id>

# Build and run
make build
make up
```

### MCP Server Integration

OpenMemory exposes standardized memory tools through MCP:

```python
# MCP Tools Available
- add_memories: Store new memory objects
- search_memory: Retrieve relevant memories
- list_memories: View all stored memories
- delete_all_memories: Clear memory entirely
```

### API Endpoints

```bash
# Add memory
POST /memories
{
  "content": "User prefers vegetarian food",
  "user_id": "uuid",
  "app_id": "uuid",
  "metadata_": {"category": "food"}
}

# Search memories
GET /memories/search?query=food&user_id=uuid&limit=10

# Get all memories
GET /memories?user_id=uuid&page=1&size=10

# Update memory
PUT /memories/{memory_id}
{
  "content": "Updated content",
  "metadata_": {"updated": true}
}

# Delete memory
DELETE /memories/{memory_id}

# Get memory categories
GET /memories/categories?user_id=uuid
```

### Supported MCP Clients

- **Cursor**: Code editor with AI capabilities
- **Claude Desktop**: Anthropic's AI assistant
- **Windsurf**: AI-powered development environment
- **Cline**: VS Code extension for AI coding
- **And more MCP-compatible tools**

### Cross-Client Memory Access

```python
# Store context in one client
cursor_memory = {
    "content": "Project uses React with TypeScript",
    "metadata_": {"project": "webapp", "client": "cursor"}
}

# Access from another client
claude_query = "What framework is this project using?"
# Claude can access the React/TypeScript context stored from Cursor
```

## Development Guidelines

### Contributing

#### Prerequisites

**Python Development:**

- Python 3.9+
- Poetry for dependency management
- Pre-commit hooks for code quality

**TypeScript Development:**

- Node.js 18+
- pnpm (recommended) or npm
- TypeScript 5.5+

#### Setup Development Environment

**Python:**

```bash
# Clone repository
git clone https://github.com/mem0ai/mem0.git
cd mem0

# Install dependencies
make install_all

# Activate virtual environment
poetry shell

# Install pre-commit hooks
pre-commit install
```

**TypeScript:**

```bash
# Clone repository
git clone https://github.com/mem0ai/mem0.git
cd mem0

# Setup TypeScript SDK
cd mem0-ts
pnpm install

# Setup Vercel AI SDK integration
cd ../vercel-ai-sdk
pnpm install

# Build packages
cd ../mem0-ts
pnpm run build

cd ../vercel-ai-sdk
pnpm run build
```

#### Code Standards

**Python:**

```bash
# Linting with ruff
make lint

# Code formatting
make format

# Run tests
make test

# Run all checks
make check
```

**TypeScript:**

```bash
# For mem0-ts package
cd mem0-ts

# Linting and formatting
npm run format:check
npm run format

# Build package
npm run build

# Run tests
npm test

# For vercel-ai-sdk package
cd ../vercel-ai-sdk

# Type checking
npm run type-check

# Build package
npm run build

# Run tests
npm test
```

#### Pull Request Process

1. **Fork and Clone**: Fork the repository and create a feature branch

   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Implement Changes**:

   - Write necessary tests for new features
   - Add documentation and examples
   - Follow existing code patterns

3. **Quality Checks**:

   - Run linting: `make lint`
   - Ensure all tests pass: `make test`
   - Verify code formatting: `make format`

4. **Submit PR**: Create pull request with clear description

#### Package Structure

```
mem0/
├── __init__.py              # Main package exports
├── client/                  # Platform client implementation
├── configs/                 # Configuration classes
│   ├── base.py             # Base config classes
│   ├── llms/               # LLM configurations
│   ├── embeddings/         # Embedding configurations
│   └── vector_stores/      # Vector store configurations
├── embeddings/             # Embedding implementations
├── graphs/                 # Graph database implementations
├── llms/                   # LLM implementations
├── memory/                 # Core memory functionality
│   ├── base.py            # Abstract base classes
│   ├── main.py            # Main Memory class
│   ├── graph_memory.py    # Graph-based memory
│   └── storage.py         # Storage utilities
├── utils/                  # Utility functions
└── vector_stores/         # Vector database implementations
```

#### Adding New Providers

##### LLM Provider

```python
# Create new LLM provider
from mem0.llms.base import LLMBase

class CustomLLM(LLMBase):
    def __init__(self, config):
        self.config = config

    def generate_response(self, messages, **kwargs):
        # Implement LLM generation logic
        pass

    def _parse_config(self, config):
        # Parse provider-specific config
        pass

# Register in factory
from mem0.utils.factory import LlmFactory
LlmFactory.register("custom", CustomLLM)
```

##### Vector Store Provider

```python
# Create new vector store
from mem0.vector_stores.base import VectorStoreBase

class CustomVectorStore(VectorStoreBase):
    def __init__(self, config):
        self.config = config

    def create_col(self, name, vector_size, distance):
        # Implement collection creation
        pass

    def insert(self, vectors, payloads, ids):
        # Implement vector insertion
        pass

    def search(self, query, limit, filters):
        # Implement vector search
        pass

# Register in factory
from mem0.utils.factory import VectorStoreFactory
VectorStoreFactory.register("custom", CustomVectorStore)
```

#### Testing Guidelines

```python
# Test naming convention
def test_[component]_[functionality]_[expected_outcome]:
    pass

# Use fixtures for setup
@pytest.fixture
def memory_instance():
    return Memory()

# Mock external dependencies
def test_llm_integration(mocker):
    mock_llm = mocker.patch("mem0.llms.openai.OpenAILLM")
    mock_llm.return_value.generate_response.return_value = "mocked response"

    memory = Memory()
    result = memory.add([{"role": "user", "content": "test"}])

    assert mock_llm.called
    assert len(result) > 0
```

#### Release Process

1. **Version Bump**: Update version in `pyproject.toml`
2. **Changelog**: Update `CHANGELOG.md` with new features
3. **Testing**: Ensure all tests pass
4. **Build**: Create distribution packages
5. **Release**: Tag and publish to PyPI

### Project Structure

```
mem0/
├── .github/                # GitHub workflows and templates
├── cookbooks/              # Jupyter notebook examples
├── docs/                   # Documentation (MDX files)
├── examples/               # Code examples and demos
├── mem0/                   # Core Python package
├── mem0-ts/               # TypeScript/JavaScript SDK
│   ├── src/
│   │   ├── client/        # Platform client
│   │   ├── oss/           # Open-source implementation
│   │   └── community/     # Community integrations
│   ├── tests/             # TypeScript tests
│   └── package.json       # TypeScript package config
├── openmemory/            # OpenMemory MCP server
├── server/                # Legacy server implementation
├── tests/                 # Python test suite
├── vercel-ai-sdk/         # Vercel AI SDK integration
│   ├── src/               # Provider implementation
│   ├── tests/             # Integration tests
│   └── package.json       # AI SDK package config
├── pyproject.toml         # Python package configuration
├── Makefile              # Development commands
└── README.md             # Project overview
```

## Troubleshooting

### Common Issues

#### Memory Not Being Stored

**Problem**: Memories are not being stored or retrieved correctly.

**Solutions**:

```python
# Check LLM configuration
config = {
    "llm": {
        "provider": "openai",
        "config": {
            "api_key": "your-key",  # Ensure API key is set
            "model": "gpt-4o-mini"  # Use a valid model
        }
    }
}

# Verify embedding configuration
config["embedder"] = {
    "provider": "openai",
    "config": {
        "api_key": "your-key",
        "model": "text-embedding-3-small"
    }
}

# Check vector store connection
config["vector_store"] = {
    "provider": "qdrant",
    "config": {
        "url": "localhost",
        "port": 6333,
        "collection_name": "mem0_collection"
    }
}
```

#### Vector Store Connection Issues

**Problem**: Cannot connect to vector database.

**Solutions**:

```bash
# For Qdrant
docker run -p 6333:6333 qdrant/qdrant

# For Chroma
pip install chromadb
```

```python
# Test vector store connection
from mem0.vector_stores.qdrant import QdrantDB

try:
    vector_store = QdrantDB(config)
    vector_store.list_cols()
    print("Connection successful")
except Exception as e:
    print(f"Connection failed: {e}")
```

#### LLM API Rate Limits

**Problem**: Getting rate limit errors from LLM provider.

**Solutions**:

```python
# Add retry logic and delays
config = {
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4o-mini",  # Use cheaper model
            "temperature": 0.1,
            "max_tokens": 1000,      # Reduce token usage
            "request_timeout": 30,   # Add timeout
        }
    }
}

# Use local models to avoid rate limits
config = {
    "llm": {
        "provider": "ollama",
        "config": {
            "model": "llama3.1:8b",
            "ollama_base_url": "http://localhost:11434"
        }
    }
}
```

#### Memory Retrieval Performance

**Problem**: Memory search is slow or returns irrelevant results.

**Solutions**:

```python
# Optimize search parameters
memories = memory.search(
    query="specific query",
    user_id="user123",
    limit=5,              # Reduce limit for faster search
    threshold=0.7,        # Increase threshold for more relevant results
    filters={"category": "important"}  # Use filters to narrow search
)

# Use more specific queries
# Instead of: "food"
# Use: "vegetarian food preferences"

# Configure embedding model for better semantic search
config = {
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-large"  # Better embeddings
        }
    }
}
```

#### Environment Configuration

**Problem**: Environment variables not being loaded.

**Python Solutions:**

```python
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Verify variables are set
required_vars = ["OPENAI_API_KEY", "MEM0_API_KEY"]
for var in required_vars:
    if not os.getenv(var):
        raise ValueError(f"Missing required environment variable: {var}")

# Set in code if needed
os.environ["OPENAI_API_KEY"] = "your-key"
```

**TypeScript Solutions:**

```typescript
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Verify variables are set
const requiredVars = ['OPENAI_API_KEY', 'MEM0_API_KEY'];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}

// For Next.js or client-side applications, use NEXT_PUBLIC_ prefix
const publicConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  // Never expose private keys on client side
};
```

#### TypeScript Build Issues

**Problem**: TypeScript compilation errors or module resolution issues.

**Solutions:**

```bash
# Clear build cache
npm run clean
rm -rf node_modules
npm install

# Check TypeScript configuration
npx tsc --noEmit

# Verify peer dependencies
npm ls

# For ESM/CommonJS issues
# Ensure package.json has correct "type": "module" or exports
```

**TypeScript Configuration (tsconfig.json):**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

#### Memory Conflicts and Updates

**Problem**: Memory updates not working correctly or creating conflicts.

**Solutions**:

```python
# Use specific update prompts
config = {
    "custom_update_memory_prompt": """
    Compare new information with existing memory.
    If conflicting, UPDATE the memory with new information.
    If complementary, ADD new information.
    If duplicate, use NONE.

    Existing: {existing_memory}
    New: {new_info}

    Action: [ADD/UPDATE/DELETE/NONE]
    """
}

# Check memory version and update accordingly
memory_id = "mem_123"
current_memory = memory.get(memory_id)
updated_memory = memory.update(memory_id, "new information")
```

#### OpenMemory MCP Server Issues

**Problem**: MCP server not connecting to AI tools.

**Solutions**:

```bash
# Check Docker containers are running
docker ps

# Verify API is accessible
curl http://localhost:8765/health

# Check environment variables
echo $OPENAI_API_KEY

# Restart services
make down
make up
```

#### Performance Optimization

**Problem**: Slow memory operations with large datasets.

**Solutions**:

```python
# Use batch operations
memories_to_add = [
    {"role": "user", "content": "fact 1"},
    {"role": "user", "content": "fact 2"},
    # ... more memories
]

# Add in batches instead of individually
for i in range(0, len(memories_to_add), 10):
    batch = memories_to_add[i:i+10]
    memory.add(batch, user_id="user123")

# Use appropriate vector store for scale
config = {
    "vector_store": {
        "provider": "pinecone",  # Better for large scale
        "config": {
            "api_key": "your-key",
            "index_name": "production-index"
        }
    }
}

# Optimize embedding batch size
config = {
    "embedder": {
        "provider": "openai",
        "config": {
            "batch_size": 100  # Process embeddings in batches
        }
    }
}
```

### Debugging Tips

#### Enable Logging

**Python:**

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Memory operations will now show detailed logs
memory = Memory()
result = memory.add([{"role": "user", "content": "test"}])
```

**TypeScript:**

```typescript
// For Node.js applications, you can enable debug logging
process.env.DEBUG = 'mem0:*';

// Or use console.log for debugging
const memory = new Memory({
  // Add debug option if available
  debug: true,
});

// Log operations
console.log('Adding memory...');
const result = await memory.add([{ role: 'user', content: 'test' }], 'user123');
console.log('Result:', result);
```

#### Inspect Memory State

**Python:**

```python
# Check memory configuration
print(memory.config)

# Check vector store status
print(memory.vector_store.list_cols())

# Check LLM connectivity
response = memory.llm.generate_response([{"role": "user", "content": "test"}])
print(response)
```

**TypeScript:**

```typescript
// Check memory configuration
console.log('Memory config:', JSON.stringify(memory.config, null, 2));

// Test individual operations
try {
  const searchResult = await memory.search({
    query: 'test',
    userId: 'debug_user',
  });
  console.log('Search works:', searchResult.results.length);
} catch (error) {
  console.error('Search failed:', error);
}

// Test client connectivity for platform
const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
try {
  await client.ping();
  console.log('Client connection successful');
} catch (error) {
  console.error('Client connection failed:', error);
}
```

#### Test Individual Components

```python
# Test embeddings
embeddings = memory.embedding_model.embed("test text")
print(f"Embedding dimension: {len(embeddings)}")

# Test vector search
results = memory.vector_store.search(
    query_embedding=embeddings,
    limit=5,
    filters={}
)
print(f"Search results: {len(results)}")
```

### Getting Help

- **Documentation**: https://docs.mem0.ai
- **Discord Community**: https://mem0.dev/DiG
- **GitHub Issues**: https://github.com/mem0ai/mem0/issues
- **Email Support**: founders@mem0.ai
- **Twitter**: @mem0ai

### Frequently Asked Questions

**Q: Can I use Mem0 without an internet connection?**
A: Yes, using local models like Ollama for LLM and local vector stores like Qdrant or Chroma.

**Q: How do I migrate from one vector store to another?**
A: Export memories using `get_all()`, then re-add them to a new Memory instance with different vector store config.

**Q: Can I use multiple LLMs simultaneously?**
A: Not directly, but you can create multiple Memory instances with different LLM configurations.

**Q: How do I use Mem0 with TypeScript in a Next.js project?**
A: Install the client SDK with `npm install mem0ai` and use the platform client. For the OSS version, import from `mem0ai/oss`. Ensure environment variables are prefixed with `NEXT_PUBLIC_` if needed on the client side.

**Q: What's the difference between the TypeScript client and OSS packages?**
A: The client (`mem0ai`) connects to the Mem0 platform for managed hosting. The OSS package (`mem0ai/oss`) runs locally and requires you to configure LLMs, vector stores, and embeddings yourself.

**Q: Can I use Mem0 with Vercel AI SDK for streaming?**
A: Yes! Use `@mem0/vercel-ai-provider` which provides seamless integration with streaming support and memory context injection.

**Q: How do I handle TypeScript type errors with the Mem0 SDK?**
A: Ensure you're using the latest TypeScript version (5.5+) and that all peer dependencies are installed. The SDK includes comprehensive TypeScript definitions.

**Q: Can I use Mem0 in a serverless environment like Vercel or Netlify?**
A: Yes, both the platform client and Vercel AI SDK integration work well in serverless environments. For OSS, consider using lightweight vector stores like Supabase.

**Q: How do I backup my memories?**
A: Use the export functionality to save memories to JSON, or backup the vector store data directory.

**Q: Is Mem0 suitable for production use?**
A: Yes, especially with the managed platform. For self-hosted, ensure proper monitoring and backup strategies.

---

This comprehensive guide covers all aspects of Mem0 development, from basic usage to advanced integrations and troubleshooting. Use it as a reference for building intelligent AI applications with persistent memory capabilities.

### CrewAI Integration

Enhance CrewAI agents with memory capabilities for improved task execution.

```python
from crewai import Agent, Task, Crew
from mem0 import MemoryClient

memory_client = MemoryClient()

def create_memory_agent():
    return Agent(
        role='Research Analyst with Memory',
        goal='Analyze topics while remembering past research',
        backstory='An experienced analyst who learns from previous work',
        verbose=True,
        allow_delegation=False,
        memory=True
    )

def research_with_memory(topic, user_id="researcher"):
    # Get relevant memories
    memories = memory_client.search(topic, user_id=user_id)
    context = "\n".join([m["memory"] for m in memories])

    agent = create_memory_agent()
    task = Task(
        description=f"""Research {topic}.
        Previous research context: {context}
        Provide comprehensive analysis building on past work.""",
        agent=agent
    )

    crew = Crew(agents=[agent], tasks=[task])
    result = crew.kickoff()

    # Store results
    memory_client.add([
        {"role": "user", "content": f"Research topic: {topic}"},
        {"role": "assistant", "content": str(result)}
    ], user_id=user_id)

    return result
```

### Vercel AI SDK Integration

Build conversational interfaces with memory using Vercel AI SDK.

```typescript
import { createMem0 } from 'mem0ai';
import { generateText } from 'ai';

const mem0OpenAI = createMem0({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  mem0Config: {
    user_id: 'user123',
  },
});

const result = await generateText({
  model: mem0OpenAI('gpt-4o'),
  prompt: 'What did I tell you about my preferences?',
});

console.log(result.text); // AI responds with remembered information
```

### OpenAI Assistants Integration

Enhance OpenAI Assistants with persistent memory across sessions.

```python
from openai import OpenAI
from mem0 import MemoryClient

openai_client = OpenAI()
memory_client = MemoryClient()

def create_assistant_with_memory():
    return openai_client.beta.assistants.create(
        name="Memory Assistant",
        instructions="You are a helpful assistant with access to conversation history.",
        model="gpt-4",
    )

def chat_with_assistant(message, user_id, assistant_id):
    # Get relevant memories
    memories = memory_client.search(message, user_id=user_id)
    context = "\n".join([f"Memory: {m['memory']}" for m in memories])

    # Create thread with context
    thread = openai_client.beta.threads.create(
        messages=[
            {"role": "user", "content": f"Context: {context}\n\nUser: {message}"}
        ]
    )

    # Run assistant
    run = openai_client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant_id
    )

    # Get response and store in memory
    messages = openai_client.beta.threads.messages.list(thread_id=thread.id)
    response = messages.data[0].content[0].text.value

    memory_client.add([
        {"role": "user", "content": message},
        {"role": "assistant", "content": response}
    ], user_id=user_id)

    return response
```
