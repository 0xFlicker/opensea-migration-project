import { basename } from "path";
import fs from "fs";
import { IMetadata, IMetadataAttribute } from "../metadata";
import { IERC721A } from "../typechain";
import { retryWithBackoff } from "../retry";

interface Tally {
  [key: string]: Record<string, number[]>;
}

export async function ownersOfTrait({
  tokenName,
  traitName,
  traitValue,
  contract,
  output,
}: {
  tokenName?: string;
  traitName: string;
  traitValue: string;
  contract: IERC721A;
  output?: string;
}) {
  tokenName = tokenName || (await contract.name());
  const metadataFiles = await fs.promises.readdir(`./metadata/${tokenName}`);
  const tokens: IMetadata[] = [];
  for (const file of metadataFiles.sort(
    (a, b) => Number(basename(a)) - Number(basename(b))
  )) {
    const metadata = JSON.parse(
      await fs.promises.readFile(`./metadata/${tokenName}/${file}`, "utf8")
    );
    tokens.push(metadata);
  }

  let tally: Tally = { traitCount: {} };
  const metadata = tokens
    .map((t) => t.attributes as IMetadataAttribute[])
    .filter((a) => a);
  for (let j = 0; j < metadata.length; j++) {
    let nftTraits = metadata[j].map((e) => e.trait_type);
    let nftValues = metadata[j].map((e) => e.value);

    for (let i = 0; i < nftTraits.length; i++) {
      let current = nftTraits[i];
      tally[current] = tally[current] || {};

      let currentValue = nftValues[i];
      tally[current][currentValue] = tally[current][currentValue] || [];
      tally[current][currentValue].push(j);
    }
  }
  const tokenList = tally[traitName][traitValue];
  console.log(
    `Found ${tokenList.length} tokens with trait ${traitName} = ${traitValue}`
  );
  const owners: string[] = [];
  for (let i = 0; i < tokenList.length; i += 20) {
    const tokenIds = tokenList.slice(i, i + 20);
    const ownerAddresses = await Promise.all(
      tokenIds.map((tokenId) =>
        retryWithBackoff(() => contract.ownerOf(tokenId), 10, 250)
      )
    );
    owners.push(...ownerAddresses);
  }
  const uniqueOwners = [...new Set(owners)];
  console.log(`Found ${uniqueOwners.length} unique owners`);
  await fs.promises.writeFile(
    output || `${traitName}-${traitValue}.txt`,
    uniqueOwners.join("\n"),
    "utf8"
  );
}
