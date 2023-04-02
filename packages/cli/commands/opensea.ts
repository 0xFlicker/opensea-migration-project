import fetch from "node-fetch";
import fs from "fs";
import { stringify } from "csv-stringify";
import { extension } from "mime-types";
import { Subject, mergeMap, tap } from "rxjs";
import cliProgress from "cli-progress";
import {
  AssetEvent,
  CollectionAsset,
  IMetadata,
  IOpenSeaMetadata,
  Owner,
} from "../metadata";
import { retryWithBackoff } from "../retry";
import { URLSearchParams } from "url";
import { Contract, providers, utils } from "ethers";
import { Ierc721AFactory } from "../typechain/Ierc721AFactory";

const MAINNET_OPENSEA_API = "https://api.opensea.io/api/v1";
const TESTNET_OPENSEA_API = "https://testnets-api.opensea.io/api/v1";
const GET_ASSETS = "https://api.opensea.io/api/v1/assets";

interface OpenSeaPagination {
  next?: string;
  previous?: string;
}

interface GetAssetsResponse extends OpenSeaPagination {
  assets: CollectionAsset[];
}

interface GetAssetEventsResponse extends OpenSeaPagination {
  asset_events: AssetEvent[];
}

interface GetAssetOwnersResponse extends OpenSeaPagination {
  owners: Owner[];
}

async function* fetchWithPagination<T>(
  fetcher: (next?: string) => Promise<
    {
      next?: string;
      previous?: string;
    } & T
  >
) {
  let next: string | undefined = undefined;
  while (true) {
    const result: {
      next?: string;
      previous?: string;
    } & T = await retryWithBackoff(() => fetcher(next), 5, 250);
    yield result;
    if (!result.next) {
      break;
    }
    next = result.next;
  }
}

async function fetchOwnerOfToken(
  apiKey: string,
  collectionAddress: string,
  tokenId: string,
  queryParameters: URLSearchParams
) {
  return retryWithBackoff(
    async () => {
      const response = await fetch(
        `https://api.opensea.io/api/v1/asset/${collectionAddress}/${tokenId}/owners?${queryParameters.toString()}`,
        {
          headers: {
            "X-API-KEY": apiKey,
          },
        }
      );
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("retry-after") ?? "0");
        if (retryAfter >= 0) {
          // console.log(`Rate limited, retrying in ${retryAfter}s`);
          await new Promise((resolve) =>
            setTimeout(resolve, (retryAfter + 1) * 1000)
          );
        }
        throw new Error("Rate limited");
      }
      return (await response.json()) as GetAssetOwnersResponse;
    },
    5,
    1000
  );
}

export async function fetchSpecificAssets({
  collectionAddress,
  collectionSlug,
  tokenIds,
}: {
  collectionAddress: string;
  collectionSlug: string;
  tokenIds: string[];
}) {
  const incomingAssets = new Subject<string>();
  await fs.promises.mkdir(`./.metadata/${collectionSlug}`, { recursive: true });
  const finished = new Promise<void>((resolve, reject) =>
    incomingAssets
      .asObservable()
      .pipe(
        mergeMap(async (tokenId) => {
          const metadataResponse = await retryWithBackoff(
            () =>
              fetch(
                `https://api.opensea.io/api/v2/metadata/matic/${collectionAddress}/${tokenId}`
              ),
            5,
            250
          );
          const metadata = (await metadataResponse.json()) as IMetadata;
          const imageUrl = new URL(metadata.image);
          imageUrl.search = "";
          imageUrl.hostname = "lh3.googleusercontent.com";
          imageUrl.pathname = `${imageUrl.pathname.replace("/gae/", "/")}=d`;
          const imageResponse = await retryWithBackoff(
            async () => fetch(imageUrl.toString()),
            5,
            250
          );

          const imageExtension = extension(
            imageResponse.headers.get("content-type") || "image/png"
          );

          const imageBuffer = await imageResponse.arrayBuffer();

          console.log(`Writing image for ${metadata.name}`);
          const image = Buffer.from(imageBuffer);
          const imageFile = `${tokenId}.${imageExtension}`;
          await fs.promises.writeFile(
            `./.metadata/${collectionSlug}/${imageFile}`,
            image
          );
          console.log(`Writing metadata for ${metadata.name}`);
          await fs.promises.writeFile(
            `./.metadata/${collectionSlug}/${tokenId}.json`,
            JSON.stringify(metadata, null, 2),
            "utf8"
          );
        }, 6)
      )
      .subscribe({
        complete: resolve,
        error: reject,
      })
  );
  for (const tokenId of tokenIds) {
    incomingAssets.next(tokenId);
  }
  incomingAssets.complete();
  try {
    await finished;
  } catch (err) {
    console.error(err);
  }
}

export async function downloadMetadata({
  collectionSlug,
  apiKey,
}: {
  collectionSlug: string;
  apiKey: string;
}) {
  const incomingAssets = new Subject<CollectionAsset>();

  // join incomingAssets and incomingImages and wait for them to complete
  const finished = Promise.all([
    new Promise<void>((resolve, reject) => {
      incomingAssets
        .asObservable()
        .pipe(
          mergeMap(async (asset) => {
            let imageUrl = new URL(
              asset.image_original_url
                ? asset.image_original_url
                : asset.image_url
            );

            await fs.promises.mkdir(`./.metadata/${collectionSlug}`, {
              recursive: true,
            });
            console.log(`Downloading image for ${asset.name}`);
            return {
              asset,
              imageUrl,
              imageResponse: await Promise.resolve().then(async () => {
                return await retryWithBackoff(
                  async () => {
                    imageUrl.search = "";
                    imageUrl.hostname = "lh3.googleusercontent.com";
                    imageUrl.pathname = `${imageUrl.pathname.replace(
                      "/gae/",
                      "/"
                    )}=d`;
                    const imageResponse = await fetch(imageUrl.toString());
                    if (!imageResponse.ok) {
                      throw new Error(
                        `Failed to download image for ${asset.name}: ${imageResponse.status} ${imageResponse.statusText}`
                      );
                    }
                    return imageResponse;
                  },
                  5,
                  250
                );
              }),
              events: await Promise.resolve().then(async () => {
                const assetEvents: AssetEvent[] = [];
                for await (const result of fetchWithPagination<{
                  asset_events: AssetEvent[];
                }>(async (next) => {
                  return retryWithBackoff(
                    async () => {
                      const queryParameters = new URLSearchParams({
                        ...(next ? { cursor: next } : {}),
                        asset_contract_address: asset.asset_contract.address,
                        token_id: asset.token_id,
                      });

                      const response = await fetch(
                        `https://api.opensea.io/api/v1/events?${queryParameters.toString()}`,
                        {
                          headers: {
                            "X-API-KEY": apiKey,
                          },
                        }
                      );
                      if (response.status === 429) {
                        const retryAfter = parseInt(
                          response.headers.get("retry-after") ?? "0"
                        );
                        if (retryAfter >= 0) {
                          console.log(
                            `Rate limited, retrying in ${retryAfter}s`
                          );
                          await new Promise((resolve) =>
                            setTimeout(resolve, (retryAfter + 1) * 1000)
                          );
                        }
                        throw new Error("Rate limited");
                      }
                      const result = await response.json();
                      return result as GetAssetEventsResponse;
                    },
                    5,
                    250
                  );
                })) {
                  for (const assetEvent of result.asset_events ?? []) {
                    delete assetEvent.asset;
                    assetEvents.push(assetEvent);
                  }
                }
                return assetEvents;
              }),
              owners: await Promise.resolve().then(async () => {
                const owners: Owner[] = [];
                for await (const ownerBatch of fetchWithPagination<{
                  owners: Owner[];
                }>(async (next) => {
                  const queryParameters = new URLSearchParams({
                    ...(next ? { cursor: next } : {}),
                  });

                  const response = await fetch(
                    `https://api.opensea.io/api/v1/asset/${
                      asset.asset_contract.address
                    }/${asset.token_id}/owners?${queryParameters.toString()}`,
                    {
                      headers: {
                        "X-API-KEY": apiKey,
                      },
                    }
                  );
                  if (response.status === 429) {
                    const retryAfter = parseInt(
                      response.headers.get("retry-after") ?? "0"
                    );
                    if (retryAfter >= 0) {
                      console.log(`Rate limited, retrying in ${retryAfter}s`);
                      await new Promise((resolve) =>
                        setTimeout(resolve, (retryAfter + 1) * 1000)
                      );
                    }
                    throw new Error("Rate limited");
                  }
                  return (await response.json()) as GetAssetOwnersResponse;
                })) {
                  for (const owner of ownerBatch.owners ?? []) {
                    owners.push(owner);
                  }
                }
                return owners;
              }),
            };
          }, 1),
          tap(async ({ asset, imageResponse, events, owners }) => {
            console.log(`Writing image for ${asset.name}`);
            const image = Buffer.from(await imageResponse.arrayBuffer());
            const imageFile = `${asset.token_id}.${extension(
              imageResponse.headers.get("content-type") ?? ""
            )}`;
            await fs.promises.writeFile(
              `./.metadata/${asset.collection.slug}/${imageFile}`,
              image
            );
            console.log(`Writing metadata for ${asset.name}`);

            const originalContractAddress = asset.asset_contract.address;
            const originalTokenId = asset.token_id;
            const metadata: IOpenSeaMetadata = {
              name: asset.name,
              description: asset.description,
              image: `./${imageFile}`,
              original_contract_address: originalContractAddress,
              original_token_id: originalTokenId,
              attributes: asset.traits,
              owners: owners,
              events: events,
            };
            await fs.promises.writeFile(
              `./.metadata/${asset.collection.slug}/${asset.token_id}.json`,
              JSON.stringify(metadata, null, 2),
              "utf8"
            );
          })
        )
        .subscribe({
          complete() {
            console.log("Assets complete");
            resolve();
          },
          error(err) {
            reject(err);
          },
        });
    }),
  ]);

  for await (const batchAssets of fetchWithPagination(async (next) => {
    const queryParameters = new URLSearchParams({
      collection: collectionSlug,
      ...(next ? { cursor: next } : {}),
    });

    const response = await fetch(
      `${GET_ASSETS}?${queryParameters.toString()}`,
      {
        headers: {
          "X-API-KEY": apiKey,
        },
      }
    );
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("retry-after") ?? "0");
      if (retryAfter >= 0) {
        console.log(`Rate limited, retrying in ${retryAfter}s`);
        await new Promise((resolve) =>
          setTimeout(resolve, (retryAfter + 1) * 1000)
        );
      }
      throw new Error("Rate limited");
    }

    return (await response.json()) as GetAssetsResponse;
  })) {
    for (const asset of batchAssets.assets ?? []) {
      console.log(`Processing ${asset.name}`);
      incomingAssets.next(asset);
    }
  }

  incomingAssets.complete();
  try {
    await finished;
  } catch (err) {
    console.error(err);
  }
}

export async function generateOpenseaAirdropListFromMetadata({
  collectionSlug,
  outputCsv,
  outputJson,
}: {
  collectionSlug: string;
  outputCsv?: string;
  outputJson?: string;
}) {
  const metadataDir = `./.metadata/${collectionSlug}/metadata`;
  const metadataFiles = await fs.promises.readdir(metadataDir);
  const metadatas: IOpenSeaMetadata[] = [];
  for (let i = 0; i < metadataFiles.length; i += 10) {
    const batch = metadataFiles.slice(i, i + 10);
    metadatas.push(
      ...(await Promise.all(
        batch.map(
          async (metadataFile) =>
            JSON.parse(
              await fs.promises.readFile(
                `${metadataDir}/${metadataFile}`,
                "utf8"
              )
            ) as IOpenSeaMetadata
        )
      ))
    );
  }
  const data: [string, string][] = [];
  for (const metadata of metadatas) {
    if (!metadata.id) {
      throw new Error(`Token ID undefined for ${metadata.name}`);
    }
    if (!metadata.owners) {
      throw new Error(`Owners undefined for ${metadata.name}`);
    }
    if (metadata.owners.length === 0) {
      throw new Error(`No owners for ${metadata.name}`);
    }
    const owner = metadata.owners[metadata.owners.length - 1];
    data.push([String(metadata.id), owner.owner.address]);
  }
  data.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  if (outputCsv) {
    const result = await new Promise<string>((resolve, reject) =>
      stringify(
        data,
        {
          header: true,
          columns: ["tokenId", "ownerOf"],
        },
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        }
      )
    );
    await fs.promises.writeFile(outputCsv, result, "utf8");
  }
  if (outputJson) {
    await fs.promises.writeFile(
      outputJson,
      JSON.stringify(
        data.map((a) => a[1]),
        null,
        2
      ),
      "utf8"
    );
  }
}

export async function updateOwnerOfMetadata({
  apiKey,
  metadataFolder,
}: {
  apiKey: string;
  metadataFolder: string;
}) {
  const metadataFolderPrefix = `./.metadata/${metadataFolder}/metadata`;
  const metadataFiles = await fs.promises.readdir(metadataFolderPrefix);
  for (const metadataFile of metadataFiles) {
    const metadata = JSON.parse(
      await fs.promises.readFile(
        `${metadataFolderPrefix}/${metadataFile}`,
        "utf8"
      )
    ) as IOpenSeaMetadata;
    const originalTokenId = metadata.original_token_id;
    const originalContractAddress = metadata.original_contract_address;
    if (!originalTokenId || !originalContractAddress) {
      throw new Error(
        `Original token ID or contract address undefined for ${metadata.name}`
      );
    }
    // Load the original owner data
    const ownersResponse = await fetchOwnerOfToken(
      apiKey,
      originalContractAddress,
      originalTokenId,
      new URLSearchParams()
    );
    const owners = ownersResponse.owners;
    // Verify that the owner data is the same
    if (!metadata.owners) {
      throw new Error(`Owners undefined for ${metadata.name}`);
    }
    if (
      owners.length !== metadata.owners.length ||
      owners.some(
        (o, i) => o.owner.address !== metadata.owners?.[i].owner.address
      )
    ) {
      console.log(
        `Owner data mismatch for ${metadata.name} (${originalTokenId})`
      );
    }
  }
}

export async function refreshOpenSeaMetadata({
  collectionAddress,
  from,
  to,
  apiKey,
  testnet,
  provider,
}: {
  collectionAddress: string;
  apiKey: string;
  testnet?: boolean;
  from?: number;
  to?: number;
  provider: providers.Provider;
}) {
  // console.log({ collectionAddress, from, to, apiKey, testnet });
  const incomingAssets = new Subject<{
    tokenId: string;
    contractAddress: string;
  }>();
  const progress = new cliProgress.MultiBar(
    {
      clearOnComplete: false,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );

  const refreshMetadataProgress = progress.create(
    0,
    0,
    {
      assetName: "Refreshing metadata",
    },
    {
      format: "{bar} {percentage}% | {value}/{total} | {eta} | {assetName}",
    }
  );

  let count = 0;
  const finished = new Promise<void>((resolve, reject) => {
    incomingAssets
      .asObservable()
      .pipe(
        mergeMap(async (asset) => {
          refreshMetadataProgress.increment();
          const queryParameters = new URLSearchParams({
            force_update: "true",
          });
          await retryWithBackoff(
            async () => {
              const response = await fetch(
                `${testnet ? TESTNET_OPENSEA_API : MAINNET_OPENSEA_API}/asset/${
                  asset.contractAddress
                }/${asset.tokenId}?${queryParameters.toString()}`,
                {
                  headers: testnet
                    ? {}
                    : {
                        "X-API-KEY": apiKey,
                      },
                }
              );
              if (response.status === 429) {
                const retryAfter = parseInt(
                  response.headers.get("retry-after") ?? "0"
                );

                if (retryAfter >= 0) {
                  // progress.log(`Rate limited, retrying in ${retryAfter}s\n`);
                  const lazyWaitProgress = progress.create(
                    retryAfter + 1,
                    0,
                    {},
                    {
                      format: "{bar} | {eta} | Waiting for rate limit to reset",
                    }
                  );
                  const countDown = setInterval(() => {
                    if (
                      lazyWaitProgress.getProgress() !==
                      lazyWaitProgress.getTotal()
                    ) {
                      lazyWaitProgress.increment();
                    }
                  }, 1000);
                  await new Promise((resolve) =>
                    setTimeout(resolve, (retryAfter + 1) * 1000)
                  );
                  clearInterval(countDown);
                  lazyWaitProgress.stop();
                  progress.remove(lazyWaitProgress);
                }
                throw new Error("Rate limited");
              }
              // let's ignore 404s for now
              if (response.status !== 200) {
                // console.log(
                //   "\n\n",
                //   JSON.stringify([...response.headers.entries()])
                // );
                throw new Error(
                  `Failed to refresh metadata for ${asset.contractAddress}/${asset.tokenId} with status ${response.status}`
                );
              }
            },
            5,
            1000
          );
        }, 1)
      )
      .subscribe({
        complete() {
          progress.log("Assets complete\n");
          resolve();
        },
        error(err) {
          reject(err);
        },
      });
  });
  // get collection details
  // console.log(
  //   JSON.stringify(
  //     await retryWithBackoff(
  //       async () => {
  //         const url = `${
  //           testnet ? TESTNET_OPENSEA_API : MAINNET_OPENSEA_API
  //         }/collection/${collectionSlug}`;
  //         const response = await fetch(url, {
  //           headers: testnet
  //             ? {}
  //             : {
  //                 "X-API-KEY": apiKey,
  //               },
  //         });
  //         if (response.status === 429) {
  //           const retryAfter = parseInt(
  //             response.headers.get("retry-after") ?? "0"
  //           );
  //           if (retryAfter >= 0) {
  //             // progress.log(`Rate limited, retrying in ${retryAfter}s\n`);
  //             await new Promise((resolve) =>
  //               setTimeout(resolve, (retryAfter + 1) * 1000)
  //             );
  //           }
  //           throw new Error("Rate limited");
  //         }
  //         if (response.status !== 200) {
  //           throw new Error(
  //             `Failed to fetch collection details for ${collectionSlug} with status ${response.status} at ${url}`
  //           );
  //         }
  //         return await response.json();
  //       },
  //       5,
  //       1000
  //     ),
  //     null,
  //     2
  //   )
  // );
  // for await (const batchAssets of fetchWithPagination(async (next) => {
  //   const queryParameters = new URLSearchParams({
  //     collection: collectionSlug,
  //     ...(next ? { cursor: next } : {}),
  //   });

  //   const response = await fetch(
  //     `${
  //       testnet ? TESTNET_OPENSEA_API : MAINNET_OPENSEA_API
  //     }/assets?${queryParameters.toString()}`,
  //     {
  //       headers: testnet
  //         ? {}
  //         : {
  //             "X-API-KEY": apiKey,
  //           },
  //     }
  //   );
  //   if (response.status === 429) {
  //     const retryAfter = parseInt(response.headers.get("retry-after") ?? "0");
  //     if (retryAfter >= 0) {
  //       progress.log(`Rate limited, retrying in ${retryAfter}s\n`);
  //       await new Promise((resolve) =>
  //         setTimeout(resolve, (retryAfter + 1) * 1000)
  //       );
  //     }
  //     throw new Error("Rate limited");
  //   }

  //   return (await response.json()) as GetAssetsResponse;
  // })) {
  //   count += batchAssets.assets?.length ?? 0;
  //   refreshMetadataProgress.setTotal(count);
  //   loadMetadataProgress.setTotal(count);
  //   for (const asset of batchAssets.assets ?? []) {
  //     incomingAssets.next(asset);
  //     loadMetadataProgress.increment();
  //   }
  // }

  from = from ?? 0;
  if (!to) {
    // get totalSupply from contract
    const contract = Ierc721AFactory.connect(collectionAddress, provider);
    to = (await contract.totalSupply()).toNumber();
    // Check if there is a 0 token
    try {
      await contract.tokenURI(0);
      to--;
    } catch (err) {
      // ignore
    }
  }
  const total = to - from;
  refreshMetadataProgress.setTotal(total);
  for (let i = from; i < to; i++) {
    incomingAssets.next({
      tokenId: i.toString(),
      contractAddress: collectionAddress,
    });
  }
  incomingAssets.complete();
  try {
    await finished;
  } catch (err) {
    console.error(err);
  }
}
