/**
 * @fileoverview Case File Document Retrieval and Processing System
 *
 * This module provides comprehensive functionality for retrieving, processing, and analyzing
 * case file documents using AI-powered information extraction. It serves as the core document
 * processing pipeline for compliance analysis, policy review, and legal document examination.
 *
 * **Key Features:**
 * - **Intelligent Document Retrieval**: Efficiently fetches case file documents with relationship data
 * - **Smart Grouping Algorithm**: Optimizes AI processing by batching documents with identical goals
 * - **AI-Powered Analysis**: Extracts relevant information using sophisticated language models
 * - **Flexible Verbatim Control**: Adjustable fidelity levels from exact quotes to summaries
 * - **Comprehensive Monitoring**: Full OpenTelemetry integration for operational insights
 * - **Error Resilience**: Robust error handling with detailed logging and graceful degradation
 *
 * **Main Functions:**
 * - `getCaseFileDocument`: Single document retrieval wrapper
 * - `getMultipleCaseFileDocuments`: Batch document processing with goal-based grouping
 * - `getCaseFileDocumentIndex`: Lightweight metadata retrieval for document discovery
 * - `preprocessCaseFileDocument`: AI-powered information extraction and analysis
 *
 * **Architecture:**
 * ```
 * Client Request → ID Resolution → Database Query → Document Grouping → AI Processing → Response
 *                     ↓              ↓             ↓                ↓            ↓
 *                 Validation    Relationship    Goal-based      Prompt         Structured
 *                              Loading         Batching        Engineering     Output
 * ```
 *
 * **Performance Characteristics:**
 * - Supports batch processing for efficiency
 * - Intelligent model selection based on content size
 * - Comprehensive metrics collection for monitoring
 * - Optimized database queries with selective field loading
 *
 * **Use Cases:**
 * - Legal compliance review and audit
 * - Policy violation detection and analysis
 * - Contract analysis and risk assessment
 * - Regulatory compliance monitoring
 * - Document summarization and information extraction
 *
 * @module getCaseFileDocument
 * @version 2.0.0
 * @author AI Tools Team
 * @since 1.0.0
 */
export {
  getCaseFileDocument,
  getMultipleCaseFileDocuments,
} from './get-casefile-document';

export { getCaseFileDocumentIndex } from './get-casefile-document-index';
