import assistants.KeyPointAnalysis;
import java.util.Scanner;

public class SchoolChatBot {

  private SchoolChatBot() {}

  public static void main(String[] args) {
    Scanner scanner = new Scanner(System.in);
    Boolean isDone = false;

    while (!isDone) {
      System.out.println("Welcome to the School Chat Bot!");
      System.out.println("Please select an option:");
      System.out.println("1. Analyze Emails and Documents");
      System.out.println("2. Exit");

      int choice = scanner.nextInt();

      switch (choice) {
        case 1:
          KeyPointAnalysis.run(args);
          break;
        case 2:
          isDone = true;
          break;
        default:
          System.out.println("Invalid choice. Please try again.");
      }
    }

    scanner.close();
  }
}
