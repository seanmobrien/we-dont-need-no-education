package com.obapps.schoolchatbot.data;

import java.util.function.Function;

/**
 * The {@code Colors} class provides ANSI escape codes for text formatting and coloring in the console.
 *
 * <p>Key Features:</p>
 * <ul>
 *   <li>Provides constants for text colors, background colors, and text styles.</li>
 *   <li>Includes utility methods for applying and resetting colors.</li>
 * </ul>
 *
 * <p>Example usage:</p>
 * <pre>
 * {@code
 * Colors.Set(c -> c.RED + "This is red text" + c.RESET);
 * Colors.Reset();
 * }
 * </pre>
 *
 * <p>Thread Safety:</p>
 * <p>This class is thread-safe as it only contains static methods and constants.</p>
 */
public class Colors {

  public final String RESET = "\u001B[0m";
  public final String BLACK = "\u001B[30m";
  public final String RED = "\u001B[31m";
  public final String GREEN = "\u001B[32m";
  public final String YELLOW = "\u001B[33m";
  public final String BLUE = "\u001B[34m";
  public final String PURPLE = "\u001B[35m";
  public final String CYAN = "\u001B[36m";
  public final String WHITE = "\u001B[37m";

  public final String BOLD = "\u001b[1m";
  public final String UNDERLINE = "\u001b[4m";
  public final String ITALIC = "\u001b[3m";
  public final String STRIKETHROUGH = "\u001b[9m";
  public final String REVERSED = "\u001b[7m";
  public final String BLINK = "\u001b[5m";
  public final String INVERT = "\u001b[7m";
  public final String HIDDEN = "\u001b[8m";
  public final String CROSSOUT = "\u001b[9m";
  public final String FRAMED = "\u001b[51m";
  public final String ENCIRCLED = "\u001b[52m";
  public final String OVERLINED = "\u001b[53m";
  public final String CONCEALED = "\u001b[54m";
  public final String BRIGHT = "\u001B[1m";
  public final String DIM = "\u001B[2m";

  public final String BLACK_BACKGROUND = "\u001B[40m";
  public final String RED_BACKGROUND = "\u001B[41m";
  public final String GREEN_BACKGROUND = "\u001B[42m";
  public final String YELLOW_BACKGROUND = "\u001B[43m";
  public final String BLUE_BACKGROUND = "\u001B[44m";
  public final String PURPLE_BACKGROUND = "\u001B[45m";
  public final String CYAN_BACKGROUND = "\u001B[46m";
  public final String WHITE_BACKGROUND = "\u001B[47m";

  private Colors() {}

  public static void Set(Function<Colors, String> color) {
    System.out.print(color.apply(getInstance()));
  }

  public static void Reset() {
    System.out.print(getInstance().RESET);
  }

  public static Colors getInstance() {
    return new Colors();
  }
}
