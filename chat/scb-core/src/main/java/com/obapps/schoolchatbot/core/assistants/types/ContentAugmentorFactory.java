package com.obapps.schoolchatbot.core.assistants.types;

import com.obapps.schoolchatbot.core.assistants.content.AugmentedContent;
import dev.langchain4j.rag.content.Content;

/**
 * A functional interface representing a factory for creating instances of {@link ContentAugmentor}.
 * This factory takes a {@link Content} object as input and produces an instance of a specific
 * type of {@link ContentAugmentor}.
 *
 * @param <T> the type of {@link ContentAugmentor} that this factory produces
 */
@FunctionalInterface
public interface ContentAugmentorFactory<T extends AugmentedContent> {
  T apply(Content content);
}
