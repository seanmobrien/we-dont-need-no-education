package com.obapps.schoolchatbot.assistants.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.obapps.schoolchatbot.core.assistants.content.DocumentWithMetadataContent;
import com.obapps.schoolchatbot.core.assistants.services.AzurePolicySearchClient;
import com.obapps.schoolchatbot.core.assistants.services.AzurePolicySearchClient.ScopeType;
import com.obapps.schoolchatbot.core.assistants.services.IStandaloneModelClient;
import com.obapps.schoolchatbot.core.assistants.services.JustInTimePolicyLookup;
import com.obapps.schoolchatbot.core.assistants.services.PolicyChunkFilter;
import com.obapps.schoolchatbot.core.assistants.types.IDocumentContentSource;
import com.obapps.schoolchatbot.core.models.DocumentWithMetadata;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JustInTimePolicyLookupTests {

  private AzurePolicySearchClient mockSearchClient;
  private IStandaloneModelClient mockSummarizer;
  private PolicyChunkFilter mockChunkFilter;
  private JustInTimePolicyLookup policyLookup;
  private IDocumentContentSource mockContentSource;

  @BeforeEach
  void setUp() {
    mockContentSource = mock(IDocumentContentSource.class);

    mockSearchClient = mock(AzurePolicySearchClient.class);
    mockSummarizer = mock(IStandaloneModelClient.class);
    mockChunkFilter = mock(PolicyChunkFilter.class);
    policyLookup = new JustInTimePolicyLookup(
      mockContentSource,
      mockSearchClient,
      mockSummarizer,
      mockChunkFilter
    );
    realTestsEnabled = false;
  }

  private Boolean realTestsEnabled = false;

  @Test
  void runRealQuery() {
    if (!realTestsEnabled) {
      System.out.println("Real tests are disabled. Skipping test.");
      return;
    }
    var docContent = mock(DocumentWithMetadataContent.class);
    when(docContent.getObject()).thenReturn(
      DocumentWithMetadata.builder()
        .setContent(
          "Scott, We are writing to express our deep concern and dismay regarding your recent classification of the incident involving our daughter as “horseplay gone too far.” As you are — or should be — aware, Caty was struck on the head with a chair five times over 2 separate occurrences by Reyna?, resulting in a concussion. Your characterization implies that our daughter was voluntarily engaged in rough play before the attack, which she strongly denies. It is troubling that this interpretation seems to downplay the severity of the situation and misrepresents our daughter's experience.  Furthermore, we find it concerning that you made this determination before interviewing our daughter about the incident. It raises questions about how such a serious event could be assessed as such without directly hearing from the victim. It is hard enough to understand how such a violent incident could occur suddenly in a classroom during class time with a teacher present. The fact that there was an opportunity for the teacher to intervene or deescalate what is described as “horseplay” before the assault occurred is even more concerning.  When also taking into account the fact that no one else in the classroom recognized this action as something that warranted immediate attention from staff, it all points to significant issues regarding supervision and student safety. Since learning of this incident, every professional we have consulted with has advised us to contact the police.  The description of the event we have heard most often is 'felony assault' or \"felony aggravated assault\".  As a mandated reporter, we find it surprising that you did not identify it as such. Could you please inform us what agencies you have reported the event to, and when those reports were made?  We would also appreciate it if you could share the evidence you have gathered that led you to believe that Caty was involved in any form of consensual rough play before the event occurred. It is good to hear that Reyna's parents are \"taking this very seriously\"; however, review of Prior Lake’s published disciplinary policy <https://www.plsas.org/uploaded/School_Board/Policies/500/506_-_Student_Discipline.pdf> points towards multiple blows to the head with a chair that result in a concussion as falling under actions that \"cause or could cause injury\" or \"assaultive behavior\".  These are addressed in that policy as follows: Removal from Class: The student may be immediately removed from class if they engage in violent or assaultive behavior, which endangers others' safety, Suspension, Expulsion, or Exclusion: Depending on the severity (especially since a concussion is a serious injury) an out-of-school suspension, expulsion, or exclusion may (in our opinion) be warranted. Referral to Law Enforcement: Given the gravity of the incident, a referral to law enforcement might also be pursued in addition to school disciplinary actions. Behavioral Readmission Plan: Should the student be readmitted, they might be required to follow a behavioral plan, which could include counseling, mental health services, or other supportive interventions aimed at preventing recurrence Which of these actions will be or have been taken? It seemed unlikely — both to us and to the PHP assessor Caty met with today — that something this severe would be the first act of bullying against her that this peer group has engaged in. While speaking with that assessor, Caty spoke to several concerning incidents from various peers that predate the assault. She has been hit and kicked repeatedly, including incidents where she has been intentionally hit on the head since the concussion occurred. She has numerous bruises on her legs that support her account of this being an ongoing and systemic issue. While we acknowledge that her recent behavior of self-harm could play a factor, neither ourselves nor the PHP assessor we met with saw these bruises fitting her pattern of cutting and do not believe they were self-inflicted. We have since found chat messages sent by Caty indicating she was terrified to tell anyone about the chair incident because she feared retaliation from the girl’s friends, to the point of stating she was afraid they would \"break every bone in my body\". In addition to the ongoing physical abuse, Caty disclosed that one of her peers - named Scarlett - has been sexually assaulting her in school on an almost daily basis.  That abuse began about 2 months ago.  It includes unwanted touching of her breasts and genitals, at times while being held up against a wall and unable to break free.  This has been accompanied with physical and verbal abuse, with a number of her peers calling her a “gay bitch”.  We find it unacceptable that these types of homophobic slurs seem to go unnoticed and unrebuked at Hidden Oaks.  We are astounded that what otherwise would be a serious issue to address is at this point the least of our concerns.  It is not at all lost on us that this abuse started just a few weeks at most before the drastic shift in Caty’s behavior - including the introduction and rapid escalation of self harm - occurred.  It is worth noting that her PHP assessor - also a mandated reporter - has already contacted CPS regarding Scarlett’s actions, and our understanding is that the case has been referred to the police. It is our expectation that our daughter has a safe environment in which she can learn.  At this point, our confidence that this has been occurring at Hidden Oaks, or that any of the remediations taken to date are likely to lead to it occuring in the future, is effectively zero.  She has been referred to a partial hospitalization program, and will be starting Thursday, Nov 7th .  It is imperative that she have a safe place to process the trauma she has incurred these last few months, and we hope that this can help provide that for her. The impact this has - and will continue to have - on Caty’s educational opportunities - is unacceptable to us.  We would like to understand what concrete steps the school will be taking to ensure Caty’s safety in between now and the start of her PHP program.  We would also like to understand what support the school will be offering to ensure Caty can successfully reintegrate into Hidden when the time comes.  Caty is very concerned about the lost time impacting her placement in AP English, or that the missed time will impact her ability to keep up when she returns.  To be blunt, we view her upcoming absence as a direct result of what in the best light appears to be gross negligence by the staff, policies, and procedures in place at Hidden Oaks, and want to understand what steps the school will be taking to ensure any further impact is minimized and mitigated. We look forward to your prompt response to these pressing concerns. Sean and Misty O'Brien"
        )
        .setSubject("Subject")
        .setSender("This is a subject")
        .setSender("someone@hotmail.com")
        .setDocumentSendDate(LocalDateTime.now())
        .setEmailId(UUID.randomUUID())
        .setSender("Sener Name")
        .setEmailId(UUID.randomUUID())
        .setDocumentId(1)
        .build()
    );
    when(mockContentSource.getSourceDocument()).thenReturn(docContent);

    policyLookup = new JustInTimePolicyLookup(mockContentSource);

    String query = "Title IX";

    String result = policyLookup.summarizePolicy(query, ScopeType.All);

    System.out.println(result);
  }

  @Test
  void testSummarizePolicy() {
    String query = "Test policy query";
    AzurePolicySearchClient.ScopeType policyType =
      AzurePolicySearchClient.ScopeType.SchoolBoard;
    List<String> mockChunks = Arrays.asList(
      "Policy Chunk 1",
      "Policy Chunk 2",
      "Policy Chunk 3"
    );
    List<String> mockFilteredChunks = Arrays.asList(
      "Policy Chunk 1",
      "Policy Chunk 2"
    );
    String mockSummary =
      """
      🔍 Result [1]
      Policy Chunk 1

      🔍 Result [2]
      Policy Chunk 2

      🔍 Result [3]
      Policy Chunk 3

      """;

    when(mockSearchClient.hybridSearch(eq(query), eq(10), any())).thenReturn(
      mockChunks
    );
    when(mockChunkFilter.filterTopN(mockChunks, 5)).thenReturn(
      mockFilteredChunks
    );
    when(mockSummarizer.call(anyString())).thenReturn(mockSummary);

    String result = policyLookup.summarizePolicy(query, policyType);

    assertEquals(mockSummary, result);
    verify(mockSearchClient).hybridSearch(eq(query), eq(10), any());
    // verify(mockSummarizer).call(anyString());
  }
}
