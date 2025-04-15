package com.obapps.core.types;

/**
 * A functional interface that represents a function which accepts one argument and produces a result,
 * and is capable of throwing a checked exception.
 *
 * @param <E> the type of exception that may be thrown by the function
 * @param <T> the type of the input to the function
 * @param <R> the type of the result of the function
 */
@FunctionalInterface
public interface FunctionThatCanThrow<E extends Throwable, T, R> {
  R apply(T t) throws E;
}
