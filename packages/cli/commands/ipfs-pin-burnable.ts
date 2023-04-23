import { IPFSHTTPClient, globSource, CID } from "ipfs-http-client";
import fs from "fs";
import glob from "it-glob";
import { resolve as pathResolve, basename, extname, parse } from "path";
import { ImportCandidate } from "ipfs-core-types/src/utils";
import cliProgress from "cli-progress";

export async function ipfsPinBurnable({
  ipfsClient,
  localFolder,
  imageCid,
  pin,
}: {
  ipfsClient: IPFSHTTPClient;
  localFolder: string;
  imageCid?: string;
  pin: boolean;
}) {
  const mainDirs = ["", "burned"];
  let finalCid: CID | null = null;

  const bar = new cliProgress.SingleBar(
    {
      format:
        "{action} {bar} {percentage}% | {value}/{total} | {eta_formatted}",
    },
    cliProgress.Presets.shades_classic
  );
  bar.start(0, 0, { action: "Uploading assets" });

  if (!imageCid) {
    const assetsImportCandidates: ImportCandidate[] = [];

    for (const mainDir of mainDirs) {
      const assetsRoot = pathResolve(localFolder, mainDir, "assets");

      for await (const fileSource of globSource(assetsRoot, "!(*.json)")) {
        if (fileSource.content) {
          fileSource.path = mainDir + fileSource.path;
          assetsImportCandidates.push(fileSource);
        }
      }
    }

    bar.setTotal(assetsImportCandidates.length);

    for await (const entry of ipfsClient.addAll(assetsImportCandidates, {
      wrapWithDirectory: true,
      pin,
    })) {
      finalCid = entry.cid;
      bar.increment();
    }

    if (!finalCid) {
      throw new Error("No CID returned from IPFS");
    }
  }
  imageCid = imageCid || finalCid!.toV0().toString();

  const metadataImportCandidates: ImportCandidate[] = [];

  for (const mainDir of mainDirs) {
    const metadataRoot = pathResolve(localFolder, mainDir, "metadata");
    const prefix = mainDir ? `${mainDir}/` : "";

    for await (const file of glob(metadataRoot, "*.json")) {
      const metadata = JSON.parse(
        await fs.promises.readFile(pathResolve(metadataRoot, file), "utf8")
      );
      const image = metadata.image;
      if (!image) {
        throw new Error(`Could not find image for ${metadata.image}`);
      }
      metadata.image = `ipfs://${imageCid}/${image}`;
      metadataImportCandidates.push({
        path: `${prefix}${parse(file).name}`,
        content: Buffer.from(JSON.stringify(metadata, null, 2)),
      });
    }
  }
  bar.update(0, {
    action: "Uploading metadata",
  });
  bar.setTotal(metadataImportCandidates.length);
  const things: { cid: string; path: string }[] = [];
  for await (const entry of ipfsClient.addAll(metadataImportCandidates, {
    wrapWithDirectory: true,
    pin,
  })) {
    finalCid = entry.cid;
    things.push({ cid: entry.cid.toV0().toString(), path: entry.path });
    bar.increment();
  }
  await fs.promises.writeFile(
    "things.json",
    JSON.stringify(things, null, 2),
    "utf8"
  );
  // Print the CIDs
  bar.stop();
  console.log(
    `\n\n\nMetadata CID: ${finalCid!.toV0()}\nImage CID: ${imageCid}\n`
  );
}
