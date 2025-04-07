package com.obapps.schoolchatbot.assistants.services;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

public class PolicyChunkFilter {

  public List<String> filterTopPolicyChunks(List<String> chunks, int max) {
    return chunks
      .stream()
      .sorted(Comparator.comparingInt(PolicyChunkFilter::scoreChunk).reversed())
      .limit(max)
      .collect(Collectors.toList());
  }

  private static int scoreChunk(String chunk) {
    int score = 0;

    // Look for hard policy markers
    if (chunk.matches("(?i).*\\bshall\\b.*")) score += 3;
    if (chunk.matches("(?i).*\\bmust\\b.*")) score += 3;
    if (chunk.matches("(?i).*\\brequired\\b.*")) score += 3;

    // Look for dates or deadlines
    if (
      chunk.matches(
        "(?i).*\\bwithin \\d+ (days|school days|calendar days)\\b.*"
      )
    ) score += 4;

    // Look for actors
    if (chunk.contains("Title IX")) score += 2;
    if (chunk.contains("coordinator")) score += 1;
    if (chunk.contains("superintendent")) score += 1;

    return score;
  }
}
