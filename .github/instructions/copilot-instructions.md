# Copilot Instructions
This file contains instructions for working with the Copilot project.  Please read the instructions below and follow the links to the relevant sections for more details.

## Table of Contents

### [web-ui](web-ui) - Next.js based web application
This folder contains the nextjs-based web application.  It provides end-users with an accessible interface to appliation data, exposes application data via APIs, and generally supports the case file analysis process.  User credentials ara avialable in the COPILOT_LOGIN_USERNAMA and COPILOT_LOGIN_PASSWORD environment varibles. If you will be working in this folder, load [.github/instructions/web-ui/copilot-instructions.md](.github/instructions/web-ui/copilot-instructions.md) for further instructions.

### [chat](chat) - AI chat service
This folder contains the AI chat service.  It contains logic built around LangChainJS to support bulk document embedding, vector storage via Azure Cognitive Search, and AI-based document enrichment used to support the analsyis process.
