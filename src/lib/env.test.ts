import { parseEnv } from './env';

describe('parseEnv', () => {
  it('treats empty strings as not set', () => {
    expect(parseEnv({ VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' })).toEqual({});
  });

  it('rejects an invalid Supabase URL', () => {
    expect(() => parseEnv({ VITE_SUPABASE_URL: 'not a url' })).toThrow();
  });

  it('accepts valid values', () => {
    const parsed = parseEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'placeholder',
    });
    expect(parsed.VITE_SUPABASE_URL).toBe('https://example.supabase.co');
  });
});
