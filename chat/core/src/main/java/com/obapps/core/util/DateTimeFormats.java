package com.obapps.core.util;

import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public class DateTimeFormats {

  public static LocalDate asLocalDate(String date) {
    return LocalDate.parse(date, localDate);
  }

  public static LocalDateTime asLocalDateTime(String date) {
    return LocalDateTime.parse(date, localTime);
  }

  public static OffsetDateTime asOffsetDateTime(String date) {
    return OffsetDateTime.parse(date, localTimeWithZone);
  }

  public static Date asDate(String date) {
    return Date.valueOf(date);
  }

  public static final DateTimeFormatter localDate = DateTimeFormatter.ofPattern(
    "yyyy-MM-dd"
  );
  public static final DateTimeFormatter localTime = DateTimeFormatter.ofPattern(
    "yyyy-MM-dd HH:mm:ss.SSSSS"
  );
  public static final ZoneId zoneId = java.time.ZoneOffset.UTC;
  public static final DateTimeFormatter localDateWithZone = localDate.withZone(
    zoneId
  );
  public static final DateTimeFormatter localTimeWithZone = localTime.withZone(
    zoneId
  );
}
