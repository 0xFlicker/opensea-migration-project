import fs from "fs";
import { IERC721A } from "../typechain/index.js";
import { IPFSHTTPClient } from "ipfs-http-client";
import { catchError, map, mergeMap, of, range } from "rxjs";
import fetch from "node-fetch";
import { fileExists } from "../files.js";
import { loadIpfsContent } from "../ipfs.js";
import { BigNumber } from "ethers";
import { retryWithBackoff } from "../retry.js";
import { basename } from "path";

async function downloadImage(ipfsClient: IPFSHTTPClient, url: string) {
  const urlObj = new URL(url);
  if (urlObj.protocol === "ipfs:") {
    const ipfsHash = url.slice(7);
    const content = await loadIpfsContent(ipfsClient, ipfsHash);
    return content;
  }
  const response = await fetch(url);
  const content = await response.arrayBuffer();
  return content;
}

export async function extractMetadata({
  contract,
  ipfsClient,
  blockTag,
  images,
}: {
  contract: IERC721A;
  ipfsClient: IPFSHTTPClient;
  blockTag: string | BigNumber;
  images?: boolean;
}) {
  const [contractName, tokenCount] = await Promise.all([
    contract.name(),
    contract.totalSupply({
      ...(blockTag
        ? {
            blockTag:
              typeof blockTag === "string" ? blockTag : blockTag.toHexString(),
          }
        : {}),
    }),
  ]);
  console.log(`Found ${tokenCount} tokens in contract ${contractName}`);
  await fs.promises.mkdir(`.metadata/${contractName}/assets`, {
    recursive: true,
  });

  range(0, tokenCount.toNumber() - 1)
    .pipe(
      mergeMap(async (tokenId) => {
        if (await fileExists(`.metadata/${contractName}/${tokenId}.json`)) {
          const content = await fs.promises.readFile(
            `.metadata/${contractName}/${tokenId}.json`,
            "utf8"
          );

          return {
            tokenId,
            content,
          };
        }
        const tokenURI: string = await retryWithBackoff(
          () => contract.tokenURI(tokenId),
          10,
          200
        );
        const tokenURL = new URL(tokenURI);
        let fetchURL = tokenURI;
        if (tokenURL.protocol === "ipfs:") {
          const ipfsHash = tokenURI.slice(7);
          const content = await retryWithBackoff(
            () => loadIpfsContent(ipfsClient, ipfsHash),
            10,
            250
          );
          return { tokenId, content };
        }
        const response = await fetch(fetchURL);
        const content = await response.text();
        return { tokenId, content };
      }, 6),
      mergeMap(async (res: any) => {
        const { content, tokenId } = res;
        console.log(`Writing ${tokenId}.json`);
        await fs.promises.writeFile(
          `.metadata/${contractName}/${tokenId}.json`,
          content,
          "utf8"
        );
        // check if we have the image
        if (images) {
          const metadata = JSON.parse(content);
          const image = basename(metadata.image);
          if (
            metadata.image &&
            !(await fileExists(`.metadata/${contractName}/assets/${image}`))
          ) {
            const imageContent = await downloadImage(
              ipfsClient,
              metadata.image
            );
            console.log(`Writing ${image}`);
            await fs.promises.writeFile(
              `.metadata/${contractName}/assets/${image}`,
              Buffer.from(imageContent)
            );
          }
        }
        return of({ tokenId, content: JSON.parse(content) });
      }, 2),
      catchError((error) => {
        console.error(error);
        return of({ error });
      })
    )
    .subscribe({
      next: () => {
        /* bar.increment() */
      },
      complete: () => {
        console.log("Done");
      },
    });
}
