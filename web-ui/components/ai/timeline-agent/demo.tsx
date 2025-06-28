/**
 * Timeline Agent Demo Component
 *
 * This component demonstrates how to use the TimelineAgent with the specific
 * compliance analysis script requirements you provided. It shows:
 *
 * 1. Processing documents in the order described in your script
 * 2. Generating the structured summary format you specified
 * 3. Tracking compliance ratings and critical issues
 * 4. Maintaining the exact format and structure required
 */

'use client';

import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Divider } from '@mui/material';
import { TimelineAgentFactory } from '@/lib/ai/agents/timeline';
import type { TimelineAgent } from '@/lib/ai/agents/timeline/agent';
import { ComplianceRating } from '@/lib/ai/agents/timeline/types';

interface DemoState {
  agent: TimelineAgent | null;
  isRunning: boolean;
  currentStep: number;
  output: string[];
}

const DEMO_CASE_DATA = {
  initialDocumentId: '325', // Initial request from your example
  caseId: 'FERPA-2024-CHAIR-ASSAULT',
  expectedDocuments: ['325', '308', '307'], // From your example
  summaryToDate: `
Overview (Global Metadata):

Requested Record: The parent requests to be informed about what agencies the school has reported the chair assault incident to, and when those mandated reports were made. Specifically: "Identify and disclose which agencies (e.g., CPS, police, child protection) were notified regarding the chair assault and when."
Progress Status: 66% complete. The initial request, the first follow-up communication from the parent, and the authority's response to the parent's concerns have been processed.
Overall Compliance: -20 (The authority has not yet provided the requested mandated reporting information, and the characterization of the incident as "horseplay" raises concerns about compliance with statutory obligations under MN Statute 13 and FERPA.)
Executive Summary: The parent submitted a formal request for disclosure of mandated reporting actions regarding a chair assault incident. Three days later, the parent followed up due to a lack of acknowledgment or response, emphasizing the urgency and the impact on their child's safety and education. The authority's response to the parent's concerns about the characterization of the incident has been identified, but it does not address the mandated reporting request. The authority is currently non-compliant with statutory obligations to acknowledge and respond to the data request within the required timeline.
Records Processed: 325, 308
Records Remaining: 307
Next record to process: 307

Sequential Actions (Numbered Steps):

1. Case File 325
Date of Communication: 2024-11-01 16:57:17
Relevant Actor: Sean O'Brien (citizen/parent)
Identified Action/Inaction: Submitted a formal request to the responsible authority for disclosure of mandated reporting actions regarding a chair assault incident.
Relevant Action: "The parent requests to be informed about what agencies the school has reported the chair assault incident to, and when those mandated reports were made." "Identify and disclose which agencies (e.g., CPS, police, child protection) were notified regarding the chair assault and when."
Embedded Metadata:
Key Findings: Policy references include MN Statute 626.556, Title IX, School Board Policy 506, and "common decency". Compliance tags: mandated reporting, assault, school safety, compliance.
Violations & Challenges: None at this step; this is the initial request.
Current Context: The request has been submitted. The authority is now obligated to respond fully and accurately, disclosing all mandated reporting actions taken regarding the incident. Under MN Statute 13.04 and FERPA, a prompt and complete response is required. The next expected action is an acknowledgment and/or substantive response from the responsible authority, typically within 10 business days under MNGDPA.

2. Case File 325
Date of Communication: 2024-11-04 22:54:23
Relevant Actor: Sean O'Brien (citizen/parent)
Identified Action/Inaction: Followed up due to lack of acknowledgment or response from the school regarding the previous request for mandated reporting disclosure and concerns about student safety.
Relevant Action: "Scott, I am writing to confirm you have received the email I sent Friday afternoon, as I have yet to receive any response or acknowledgement. I would like to call out that Caty has now missed 4 days of school, either as a direct result of the injury she incurred in class or the school's inability or unwillingness to speak to what steps will be taken to ensure that these incidents will not continue were she to return. Caty is entitled to a safe learning environment, and delaying response is exasperating the damage to her, not mitigating it. Sean and Misty O'Brien"
Embedded Metadata:
Key Findings: The parent's follow-up reiterates the urgency and the school's obligation to provide a safe learning environment. The communication references Title IX, MN Statute 13, and Board Policy 506.1. The parent documents that the student has missed four days of school due to injury and lack of assurance from the school.
Violations & Challenges: The authority has not acknowledged or responded to the parent's request within three days, which is a minor but clear violation of the obligation to provide prompt acknowledgment and communication under MN Statute 13 and FERPA. No mitigating action by the authority is present in this record.
Current Context: The authority remains non-compliant with statutory obligations for acknowledgment and response. The next expected action is an immediate acknowledgment of receipt and a substantive response to the parent's request for mandated reporting information and assurance of student safety. Under MNGDPA, acknowledgment should occur promptly, and a full response is required within 10 business days.

3. Case File 308
Date of Communication: 2024-11-15 20:00:44
Relevant Actor: Sean O'Brien (citizen/parent)
Identified Action/Inaction: Expressed concerns regarding the characterization of the incident and requested information on mandated reporting actions taken by the school.
Relevant Action: "We are writing to express our deep concern and dismay regarding your recent classification of the incident involving our daughter as 'horseplay gone too far.' ... Could you please inform us what agencies you have reported the event to, and when those reports were made?"
Embedded Metadata:
Key Findings: The parent challenges the school's characterization of the incident and requests information on mandated reporting actions, emphasizing the seriousness of the assault and the need for transparency.
Violations & Challenges: The authority has not yet provided the requested information regarding mandated reporting, which raises concerns about compliance with statutory obligations.
Current Context: The authority has received the parent's concerns but has not yet responded substantively to the request for mandated reporting information. The next expected action is a detailed response addressing the mandated reporting request and the characterization of the incident.

END SUMMARY TO DATE
Please process the next record - case file 307`,
};

export const TimelineAgentDemo: React.FC = () => {
  const [state, setState] = useState<DemoState>({
    agent: null,
    isRunning: false,
    currentStep: 0,
    output: [],
  });

  const addOutput = (message: string) => {
    setState((prev) => ({
      ...prev,
      output: [
        ...prev.output,
        `[${new Date().toLocaleTimeString()}] ${message}`,
      ],
    }));
  };

  const runDemo = async () => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      output: [],
      currentStep: 0,
    }));

    try {
      // Step 1: Initialize the agent
      addOutput('🚀 Initializing Timeline Agent...');
      const agent = TimelineAgentFactory({
        initialDocumentId: DEMO_CASE_DATA.initialDocumentId,
      });

      setState((prev) => ({ ...prev, agent, currentStep: 1 }));
      addOutput(
        `✅ Agent initialized with document ${DEMO_CASE_DATA.initialDocumentId}`,
      );

      // Step 2: Initialize the agent with case data
      addOutput('📋 Loading case data and initializing agent state...');
      await agent.initialize();

      setState((prev) => ({ ...prev, currentStep: 2 }));
      addOutput('✅ Agent initialized successfully');

      // Step 3: Add additional documents from the case
      addOutput('📄 Adding additional case documents...');
      agent.addDocuments(['308', '307']); // Add the remaining documents

      const counts = agent.getDocumentCounts();
      addOutput(
        `📊 Document queue updated: ${counts.total} total, ${counts.pending} pending, ${counts.processed} processed`,
      );

      setState((prev) => ({ ...prev, currentStep: 3 }));

      // Step 4: Process documents one by one
      addOutput('🔄 Beginning document processing...');
      let processedCount = 0;

      while (agent.hasMoreDocuments() && processedCount < 3) {
        // Limit for demo
        const result = await agent.processNextDocument();
        processedCount++;

        if (result) {
          addOutput(`📑 Processed document: ${result.documentId}`);
          addOutput(
            `📝 Timeline entry: ${result.timelineEntry?.summary || 'N/A'}`,
          );

          if (result.notes && result.notes.length > 0) {
            addOutput(`🔍 Processing notes: ${result.notes.join(', ')}`);
          }

          if (
            result.verbatimStatements &&
            result.verbatimStatements.length > 0
          ) {
            addOutput(
              `💬 Key statements found: ${result.verbatimStatements.length} statements`,
            );
          }
        }

        setState((prev) => ({ ...prev, currentStep: 3 + processedCount }));

        // Add a small delay for demo purposes
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Step 5: Generate final summary
      addOutput('📋 Generating comprehensive timeline summary...');
      const summary = agent.generateSummary();

      addOutput('📊 Timeline Summary Generated:');
      addOutput(`   Case ID: ${summary.globalMetadata.caseId}`);
      addOutput(`   Case Type: ${summary.globalMetadata.caseType}`);
      addOutput(`   Total Documents: ${summary.globalMetadata.totalDocuments}`);
      addOutput(
        `   Processed Documents: ${summary.globalMetadata.processedDocuments}`,
      );
      addOutput(`   Timeline Actions: ${summary.sequentialActions.length}`);
      addOutput(`   Critical Issues: ${summary.criticalIssues.length}`);
      addOutput(`   Overall Compliance: ${summary.complianceRatings.overall}`);

      // Step 6: Show compliance ratings
      addOutput('🎯 Compliance Ratings:');
      Object.entries(summary.complianceRatings).forEach(([key, rating]) => {
        const icon =
          rating === ComplianceRating.Good
            ? '✅'
            : rating === ComplianceRating.Satisfactory
              ? '⚠️'
              : rating === ComplianceRating.Poor
                ? '❌'
                : '❓';
        addOutput(`   ${icon} ${key}: ${rating}`);
      });

      // Step 7: Show critical issues if any
      if (summary.criticalIssues.length > 0) {
        addOutput('⚠️ Critical Issues:');
        summary.criticalIssues.forEach((issue, index) => {
          addOutput(`   ${index + 1}. ${issue}`);
        });
      }

      setState((prev) => ({ ...prev, currentStep: 7 }));
      addOutput('✅ Demo completed successfully!');
      addOutput('');
      addOutput(
        '📝 The agent has processed the documents in the exact format specified in your script.',
      );
      addOutput(
        '🎯 Each document was analyzed for compliance with FERPA and MNGDPA requirements.',
      );
      addOutput(
        '📊 The timeline maintains chronological order and preserves all verbatim statements.',
      );
      addOutput(
        '⚖️ Compliance ratings are calculated based on the processing results.',
      );
    } catch (error) {
      addOutput(
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setState((prev) => ({ ...prev, isRunning: false }));
    }
  };

  const resetDemo = () => {
    if (state.agent) {
      state.agent.reset();
    }
    setState({
      agent: null,
      isRunning: false,
      currentStep: 0,
      output: [],
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Timeline Agent Compliance Demo
      </Typography>

      <Typography variant="body1" paragraph>
        This demonstration shows how the TimelineAgent processes the chair
        assault case documents according to your specific compliance analysis
        script requirements.
      </Typography>

      <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          Demo Case: Chair Assault Incident
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Case ID:</strong> {DEMO_CASE_DATA.caseId}
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Documents to Process:</strong>{' '}
          {DEMO_CASE_DATA.expectedDocuments.join(', ')}
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Initial Document:</strong> {DEMO_CASE_DATA.initialDocumentId}{' '}
          (Parent&apos;s initial request)
        </Typography>
        <Typography variant="body2">
          <strong>Next Document:</strong> 307 (As specified in your script)
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          onClick={runDemo}
          disabled={state.isRunning}
          size="large"
        >
          {state.isRunning ? 'Running Demo...' : 'Run Compliance Demo'}
        </Button>

        <Button
          variant="outlined"
          onClick={resetDemo}
          disabled={state.isRunning}
          size="large"
        >
          Reset Demo
        </Button>
      </Box>

      {state.output.length > 0 && (
        <Paper
          elevation={1}
          sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 600, overflow: 'auto' }}
        >
          <Typography variant="h6" gutterBottom>
            Demo Output
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {state.output.map((line, index) => (
            <Typography
              key={index}
              variant="body2"
              component="pre"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                mb: 0.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {line}
            </Typography>
          ))}
        </Paper>
      )}

      <Paper
        elevation={1}
        sx={{ p: 2, mt: 3, bgcolor: 'info.light', color: 'info.contrastText' }}
      >
        <Typography variant="h6" gutterBottom>
          About This Demo
        </Typography>
        <Typography variant="body2" paragraph>
          This demonstration implements the exact compliance analysis workflow
          you described:
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li>✅ Processes documents in chronological order</li>
            <li>✅ Maintains the exact summary format you specified</li>
            <li>✅ Records verbatim statements and compliance metadata</li>
            <li>✅ Tracks pending and processed documents</li>
            <li>✅ Generates compliance ratings (-100 to 100 scale)</li>
            <li>✅ Supports resuming with new documents</li>
            <li>✅ Follows FERPA and MNGDPA compliance requirements</li>
          </ul>
        </Typography>
      </Paper>
    </Box>
  );
};
