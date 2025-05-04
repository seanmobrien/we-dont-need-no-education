package com.obapps.schoolchatbot.core.models.embed;

import com.obapps.schoolchatbot.core.models.DocumentUnit;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import java.util.ArrayList;

public class DocumentUnitEmbeddedProps {

  public DocumentUnit document;
  public String embeddingModel;
  public float[] vector;
  public ArrayList<Embedding> embeddings;
  public ArrayList<TextSegment> segments;
}
