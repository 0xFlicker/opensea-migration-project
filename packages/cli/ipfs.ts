import { IPFSHTTPClient } from "ipfs-http-client";
import { scan, from, map, takeLast, catchError } from "rxjs";

export async function loadIpfsContent(
  ipfsClient: IPFSHTTPClient,
  ipfsCid: string
) {
  const contents: Uint8Array[] = [];
  for await (const metadataBuf of ipfsClient.cat(ipfsCid)) {
    contents.push(metadataBuf);
  }
  return Buffer.concat(contents);
}

export function loadIpfsAsObservable(
  ipfsClient: IPFSHTTPClient,
  ipfsCid: string
) {
  return from(ipfsClient.cat(ipfsCid)).pipe(
    scan((acc, buf) => {
      console.log(`Accumulating ${buf.length} bytes`);
      return [...acc, buf];
    }, [] as Uint8Array[]),
    takeLast(1),
    map((bufs) => {
      return Buffer.concat(bufs);
    }),
    catchError((err) => {
      console.error(err);
      return err;
    })
  );
}
