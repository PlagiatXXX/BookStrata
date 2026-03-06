import { describe, it, expect } from 'vitest';
import { uid } from './id';

describe('Utils - ID Generation', () => {
  it('должен генерировать уникальные ID', () => {
    const id1 = uid();
    const id2 = uid();
    expect(id1).not.toBe(id2);
  });

  it('должен возвращать непустую строку', () => {
    const id = uid();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('должен генерировать ID правильной длины', () => {
    const id = uid();
    expect(id.length).toBeGreaterThan(5);
  });

  it('должен генерировать несколько уникальных ID', () => {
    const ids = Array.from({ length: 10 }, () => uid());
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10);
  });
});
