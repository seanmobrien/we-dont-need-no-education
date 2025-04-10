package com.obapps.schoolchatbot.assistants.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.langchain4j.model.chat.ChatLanguageModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class StandaloneModelClientFactoryTest {

  private StandaloneModelClientFactory factory;

  @BeforeEach
  public void setUp() {
    factory = new StandaloneModelClientFactory();
  }

  @Test
  public void testCreate_withHiFiModelType() {
    IStandaloneModelClient client = factory.create(
      StandaloneModelClientFactory.ModelType.HiFi
    );
    assertThat(client.getModel()).isInstanceOf(ChatLanguageModel.class);
    assertThat(client).isNotNull();
  }

  @Test
  public void testCreate_withLoFiModelType() {
    IStandaloneModelClient client = factory.create(
      StandaloneModelClientFactory.ModelType.LoFi
    );
    assertThat(client).isNotNull();
    assertThat(client.getModel()).isInstanceOf(ChatLanguageModel.class);
  }

  @Test
  public void testCreate_withEmbeddingModelType() {
    IStandaloneModelClient client = factory.create(
      StandaloneModelClientFactory.ModelType.Embedding
    );
    assertThat(client).isNotNull();
    assertThat(client.getModel()).isInstanceOf(ChatLanguageModel.class);
  }

  @Test
  public void testCreate_withUnknownModelType() {
    assertThatThrownBy(() ->
      factory.create(StandaloneModelClientFactory.ModelType.Unknown)
    )
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("Unsupported model type: Unknown");
  }
}
