import { Web3Storage, getFilesFromPath, File } from "web3.storage";
import fs from "fs";
import glob from "it-glob";
import { resolve as pathResolve, basename, extname, parse } from "path";
import { ImportCandidate } from "ipfs-core-types/src/utils";
import cliProgress from "cli-progress";

export async function ipfsPinBurnable({
  accessToken,
  localFolder,
  imageCid,
  pin,
}: {
  accessToken: string;
  localFolder: string;
  imageCid?: string;
  pin: boolean;
}) {
  const outputFolder = pathResolve(localFolder, "out");
  await fs.promises.mkdir(pathResolve(outputFolder, "burned"), {
    recursive: true,
  });
  const web3Storage = new Web3Storage({ token: accessToken });
  const mainDirs = ["", "burned"];
  let finalCid: CID | null = null;

  const bar = new cliProgress.SingleBar(
    {
      format:
        "{action} {bar} {percentage}% | {value}/{total} | {eta_formatted}",
    },
    cliProgress.Presets.shades_classic
  );
  // bar.start(0, 0, { action: "Uploading assets" });

  if (!imageCid) {
    const localFiles: string[] = [];
    const assetsRoot = pathResolve(localFolder, "outImages");
    for await (const fileSource of glob(assetsRoot, "!(*.json)")) {
      const localPath = pathResolve(assetsRoot, fileSource);
      localFiles.push(localPath);
    }
    // bar.setTotal(files.length);
    const files = await getFilesFromPath(localFiles);
    imageCid = await web3Storage.put(files, {
      wrapWithDirectory: true,
      onRootCidReady: (cid) => {
        console.log(cid);
      },
      onStoredChunk: (size) => {
        console.log(`Stored ${size} bytes`);
      },
    });
    console.log(imageCid);
  }

  const metadataFiles: File[] = [];
  const assetsRoot = pathResolve(localFolder, "metadata");
  for await (const fileSource of glob(assetsRoot, "*.json")) {
    const localPath = pathResolve(assetsRoot, fileSource);
    const metadata = JSON.parse(await fs.promises.readFile(localPath, "utf8"));
    const image = metadata.image;
    if (!image) {
      throw new Error(`Could not find image for ${metadata.image}`);
    }
    metadata.image = `ipfs://${imageCid}/${image}`;
    metadataFiles.push(
      new File(
        [Buffer.from(JSON.stringify(metadata, null, 2))],
        parse(fileSource).name
      )
    );
  }
  const metadataCid = await web3Storage.put(metadataFiles, {
    wrapWithDirectory: true,
    onRootCidReady: (cid) => {
      console.log(cid);
    },
    onStoredChunk: (size) => {
      console.log(`Stored ${size} bytes`);
    },
  });
  console.log("metadata CDI:", metadataCid);

  //   const { cid } = await web3Storage.put(files, {
  //     wrapWithDirectory: true,
  //     pin,
  //   });
  //   if (!finalCid) {
  //     throw new Error("No CID returned from IPFS");
  //   }
  // }
  // imageCid = imageCid || finalCid!.toV0().toString();

  // const metadataImportCandidates: ImportCandidate[] = [];

  // for (const mainDir of mainDirs) {
  //   const metadataRoot = pathResolve(localFolder, mainDir, "metadata");
  //   const prefix = mainDir ? `${mainDir}/` : "";

  //   for await (const file of glob(metadataRoot, "*.json")) {
  //     const metadata = JSON.parse(
  //       await fs.promises.readFile(pathResolve(metadataRoot, file), "utf8")
  //     );
  //     const image = metadata.image;
  //     if (!image) {
  //       throw new Error(`Could not find image for ${metadata.image}`);
  //     }
  //     metadata.image = `ipfs://${imageCid}/${image}`;
  //     // metadataImportCandidates.push({
  //     //   path: `${prefix}${parse(file).name}`,
  //     //   content: Buffer.from(JSON.stringify(metadata, null, 2)),
  //     // });
  //     await fs.promises.writeFile(
  //       pathResolve(outputFolder, `${prefix}${parse(file).name}`),
  //       JSON.stringify(metadata, null, 2),
  //       "utf8"
  //     );
  //   }
  // }
  // bar.update(0, {
  //   action: "Uploading metadata",
  // });
  // bar.setTotal(metadataImportCandidates.length);
  // const things: { cid: string; path: string }[] = [];
  // for await (const entry of ipfsClient.addAll(metadataImportCandidates, {
  //   wrapWithDirectory: true,
  //   pin,
  // })) {
  //   finalCid = entry.cid;
  //   things.push({ cid: entry.cid.toV0().toString(), path: entry.path });
  //   bar.increment();
  // }
  // await fs.promises.writeFile(
  //   "things.json",
  //   JSON.stringify(things, null, 2),
  //   "utf8"
  // );
  // // Print the CIDs
  // bar.stop();
  // console.log(
  //   `\n\n\nMetadata CID: ${finalCid!.toV0()}\nImage CID: ${imageCid}\n`
  // );
}
