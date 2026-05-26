import { describe, it, expect } from 'vitest';
import { parseRoadmap } from './roadmap.js';

describe('parseRoadmap', () => {
  it('returns empty array for empty content', () => {
    expect(parseRoadmap('')).toEqual([]);
  });

  it('parses an open task', () => {
    expect(parseRoadmap('- [ ] Set up project')).toEqual([
      { text: 'Set up project', done: false, section: undefined },
    ]);
  });

  it('parses a completed task with lowercase x', () => {
    expect(parseRoadmap('- [x] Deploy to production')).toEqual([
      { text: 'Deploy to production', done: true, section: undefined },
    ]);
  });

  it('parses a completed task with uppercase X', () => {
    expect(parseRoadmap('- [X] Deploy to production')).toEqual([
      { text: 'Deploy to production', done: true, section: undefined },
    ]);
  });

  it('assigns section from ## heading', () => {
    expect(parseRoadmap('## Phase 1\n- [ ] Init project')).toEqual([
      { text: 'Init project', done: false, section: 'Phase 1' },
    ]);
  });

  it('assigns section from ### heading', () => {
    expect(parseRoadmap('### Sub-phase\n- [ ] Do something')).toEqual([
      { text: 'Do something', done: false, section: 'Sub-phase' },
    ]);
  });

  it('tasks before any heading have section undefined', () => {
    const result = parseRoadmap('- [ ] Early task\n## Phase 1\n- [ ] Late task');
    expect(result[0].section).toBeUndefined();
    expect(result[1].section).toBe('Phase 1');
  });

  it('ignores non-task lines (paragraphs, blank lines, blockquotes, h1)', () => {
    const content = '# Title\n> A note\nSome paragraph.\n\n- [ ] Real task';
    const result = parseRoadmap(content);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Real task');
  });

  it('groups tasks under the correct section when sections change', () => {
    const content = [
      '## Phase 1',
      '- [x] Task A',
      '- [ ] Task B',
      '## Phase 2',
      '- [ ] Task C',
    ].join('\n');
    const result = parseRoadmap(content);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ text: 'Task A', done: true, section: 'Phase 1' });
    expect(result[1]).toEqual({ text: 'Task B', done: false, section: 'Phase 1' });
    expect(result[2]).toEqual({ text: 'Task C', done: false, section: 'Phase 2' });
  });

  it('ignores placeholder lines with no task text (e.g. from init template)', () => {
    expect(parseRoadmap('- [ ] ')).toEqual([]);
  });
});
