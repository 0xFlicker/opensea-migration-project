import { basename } from "path";
import fs from "fs";
import { IMetadata, IMetadataAttribute } from "../metadata";
import { retryWithBackoff } from "../retry";
import { BigNumber, providers } from "ethers";
import { Ierc1155Factory } from "../typechain/Ierc1155Factory";
import { Ierc721AFactory } from "../typechain/Ierc721AFactory";

const Hunnys10KContractAddress = "0x5dfeb75abae11b138a16583e03a2be17740eaded";
const HunnysOGContractAddress = "0x64bd44df5590cfe4f0395b05fa0e6f096734bb77";

interface Tally {
  [key: string]: Record<string, number[]>;
}

export async function hunnysSeasonsAirdropList({
  output,
  blockTag,
  provider,
}: {
  output?: string;
  blockTag?: BigNumber | string;
  provider: providers.Provider;
}) {
  const hunnys10k = Ierc721AFactory.connect(Hunnys10KContractAddress, provider);
  const hunnysOG = Ierc721AFactory.connect(HunnysOGContractAddress, provider);

  // Count the number of tokens held by each address in the 10K collection

  const hunnys10kHolders: Record<string, number> = {};

  let tokenLength = (
    await hunnys10k.totalSupply({
      ...(blockTag
        ? {
            blockTag:
              typeof blockTag === "string" ? blockTag : blockTag.toHexString(),
          }
        : {}),
    })
  ).toNumber();

  // Check if there is a token 0
  let token0Exists = false;
  try {
    await hunnys10k.ownerOf(0);
    token0Exists = true;
  } catch (e) {
    // nothing
  }

  console.log(`Found ${tokenLength} tokens in 10K collection`);

  for (
    let i = token0Exists ? 0 : 1;
    i < (token0Exists ? tokenLength : tokenLength + 1);
    i += 20
  ) {
    const tokenIds = Array.from(
      { length: Math.min(20, tokenLength - i + 1) },
      (_, j) => j + i
    );
    const ownerAddresses = await Promise.all(
      tokenIds.map((tokenId) =>
        retryWithBackoff(
          () =>
            hunnys10k.ownerOf(tokenId, {
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
    process.stdout.write(".");
    for (const ownerAddress of ownerAddresses) {
      if (hunnys10kHolders[ownerAddress]) {
        hunnys10kHolders[ownerAddress] += 1;
      } else {
        hunnys10kHolders[ownerAddress] = 1;
      }
    }
  }

  console.log("\n");

  // Check if there is a token 0
  token0Exists = false;
  try {
    await hunnysOG.ownerOf(0);
    token0Exists = true;
  } catch (e) {
    // nothing
  }
  tokenLength = (
    await hunnysOG.totalSupply({
      ...(blockTag
        ? {
            blockTag:
              typeof blockTag === "string" ? blockTag : blockTag.toHexString(),
          }
        : {}),
    })
  ).toNumber();
  const hunnysOgsOwners: string[] = [];

  console.log(`Found ${tokenLength} tokens in OG Hunnys collection`);
  for (
    let i = token0Exists ? 0 : 1;
    i < (token0Exists ? tokenLength : tokenLength + 1);
    i += 20
  ) {
    const tokenIds = Array.from(
      { length: Math.min(20, tokenLength - i + 1) },
      (_, j) => j + i
    );
    const ownerAddresses = await Promise.all(
      tokenIds.map((tokenId) =>
        retryWithBackoff(
          () =>
            hunnysOG.ownerOf(tokenId, {
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
    process.stdout.write(".");
    hunnysOgsOwners.push(...ownerAddresses);
  }
  console.log("\n");
  const uniqueHunnysOgsOwners = [...new Set(hunnysOgsOwners)];

  // Separate holders into buckets for owning 1, 3, 7 and 12 tokens. For example, owning 12 tokens would put the address in all buckets.
  // We will fill the og bucket with addresses that own 1 or more OG Hunnys
  const seasonsAirdrop: Record<
    "Bunny" | "Bunny Knight" | "Bunny Duke" | "Royal Bunny" | "Relic",
    string[]
  > = {
    ["Bunny"]: [],
    ["Bunny Knight"]: [],
    ["Bunny Duke"]: [],
    ["Royal Bunny"]: [],
    ["Relic"]: [],
  };

  for (const [address, count] of Object.entries(hunnys10kHolders)) {
    if (count >= 12) {
      seasonsAirdrop["Royal Bunny"].push(address);
    }
    if (count >= 7) {
      seasonsAirdrop["Bunny Duke"].push(address);
    }
    if (count >= 3) {
      seasonsAirdrop["Bunny Knight"].push(address);
    }
    if (count >= 1) {
      seasonsAirdrop["Bunny"].push(address);
    }
  }

  for (const address of uniqueHunnysOgsOwners) {
    seasonsAirdrop["Relic"].push(address);
  }

  const uniqueOwners = [...new Set(Object.values(seasonsAirdrop).flat())];
  console.log(`Found ${uniqueOwners.length} unique owners`);
  await fs.promises.writeFile(
    output || `HunnysSeasonsAirdrop.txt`,
    JSON.stringify(seasonsAirdrop, null, 2),
    "utf8"
  );
}
