import { describe, expect, it } from 'vitest';

import { parseJsonBody } from '../../src/parse/body';

describe('parseJsonBody', () => {
  it('parses valid JSON object', async () => {
    const req = new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    });
    expect(await parseJsonBody(req)).toEqual({ name: 'test' });
  });

  it('throws on array body', async () => {
    const req = new Request('http://test', {
      method: 'POST',
      body: JSON.stringify([1, 2]),
    });
    await expect(parseJsonBody(req)).rejects.toThrow('must be a JSON object');
  });

  it('throws on null body', async () => {
    const req = new Request('http://test', {
      method: 'POST',
      body: 'null',
    });
    await expect(parseJsonBody(req)).rejects.toThrow('must be a JSON object');
  });

  it('throws on invalid JSON', async () => {
    const req = new Request('http://test', {
      method: 'POST',
      body: 'not-json',
    });
    await expect(parseJsonBody(req)).rejects.toThrow('Invalid JSON');
  });
});
