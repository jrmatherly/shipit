import { describe, it, expect } from 'vitest';
import { parseArgs } from '@tests/helpers/cli/runner';

describe('parseArgs', () => {
  it('splits a plain space-delimited string into argv', () => {
    expect(parseArgs('version --help')).toEqual(['version', '--help']);
  });

  it('collapses consecutive whitespace', () => {
    expect(parseArgs('settings   show   --output    json')).toEqual([
      'settings',
      'show',
      '--output',
      'json',
    ]);
  });

  it('trims leading and trailing whitespace', () => {
    expect(parseArgs('  version  ')).toEqual(['version']);
  });

  it('returns an empty array for empty input', () => {
    expect(parseArgs('')).toEqual([]);
    expect(parseArgs('   ')).toEqual([]);
  });

  it('treats double-quoted groups as a single token', () => {
    expect(parseArgs('feat new "Add user authentication"')).toEqual([
      'feat',
      'new',
      'Add user authentication',
    ]);
  });

  it('treats single-quoted groups as a single token', () => {
    expect(parseArgs("feat new 'hello world'")).toEqual(['feat', 'new', 'hello world']);
  });

  it('supports an empty double-quoted token', () => {
    // `install ""` historically exercised the "empty tool name" CLI path.
    expect(parseArgs('install ""')).toEqual(['install', '']);
  });

  it('allows quotes inside longer tokens like --name="Foo bar"', () => {
    expect(parseArgs('--name="Add user authentication" --repo /tmp/r')).toEqual([
      '--name=Add user authentication',
      '--repo',
      '/tmp/r',
    ]);
  });

  it('does not reinterpret content inside quotes', () => {
    // Regex metacharacters, shell separators, and path chars should all
    // pass through untouched as a single literal token.
    expect(parseArgs('run "name with ;| && $(evil) and \\ backslashes"')).toEqual([
      'run',
      'name with ;| && $(evil) and \\ backslashes',
    ]);
  });

  it('throws on unterminated quotes', () => {
    expect(() => parseArgs('feat new "unterminated')).toThrow(/unterminated/i);
    expect(() => parseArgs("feat new 'also unterminated")).toThrow(/unterminated/i);
  });

  it('handles a mix of quoted and unquoted tokens in any order', () => {
    expect(parseArgs('feat new "Duplicate test" --repo /tmp/r --fast')).toEqual([
      'feat',
      'new',
      'Duplicate test',
      '--repo',
      '/tmp/r',
      '--fast',
    ]);
  });
});
