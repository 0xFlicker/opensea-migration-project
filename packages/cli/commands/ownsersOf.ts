import { basename } from "path";
import fs from "fs";
import { IMetadata, IMetadataAttribute } from "../metadata";
import { IERC721A } from "../typechain";
import { retryWithBackoff } from "../retry";
import { BigNumber } from "ethers";

interface Tally {
  [key: string]: Record<string, number[]>;
}

export async function ownersOf({
  tokenName,
  contract,
  output,
  blockTag,
}: {
  tokenName?: string;
  contract: IERC721A;
  output?: string;
  blockTag?: BigNumber | string;
}) {
  tokenName = tokenName || (await contract.name());
  console.log(`Reading ${tokenName} metadata`);

  const tokenLength = (
    await contract.totalSupply({
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
    await contract.ownerOf(0);
    token0Exists = true;
  } catch (e) {
    // nothing
  }

  console.log(
    `Found ${tokenLength} tokens starting at ${token0Exists ? 0 : 1}`
  );

  const owners: string[] = [];
  for (
    let i = token0Exists ? 0 : 1;
    i < (token0Exists ? tokenLength : tokenLength + 1);
    i += 20
  ) {
    const tokenIds = Array.from(
      { length: Math.min(20, tokenLength - i) },
      (_, j) => j + i
    );
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
  }
  const uniqueOwners = [...new Set(owners)];
  console.log(`Found ${uniqueOwners.length} unique owners`);
  await fs.promises.writeFile(
    output || `${tokenName}.txt`,
    uniqueOwners.join("\n"),
    "utf8"
  );
}
