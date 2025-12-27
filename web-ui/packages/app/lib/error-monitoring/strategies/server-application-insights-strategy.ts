import { log, safeSerialize } from '@compliance-theater/logger';
import { ErrorReport, ErrorReportResult } from '../types';
import { ReportActionStrategy } from './report-action-strategy';

export class ServerApplicationInsightsStrategy implements ReportActionStrategy {
  async execute(report: ErrorReport): Promise<Partial<ErrorReportResult>> {
    try {
      // Dynamic import so code doesn't hard-depend on OpenTelemetry at runtime
      const otel = (await import(
        '@opentelemetry/api'
      )) satisfies typeof import('@opentelemetry/api');
      const { trace, context, SpanStatusCode } = otel;

      const activeSpan = trace.getSpan(context.active());
      // Build safe attributes: ensure values are primitive (strings)
      const safeAttributes: Record<string, string> = {
        'error.fingerprint': report.fingerprint ?? '',
        ...(report.tags ?? {}),
        severity: String(report.severity),
        context: safeSerialize(JSON.stringify(report.context || {})),
      };

      // If there is an active and still-recording span, attach the error there.
      // Span.isRecording() is the official guard to know if the span can accept events/attributes.
      if (
        activeSpan &&
        typeof (activeSpan as { isRecording: () => boolean }).isRecording ===
          'function' &&
        (activeSpan as { isRecording: () => boolean }).isRecording()
      ) {
        try {
          activeSpan.setAttributes(safeAttributes);
        } catch {
          // ignore attribute errors
        }
        activeSpan.recordException(report.error);
        activeSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: report.error.message,
        });
        activeSpan.addEvent('error.reported', {
          context: safeAttributes.context,
        } satisfies import('@opentelemetry/api').Attributes);
        return { reported: true };
      }

      // If there was an active span but it has ended (or no active span), create a new
      // short-lived span that is linked to the original span context so the error stays
      // correlated to the same trace.
      const tracer = trace.getTracer('noeducation/error-reporter');
      const links = activeSpan
        ? [{ context: activeSpan.spanContext() }]
        : undefined;
      const span = tracer.startSpan('error.report', {
        attributes: safeAttributes,
        links,
      });
      try {
        span.recordException(report.error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: report.error.message,
        });
        span.addEvent('error.reported', {
          context: safeAttributes.context,
        });
      } finally {
        span.end();
      }
      return { reported: true };
    } catch (err) {
      log((l) => l.warn('OpenTelemetry error reporting failed', err));
      return { reported: false };
    }
  }
}
