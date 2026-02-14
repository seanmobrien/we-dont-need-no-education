import { log, safeSerialize } from '@compliance-theater/logger';
export class ServerApplicationInsightsStrategy {
    async execute(report) {
        try {
            const otel = (await import('@opentelemetry/api'));
            const { trace, context, SpanStatusCode } = otel;
            const activeSpan = trace.getSpan(context.active());
            const safeAttributes = {
                'error.fingerprint': report.fingerprint ?? '',
                ...(report.tags ?? {}),
                severity: String(report.severity),
                context: safeSerialize(JSON.stringify(report.context || {})),
            };
            if (activeSpan &&
                typeof activeSpan.isRecording ===
                    'function' &&
                activeSpan.isRecording()) {
                try {
                    activeSpan.setAttributes(safeAttributes);
                }
                catch {
                }
                activeSpan.recordException(report.error);
                activeSpan.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: report.error.message,
                });
                activeSpan.addEvent('error.reported', {
                    context: safeAttributes.context,
                });
                return { reported: true };
            }
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
            }
            finally {
                span.end();
            }
            return { reported: true };
        }
        catch (err) {
            log((l) => l.warn('OpenTelemetry error reporting failed', err));
            return { reported: false };
        }
    }
}
//# sourceMappingURL=server-application-insights-strategy.js.map