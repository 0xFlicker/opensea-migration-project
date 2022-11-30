import fs from "fs";
import { IERC721A } from "../typechain/index.js";
import { IPFSHTTPClient } from "ipfs-http-client";
import { catchError, map, mergeMap, of, range } from "rxjs";
import fetch from "node-fetch";
import { fileExists } from "../files.js";
import { loadIpfsAsObservable, loadIpfsContent } from "../ipfs.js";

export async function extractMetadata({
  contract,
  ipfsClient,
}: {
  contract: IERC721A;
  ipfsClient: IPFSHTTPClient;
}) {
  const { provider } = contract;
  const [contractName, tokenCount] = await Promise.all([
    contract.name(),
    contract.totalSupply(),
  ]);
  console.log(`Found ${tokenCount} tokens in contract ${contractName}`);
  await fs.promises.mkdir(`.metadata/${contractName}`, { recursive: true });
  range(1, tokenCount.toNumber())
    .pipe(
      mergeMap(async (tokenId) => {
        if (await fileExists(`.metadata/${contractName}/${tokenId}.json`)) {
          return of({
            tokenId,
            content: JSON.parse(
              await fs.promises.readFile(
                `.metadata/${contractName}/${tokenId}.json`,
                "utf8"
              )
            ),
          });
        }
        const tokenURI = await contract.tokenURI(tokenId);
        const tokenURL = new URL(tokenURI);
        let fetchURL = tokenURI;
        if (tokenURL.protocol === "ipfs:") {
          const ipfsHash = tokenURI.slice(7);
          console.log(`Fetching ${ipfsHash} from IPFS`);
          const content = await loadIpfsContent(ipfsClient, ipfsHash);
          return { tokenId, content };
          // return loadIpfsAsObservable(ipfsClient, ipfsHash)
          //   .pipe(backOff(10, 250))
          //   .pipe(map((content) => ({ tokenId, content })));
        }
        console.log(`Fetching ${fetchURL} from HTTP`);
        const response = await fetch(fetchURL);
        const content = await response.text();
        return { tokenId, content };
      }, 6),
      mergeMap(async ({ content, tokenId }: any) => {
        console.log(`Writing ${tokenId}.json`);
        await fs.promises.writeFile(
          `.metadata/${contractName}/${tokenId}.json`,
          content,
          "utf8"
        );
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
