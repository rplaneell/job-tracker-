import { cn } from './cn';

describe('cn', () => {
  it('merges class names and resolves Tailwind conflicts', () => {
    const isHidden = Boolean(0);
    expect(cn('px-2', 'px-4', isHidden && 'hidden', 'text-sm')).toBe('px-4 text-sm');
  });
});
