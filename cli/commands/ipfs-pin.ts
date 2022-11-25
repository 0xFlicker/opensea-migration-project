import { IPFSHTTPClient, globSource, CID } from "ipfs-http-client";
import fs from "fs";
import glob from "it-glob";
import { resolve as pathResolve, basename, extname } from "path";
import { ImportCandidate } from "ipfs-core-types/src/utils";

async function countGlobFiles(cwd: string, pattern: string) {
  const fileSizes = new Map<string, number>();
  for await (const fileName of glob(cwd, pattern)) {
    const stat = await fs.promises.stat(fileName);
    fileSizes.set(fileName, stat.size);
  }
  return fileSizes;
}

// Pin a directory of files to IPFS
export async function ipfsPin({
  ipfsClient,
  localFolder,
  pin,
}: {
  ipfsClient: IPFSHTTPClient;
  localFolder: string;
  pin: boolean;
}) {
  const assetsRoot = pathResolve(localFolder, "assets");
  const metadataRoot = pathResolve(localFolder, "metadata");

  console.log(`Creating ${assetsRoot} on IPFS`);

  const assetsImportCandidates: ImportCandidate[] = [];
  const fileNames = new Map<string, string>();
  for await (const fileSource of globSource(assetsRoot, "**/!(*.json)")) {
    if (fileSource.content) {
      assetsImportCandidates.push(fileSource);
      const imageFileName = fileSource.path;
      fileNames.set(basename(fileSource.path), imageFileName.split("/")[1]);
    }
  }
  let finalCid: CID | null = null;
  for await (const entry of ipfsClient.addAll(assetsImportCandidates, {
    wrapWithDirectory: true,
    pin,
  })) {
    finalCid = entry.cid;
  }

  if (!finalCid) {
    throw new Error("No CID returned from IPFS");
  }
  const metadataImportCandidates: ImportCandidate[] = [];
  for await (const file of glob(metadataRoot, "**/*.json")) {
    const metadata = JSON.parse(
      await fs.promises.readFile(pathResolve(metadataRoot, file), "utf8")
    );
    const image = fileNames.get(basename(metadata.image));
    if (!image) {
      throw new Error(`Could not find image for ${metadata.image}`);
    }
    metadata.image = `ipfs://${finalCid.toV0()}/${image}`;
    if (metadata.animation_url) {
      const animation = fileNames.get(basename(metadata.animation_url));
      if (!animation) {
        throw new Error(
          `Could not find animation for ${metadata.animation_url}`
        );
      }
      metadata.animation_url = `ipfs://${finalCid.toV0()}/${animation}`;
    }

    metadataImportCandidates.push({
      path: `${basename(file, extname(file))}`,
      content: Buffer.from(JSON.stringify(metadata, null, 2)),
    });
  }
  for await (const entry of ipfsClient.addAll(metadataImportCandidates, {
    wrapWithDirectory: true,
    pin,
  })) {
    finalCid = entry.cid;
  }
  // Print the CIDs
  console.log(`CID: ${finalCid.toV0()}`);
}
