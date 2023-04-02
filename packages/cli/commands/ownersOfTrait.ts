import { basename } from "path";
import fs from "fs";
import { IMetadata, IMetadataAttribute } from "../metadata";
import { Ierc721A } from "../typechain/Ierc721A";
import { retryWithBackoff } from "../retry";
import { BigNumber } from "ethers";

interface Tally {
  [key: string]: Record<string, number[]>;
}

export async function ownersOfTrait({
  tokenName,
  traitName,
  traitValue,
  contract,
  output,
  blockTag,
}: {
  tokenName?: string;
  traitName: string;
  traitValue: string;
  contract: Ierc721A;
  output?: string;
  blockTag?: BigNumber | string;
}) {
  tokenName = tokenName || (await contract.name());
  console.log(`Reading ${tokenName} metadata`);
  const metadataFiles = await fs.promises.readdir(`./.metadata/${tokenName}`);
  const tokens: { metadata: IMetadata; tokenId: number }[] = [];
  for (const file of metadataFiles.sort(
    (a, b) => Number(basename(a, ".json")) - Number(basename(b, ".json"))
  )) {
    const metadata = JSON.parse(
      await fs.promises.readFile(`./.metadata/${tokenName}/${file}`, "utf8")
    );
    tokens.push({
      metadata,
      tokenId: Number(basename(file, ".json")),
    });
  }

  // TODO, get token count on blockTag, and slice the metadata to equal that length....

  let tally: Tally = { traitCount: {} };

  const metadata = tokens
    .map((t) => ({
      attributes: t.metadata.attributes as IMetadataAttribute[],
      tokenId: t.tokenId,
    }))
    .filter((a) => a);
  for (let j = 0; j < metadata.length; j++) {
    let nftTraits = metadata[j].attributes.map((e) => e.trait_type);
    let nftValues = metadata[j].attributes.map((e) => e.value);

    for (let i = 0; i < nftTraits.length; i++) {
      let current = nftTraits[i];
      tally[current] = tally[current] || {};

      let currentValue = nftValues[i];
      tally[current][currentValue] = tally[current][currentValue] || [];
      tally[current][currentValue].push(metadata[j].tokenId);
    }
  }
  const tokenList = tally[traitName][traitValue];
  console.log(
    `Found ${tokenList.length} tokens with trait ${traitName} = ${traitValue}`
  );
  const owners: string[] = [];
  const tokenOwners: Record<string, number[]> = {};
  for (let i = 0; i < tokenList.length; i += 20) {
    const tokenIds = tokenList.slice(i, i + 20);
    console.log(`Getting owners for tokens ${tokenIds.join(", ")}`);
    const ownerAddresses = await Promise.all(
      tokenIds.map((tokenId) =>
        retryWithBackoff(
          () =>
            contract.ownerOf(tokenId, {
              ...(blockTag
                ? {
                    blockTag:
                      typeof blockTag === "string"
                        ? blockTag
                        : blockTag.toHexString(),
                  }
                : {}),
            }),
          10,
          250
        )
      )
    );
    owners.push(...ownerAddresses);
    for (let j = 0; j < tokenIds.length; j++) {
      tokenOwners[ownerAddresses[j]] = tokenOwners[ownerAddresses[j]] || [];
      tokenOwners[ownerAddresses[j]].push(tokenIds[j]);
    }
  }
  const uniqueOwners = [...new Set(owners)];
  console.log(`Found ${uniqueOwners.length} unique owners`);
  await fs.promises.writeFile(
    output || `${traitName}-${traitValue}.txt`,
    uniqueOwners.join("\n"),
    "utf8"
  );

  await fs.promises.writeFile(
    `${traitName}-${traitValue}-tokens.txt`,
    `address,tokens...\n${Object.entries(tokenOwners)
      .map(([owner, tokens]) => `${owner},${tokens.join(",")}`)
      .join("\n")}`,
    "utf8"
  );
}
