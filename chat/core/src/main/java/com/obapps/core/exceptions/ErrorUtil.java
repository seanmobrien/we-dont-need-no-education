package com.obapps.core.exceptions;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ErrorUtil {

  private static final Logger fallbackLog = LoggerFactory.getLogger(
    ErrorUtil.class
  );

  public static void handleException(Exception e) {
    handleException(fallbackLog, e, null);
  }

  public static void handleException(Logger log, Exception e) {
    handleException(log, e, null);
  }

  public static void handleException(
    Logger log,
    Exception e,
    String message,
    Object... args
  ) {
    var errorMessage = message == null
      ? "An error occurred:"
      : String.format(message, args);
    if (errorMessage.trim().endsWith(":")) {
      errorMessage = errorMessage + " " + e.getMessage();
    }

    // Log the exception
    log.error(errorMessage, e);
    // Set the status of the current span to error
    Span span = Span.current();
    if (span != null) {
      span.setStatus(StatusCode.ERROR, errorMessage);
      span.recordException(e);
    }
  }
}
