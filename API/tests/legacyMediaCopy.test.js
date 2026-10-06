import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';
import { copyLegacyObjectIfAbsent } from '../src/modules/media/legacyMediaCopy.js';

describe('legacy media copy HTTP contract', () => {
  it('signs the destination-absence precondition and pins the source ETag', async () => {
    let headers;
    const client = new S3Client({
      region: 'auto', endpoint: 'https://test.r2.cloudflarestorage.com',
      credentials: { accessKeyId: 'synthetic', secretAccessKey: 'synthetic' },
      requestHandler: { handle: async request => {
        headers = request.headers;
        return { response: { statusCode: 200, headers: { 'content-type': 'application/xml' },
          body: Readable.from(['<CopyObjectResult><ETag>"copied"</ETag><LastModified>2026-10-06T10:00:00Z</LastModified></CopyObjectResult>']) } };
      } },
    });
    try {
      await copyLegacyObjectIfAbsent({ client, bucket: 'trocalivros', source: 'books/source.jpg', destination: 'books/destination.jpg', etag: '"original"' });
      expect(headers['cf-copy-destination-if-none-match']).toBe('*');
      expect(headers['x-amz-copy-source-if-match']).toBe('"original"');
      expect(headers.authorization).toContain('cf-copy-destination-if-none-match');
    } finally { client.destroy(); }
  });
});
