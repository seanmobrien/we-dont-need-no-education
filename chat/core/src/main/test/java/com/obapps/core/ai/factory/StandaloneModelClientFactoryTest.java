package com.obapps.core.ai.factory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.obapps.core.ai.factory.models.ModelType;
import com.obapps.core.ai.factory.services.StandaloneModelClientFactory;
import com.obapps.core.ai.factory.types.IStandaloneModelClient;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
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
    IStandaloneModelClient client = factory.create(ModelType.HiFi);
    assertThat(client.getModel()).isInstanceOf(ChatModel.class);
    assertThat(client).isNotNull();
  }

  @Test
  public void testCreate_withLoFiModelType() {
    IStandaloneModelClient client = factory.create(ModelType.LoFi);
    assertThat(client).isNotNull();
    assertThat(client.getModel()).isInstanceOf(ChatModel.class);
  }

  @Test
  public void testCreate_withEmbeddingModelType() {
    EmbeddingModel client = factory.createEmbeddingModel();
    assertThat(client).isNotNull();
    assertThat(client).isInstanceOf(EmbeddingModel.class);
  }

  @Test
  public void testCreate_withUnknownModelType() {
    assertThatThrownBy(() -> factory.create(ModelType.Unknown))
      .isInstanceOf(IllegalArgumentException.class)
      .hasMessageContaining("Unsupported model type: Unknown");
  }
}
