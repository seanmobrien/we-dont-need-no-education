package com.obapps.schoolchatbot.core.models;

public class DocumentPropertyType {

  public static class KnownValues {

    public static Integer KeyPoint = 9;
    public static Integer From = 1;
    public static final Integer CallToAction = 4;
    public static final Integer CallToActionResponse = 5;
    public static final Integer ComplianceScore = 6;
    public static final Integer Violation = 7;
    public static final Integer SentimentAnalysis = 8;
    public static final Integer References = 22;
    public static final Integer InReplyTo = 26;
    public static final Integer Subject = 31;
    public static final Integer ProcessingNote = 102;
    public static final Integer ManualReviewRequest = 1000;
  }

  public static class KnownDescriptions {

    public static String KeyPoint = "Key Point";
    public static String From = "From";
    public static String CallToAction = "Call to Action";
    public static String CallToActionResponse = "Call to Action Response";
    public static String ComplianceScore = "Compliance Score";
    public static String Violation = "Violation";
    public static String SentimentAnalysis = "Sentiment Analysis";
    public static String References = "References";
    public static String InReplyTo = "In Reply To";
    public static String Subject = "Subject";
    public static String ProcessingNote = "Processing Note";
    public static String ManualReviewRequest = "Manual Review Request";
  }
}
