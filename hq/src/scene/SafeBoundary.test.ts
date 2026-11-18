import { describe, expect, it } from 'vitest';
import { SafeBoundary } from './SafeBoundary';

describe('SafeBoundary', () => {
  it('switches to showing nothing after an error', () => expect(SafeBoundary.getDerivedStateFromError()).toEqual({ failed: true }));
  it('shows its children until something fails', () => {
    const boundary = new SafeBoundary({ children: 'goblins' });
    expect(boundary.render()).toBe('goblins');
    boundary.state = { failed: true };
    expect(boundary.render()).toBeNull();
  });
});
