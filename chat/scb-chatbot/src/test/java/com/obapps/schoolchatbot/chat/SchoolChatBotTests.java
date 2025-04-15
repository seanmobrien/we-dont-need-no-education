/*
 * Copyright 2015-2025 the original author or authors.
 *
 * All rights reserved. This program and the accompanying materials are
 * made available under the terms of the Eclipse Public License v2.0 which
 * accompanies this distribution and is available at
 *
 * https://www.eclipse.org/legal/epl-v20.html
 */

package com.obapps.schoolchatbot.chat;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SchoolChatBotTests {

  @Test
  @DisplayName("1 + 1 = 2")
  void canRunTests() {
    var actual = SchoolChatBot.hello();
    assertEquals("world!", actual, "Hello world! should be 'world!'");
  }
}
