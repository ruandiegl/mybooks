import { CopyObjectCommand } from '@aws-sdk/client-s3';

export function copyLegacyObjectIfAbsent({ client, bucket, source, destination, etag }) {
  const command = new CopyObjectCommand({
    Bucket: bucket, Key: destination,
    CopySource: bucket + '/' + source.split('/').map(encodeURIComponent).join('/'),
    CopySourceIfMatch: etag, MetadataDirective: 'COPY',
  });
  // R2 destination precondition is checked at commit, not merely at the earlier HEAD.
  // https://developers.cloudflare.com/r2/api/s3/extensions/
  command.middlewareStack.add(next => async args => {
    args.request.headers['cf-copy-destination-if-none-match'] = '*';
    return next(args);
  }, { step: 'build', name: 'legacyCopyDestinationAbsent' });
  return client.send(command, { abortSignal: AbortSignal.timeout(10000) });
}
