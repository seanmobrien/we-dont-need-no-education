package com.obapps.core.util.lists;

import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.ListIterator;

/**
 * An abstract class that wraps a List and provides default implementations for the List interface methods.
 *
 * @param <T> the type of elements in this list
 */
public abstract class WrappedList<T> implements List<T> {

  /**
   * The underlying list of items.
   */
  private final List<T> items;

  /**
   * Constructs a WrappedList with the specified list of items.
   *
   * @param items the list of items to wrap
   */
  public WrappedList(List<T> items) {
    this.items = items;
  }

  /**
   * Returns the underlying list of items.
   *
   * @return the list of items
   */
  protected List<T> getItems() {
    return items;
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public int size() {
    return items.size();
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public boolean isEmpty() {
    return items.isEmpty();
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public boolean contains(Object o) {
    return items.contains(o);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public Iterator<T> iterator() {
    return items.iterator();
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public Object[] toArray() {
    return items.toArray();
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public <TItem> TItem[] toArray(TItem[] a) {
    return items.toArray(a);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public boolean add(T e) {
    return items.add(e);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public boolean remove(Object o) {
    return items.remove(o);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public boolean containsAll(Collection<?> c) {
    return items.containsAll(c);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public boolean addAll(Collection<? extends T> c) {
    return items.addAll(c);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public boolean addAll(int index, Collection<? extends T> c) {
    return items.addAll(index, c);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public boolean removeAll(Collection<?> c) {
    return items.removeAll(c);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public boolean retainAll(Collection<?> c) {
    return items.retainAll(c);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public void clear() {
    items.clear();
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public T get(int index) {
    return items.get(index);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public T set(int index, T element) {
    return items.set(index, element);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public void add(int index, T element) {
    items.add(index, element);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public T remove(int index) {
    return items.remove(index);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public int indexOf(Object o) {
    return items.indexOf(o);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public int lastIndexOf(Object o) {
    return items.lastIndexOf(o);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public ListIterator<T> listIterator() {
    return items.listIterator();
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public ListIterator<T> listIterator(int index) {
    return items.listIterator(index);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  public List<T> subList(int fromIndex, int toIndex) {
    return items.subList(fromIndex, toIndex);
  }
}
