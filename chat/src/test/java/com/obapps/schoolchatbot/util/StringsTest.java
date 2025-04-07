package com.obapps.schoolchatbot.util;

import static org.assertj.core.api.Assertions.assertThat;

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
}
