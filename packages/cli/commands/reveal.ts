import { CID, IPFSHTTPClient } from "ipfs-http-client";
import { ImportCandidate } from "ipfs-core-types/src/utils";
import fs from "fs";
import path from "path";
import { BigNumber } from "ethers";
import cliProgress from "cli-progress";

/**
 * Reveal metadata by taking a specific the hash of a block, metadata, a last revealed index and a contract address
 *
 * Using the hash, shuffle the tokens between the last revealed index and the current total supply of the contract
 *
 */

export async function revealMetadata({
  revealIndex,
  lastRevealedIndex,
  metadataFolderIn,
  metadataFolderOut,
  maxSupply,
  blockHash,
  placeholder,
  ipfsClient,
  overwrite,
}: {
  revealIndex: number;
  lastRevealedIndex: number;
  metadataFolderIn: string;
  metadataFolderOut: string;
  maxSupply: number;
  blockHash: string;
  placeholder: string;
  ipfsClient: IPFSHTTPClient;
  overwrite: boolean;
}) {
  // check if the metadata folder exists
  if (fs.existsSync(metadataFolderOut) && !overwrite) {
    console.warn(
      `Metadata folder already exists. Please delete it or use the --overwrite flag`
    );
    process.exit(1);
  }
  await fs.promises.mkdir(metadataFolderOut, { recursive: true });

  console.log(`Reveal up to: ${revealIndex}`);
  console.log(`Number of tokens to reveal: ${revealIndex - lastRevealedIndex}`);

  // Take the block hash, turn it into a number, and mod it by the number of tokens to reveal
  // We will use this number to shift the tokens
  const blockHashNumber = BigNumber.from(blockHash);
  const mod = blockHashNumber.mod(maxSupply - lastRevealedIndex);
  const shiftBy = mod.toNumber();

  console.log(`Shifting by ${shiftBy}`);

  const metadataImportCandidates: ImportCandidate[] = [];
  // First, copy all of the metadata up to the last revealed index
  for (let i = 1; i <= lastRevealedIndex; i++) {
    await fs.promises.copyFile(
      path.join(metadataFolderIn, `${i}.json`),
      path.join(metadataFolderOut, `${i}.json`)
    );
    metadataImportCandidates.push({
      path: `${i}.json`,
      content: Buffer.from(
        await fs.promises.readFile(
          path.join(metadataFolderOut, `${i}.json`),
          "utf8"
        )
      ),
    });
  }

  // Skip by shiftBy, and then copy the rest of the metadata, wrapping around if necessary
  const placeHolderMetadata = await fs.promises.readFile(placeholder, "utf8");
  for (let i = lastRevealedIndex + 1; i <= maxSupply; i++) {
    let sourceIndex = i + shiftBy;
    if (sourceIndex > maxSupply) {
      sourceIndex = sourceIndex - maxSupply + lastRevealedIndex + 1;
    }
    await fs.promises.copyFile(
      path.join(metadataFolderIn, `${sourceIndex}.json`),
      path.join(metadataFolderOut, `${i}.json`)
    );
    if (i <= revealIndex) {
      metadataImportCandidates.push({
        path: `${i}.json`,
        content: Buffer.from(
          await fs.promises.readFile(
            path.join(metadataFolderOut, `${i}.json`),
            "utf8"
          )
        ),
      });
    } else {
      metadataImportCandidates.push({
        path: `${i}.json`,
        content: placeHolderMetadata,
      });
    }
  }

  // Upload the metadata to IPFS, replacing tokens past the reveal index with the placeholder
  console.log(`Uploading metadata to IPFS\n\n`);
  const progress = new cliProgress.SingleBar(
    {
      format: "Uploading | {bar} | {percentage}% | {value}/{total} files",
    },
    cliProgress.Presets.shades_classic
  );
  progress.start(metadataImportCandidates.length + 1, 1);
  let finalCid: CID | null = null;
  for await (const entry of ipfsClient.addAll(metadataImportCandidates, {
    wrapWithDirectory: true,
    pin: true,
  })) {
    finalCid = entry.cid;
    progress.increment();
  }
  progress.stop();
  // Print the CIDs
  console.log(`\n\n\n\n\nFinal baseURI: ipfs://${finalCid?.toV0()}/`);
}

export async function justReveal({
  ipfsClient,
  metadataFolder,
  revealIndex,
  placeholder,
  maxSupply,
}: {
  ipfsClient: IPFSHTTPClient;
  metadataFolder: string;
  revealIndex: number;
  placeholder: string;
  maxSupply: number;
}) {
  const progress = new cliProgress.SingleBar(
    {
      format: "Uploading | {bar} | {percentage}% || {value}/{total} files",
    },
    cliProgress.Presets.shades_classic
  );
  progress.start(maxSupply, 0);
  const placeHolderMetadata = await fs.promises.readFile(placeholder, "utf8");
  const metadataImportCandidates: ImportCandidate[] = [];
  // First, copy all of the metadata up to the last revealed index
  for (let i = 1; i <= maxSupply; i++) {
    if (i <= revealIndex) {
      metadataImportCandidates.push({
        path: `${i}.json`,
        content: Buffer.from(
          await fs.promises.readFile(
            path.join(metadataFolder, `${i}.json`),
            "utf8"
          )
        ),
      });
    } else {
      metadataImportCandidates.push({
        path: `${i}.json`,
        content: placeHolderMetadata,
      });
    }
  }

  // Upload the metadata to IPFS, replacing tokens past the reveal index with the placeholder
  console.log(`Uploading metadata to IPFS`);
  let finalCid: CID | null = null;
  for await (const entry of ipfsClient.addAll(metadataImportCandidates, {
    wrapWithDirectory: true,
    pin: true,
  })) {
    progress.increment();
    finalCid = entry.cid;
  }
  progress.stop();
  // Print the CIDs
  console.log(`\n\n\n\n\nFinal baseURI: ipfs://${finalCid?.toV0()}/`);
}
