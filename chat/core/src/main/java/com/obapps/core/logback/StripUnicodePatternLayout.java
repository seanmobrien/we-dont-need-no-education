package com.obapps.core.logback;

import ch.qos.logback.classic.PatternLayout;
import ch.qos.logback.classic.spi.ILoggingEvent;

public class StripUnicodePatternLayout extends PatternLayout {

  @Override
  public String doLayout(ILoggingEvent event) {
    var layout = super.doLayout(event);
    return layout.replaceAll("\\P{ASCII}", "X");
  }
}
