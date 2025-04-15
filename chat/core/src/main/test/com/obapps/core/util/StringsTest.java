package com.obapps.schoolchatbot.util;

import static org.assertj.core.api.Assertions.assertThat;

import com.obapps.core.util.*;
import java.util.List;
import org.junit.jupiter.api.Test;

public class StringsTest {

  @Test
  public void testCommasToList_withValidCommaSeparatedString() {
    String input = "apple, banana, cherry";
    List<String> result = Strings.commasToList(input);
    assertThat(result).containsExactly("apple", "banana", "cherry");
  }

  @Test
  public void testCommasToList_withEmptyString() {
    String input = "";
    List<String> result = Strings.commasToList(input);
    assertThat(result).isEmpty();
  }

  @Test
  public void testCommasToList_withNullInput() {
    String input = null;
    List<String> result = Strings.commasToList(input);
    assertThat(result).isEmpty();
  }

  @Test
  public void testCommasToList_withWhitespaceOnlyElements() {
    String input = "  ,   , ";
    List<String> result = Strings.commasToList(input);
    assertThat(result).isEmpty();
  }

  @Test
  public void testCommasToList_withQuotedElements() {
    String input = "\"apple\", \" banana \", \"cherry\"";
    List<String> result = Strings.commasToList(input);
    assertThat(result).containsExactly("apple", "banana", "cherry");
  }

  @Test
  public void testCommasToList_withMixedQuotedAndUnquotedElements() {
    String input = "apple, \" banana \", cherry";
    List<String> result = Strings.commasToList(input);
    assertThat(result).containsExactly("apple", "banana", "cherry");
  }

  @Test
  public void testCommasToList_withTrailingAndLeadingCommas() {
    String input = ",apple, banana, cherry,";
    List<String> result = Strings.commasToList(input);
    assertThat(result).containsExactly("apple", "banana", "cherry");
  }

  @Test
  public void testCommasToList_withEmptyAndNonEmptyElements() {
    String input = "apple, , banana, , cherry";
    List<String> result = Strings.commasToList(input);
    assertThat(result).containsExactly("apple", "banana", "cherry");
  }

  @Test
  public void testSnakeToCamelCase_withValidSnakeCase() {
    String input = "this_is_a_test";
    String result = Strings.snakeToCamelCase(input);
    assertThat(result).isEqualTo("thisIsATest");
  }

  @Test
  public void testSnakeToCamelCase_withSingleWord() {
    String input = "test";
    String result = Strings.snakeToCamelCase(input);
    assertThat(result).isEqualTo("test");
  }

  @Test
  public void testSnakeToCamelCase_withEmptyString() {
    String input = "";
    String result = Strings.snakeToCamelCase(input);
    assertThat(result).isEqualTo("");
  }

  @Test
  public void testSnakeToCamelCase_withNullInput() {
    String input = null;
    String result = Strings.snakeToCamelCase(input);
    assertThat(result).isEqualTo("");
  }

  @Test
  public void testSnakeToCamelCase_withLeadingAndTrailingUnderscores() {
    String input = "_this_is_a_test_";
    String result = Strings.snakeToCamelCase(input);
    assertThat(result).isEqualTo("thisIsATest");
  }

  @Test
  public void testSnakeToCamelCase_withConsecutiveUnderscores() {
    String input = "this__is___a_test";
    String result = Strings.snakeToCamelCase(input);
    assertThat(result).isEqualTo("thisIsATest");
  }

  @Test
  public void testSnakeToCamelCase_withUppercaseLetters() {
    String input = "THIS_IS_A_TEST";
    String result = Strings.snakeToCamelCase(input);
    assertThat(result).isEqualTo("thisIsATest");
  }

  @Test
  public void testSnakeToCamelCase_withMixedCaseLetters() {
    String input = "ThIs_Is_A_tEsT";
    String result = Strings.snakeToCamelCase(input);
    assertThat(result).isEqualTo("thisIsATest");
  }

  @Test
  public void testFormatForMultipleLines_withValidInput() {
    String input = "This is a test string for formatting into multiple lines.";
    List<String> result = Strings.formatForMultipleLines(10, input);
    assertThat(result).containsExactly(
      "This is a",
      "test",
      "string for",
      "formatting",
      "into",
      "multiple",
      "lines."
    );
  }

  @Test
  public void testFormatForMultipleLines_withExactWidthWords() {
    String input = "12345 67890 abcde";
    List<String> result = Strings.formatForMultipleLines(5, input);
    assertThat(result).containsExactly("12345", "67890", "abcde");
  }

  @Test
  public void testFormatForMultipleLines_withSingleWordExceedingWidth() {
    String input = "supercalifragilisticexpialidocious";
    List<String> result = Strings.formatForMultipleLines(10, input);
    assertThat(result).containsExactly("supercalifragilisticexpialidocious");
  }

  @Test
  public void testFormatForMultipleLines_withEmptyString() {
    String input = "";
    List<String> result = Strings.formatForMultipleLines(10, input);
    assertThat(result).isEmpty();
  }

  @Test
  public void testFormatForMultipleLines_withNullInput() {
    String input = null;
    List<String> result = Strings.formatForMultipleLines(10, input);
    assertThat(result).isEmpty();
  }

  @Test
  public void testFormatForMultipleLines_withWhitespaceOnly() {
    String input = "     ";
    List<String> result = Strings.formatForMultipleLines(10, input);
    assertThat(result).isEmpty();
  }

  @Test
  public void testFormatForMultipleLines_withWidthGreaterThanInputLength() {
    String input = "short";
    List<String> result = Strings.formatForMultipleLines(10, input);
    assertThat(result).containsExactly("short");
  }

  @Test
  public void testFormatForMultipleLines_withWordsFittingExactlyInWidth() {
    String input = "123 456 789";
    List<String> result = Strings.formatForMultipleLines(3, input);
    assertThat(result).containsExactly("123", "456", "789");
  }

  @Test
  public void testFormatForMultipleLines_withTrailingSpaces() {
    String input = "This is a test string   ";
    List<String> result = Strings.formatForMultipleLines(10, input);
    assertThat(result).containsExactly("This is a", "test", "string");
  }
}
