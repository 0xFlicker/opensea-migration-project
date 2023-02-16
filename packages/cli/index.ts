import { Command } from "commander";
import fs from "fs";
import dotenv from "dotenv";
import { CID, create as createIpfsHttpClient } from "ipfs-http-client";
import { extractMetadata } from "./commands/metadataExtract";
import { prepareMetadata } from "./commands/metadataPrepare";
import { airdrop as airdropCommand } from "./commands/airdrop";
import { BigNumber, providers, Wallet } from "ethers";
import { Ierc721AFactory } from "./typechain/Ierc721AFactory";
import { ownersOfTrait } from "./commands/ownersOfTrait";
import {
  downloadMetadata,
  fetchSpecificAssets,
  generateOpenseaAirdropListFromMetadata,
  updateOwnerOfMetadata,
} from "./commands/opensea";
import fetch from "node-fetch";
import { ipfsPin, ipfsPinSingle } from "./commands/ipfs-pin";
import { ownersOf } from "./commands/ownsersOf";
import { hunnysSeasonsAirdropList } from "./commands/hunnysSeasonsAirdropPull";
import { hunnysSeasonsAirdrop } from "./commands/hunnysSeasonsAirdrop";

declare var global: any;
global.fetch = fetch;

const program = new Command();
program.name("contractooor");

const walletCommands = program.command("wallet");
walletCommands
  .command("seed")
  .description("Generate a new wallet seed")
  .action(() => {
    const seedPhrase = Wallet.createRandom().mnemonic.phrase;
    const separator = "-".repeat(seedPhrase.length);
    console.log(separator);
    console.log(seedPhrase);
    console.log(separator);
    // Now print for the first 10 addresses
    for (let i = 0; i < 10; i++) {
      const wallet = Wallet.fromMnemonic(seedPhrase, `m/44'/60'/0'/0/${i}`);
      console.log(`${i}: ${wallet.address}`);
    }
  });

program
  .command("airdrop <csv>")
  .option("-c, --contract <contractAddress>", "The contract address to send to")
  .option("--count <count>", "The number of transactions to send per batch")
  .option(
    "-s, --start-from-batch <startFromBatch>",
    "The batch to start from",
    Number,
    Number(1)
  )
  .action(async (csv, { contract, startFromBatch, count }) => {
    await airdropCommand({
      csv,
      contractAddress: contract,
      batchCount: Number(count),
      startFromBatch: 1,
    });
  });

program
  .command("hunnys-seasons-airdrop <details>")
  .option(
    "-b, --batch-count <batchCount>",
    "The number of tx to send in a batch",
    Number,
    250
  )
  .option(
    "-s, --start-from-batch <startFromBatch>",
    "The batch to start from",
    Number,
    1
  )
  .requiredOption(
    "-t, --start-with-token-id <startWithTokenId>",
    "The token id to start from",
    Number
  )
  .option("-d, --data <data>", "The optional data to send with the transaction")
  .action(
    async (details, { data, batchCount, startFromBatch, startWithTokenId }) => {
      const airdropDetails = JSON.parse(
        await fs.promises.readFile(details, "utf8")
      );
      await hunnysSeasonsAirdrop({
        airdropDetails,
        batchCount,
        startFromBatch,
        startWithTokenId,
        data,
      });
    }
  );

const metadataCommands = program.command("metadata");

metadataCommands
  .command("pull")
  .option("-c, --contract <contract>", "contract address")
  .option("--ipfs <ipfs>", "ipfs url")
  .option(
    "--infura-ipfs-project-id <infura-ipfs-project-id>",
    "ipfs project id"
  )
  .option("--infura-ipfs-secret <infura-ipfs-secret>", "ipfs secret")
  .option("-r, --rpc <rpc-url>", "node url")
  .option("-b, --block <block>", "block number")
  .action(
    async ({
      contract: contractAddress,
      ipfs,
      infuraIpfsProjectId,
      infuraIpfsSecret,
      rpc: rpcUrl,
      block,
    }) => {
      const dotEnv = dotenv.config().parsed;
      const env = { ...process.env, ...dotEnv };
      infuraIpfsProjectId = infuraIpfsProjectId || env.INFURA_IPFS_PROJECT_ID;
      infuraIpfsSecret = infuraIpfsSecret || env.INFURA_IPFS_SECRET;
      ipfs = ipfs || env.IPFS_API_URL;

      let ipfsBasicAuth: string | null = null;
      if (infuraIpfsProjectId && infuraIpfsSecret) {
        ipfsBasicAuth = `Basic ${Buffer.from(
          `${infuraIpfsProjectId}:${infuraIpfsSecret}`
        ).toString("base64")}`;
      }
      const ipfsUrl = new URL(ipfs || "https://ipfs.infura.io:5001");
      const ipfsClient = createIpfsHttpClient({
        host: ipfsUrl.hostname,
        protocol: ipfsUrl.protocol.replace(":", ""),
        port: Number(ipfsUrl.port),
        ...(ipfsBasicAuth ? { headers: { authorization: ipfsBasicAuth } } : {}),
      });
      const provider = new providers.JsonRpcProvider(rpcUrl);
      const contract = Ierc721AFactory.connect(contractAddress, provider);
      if (block && Number.isInteger(Number(block))) {
        block = BigNumber.from(block);
      }
      await extractMetadata({
        contract,
        ipfsClient,
        blockTag: block,
      });
    }
  );

metadataCommands
  .command("owners-of")
  .option("-s, --slug <slug>", "collection slug")
  .option("-o, --out <out>", "output csv file")
  .option("-j, --out-json <out>", "output json file")
  .action(async ({ slug, out, outJson }) => {
    await generateOpenseaAirdropListFromMetadata({
      collectionSlug: slug,
      outputCsv: out,
      outputJson: outJson,
    });
  });

metadataCommands
  .command("prepare")
  .option("-i, --in-dir <inDir>", "input directory")
  .option("-o, --out-dir <outDir>", "output directory")
  .option("-a, --giphy-api-key <giphyApiKey>", "giphy api key")
  .option("-s, --giphy-search-term <giphySearchTerm>", "giphy search term")
  .option("-t, --testnet", "testnet (use giphy random images")
  .option("-h, --hunnys", "Custom hunny attribute")
  .option("-m, --mint-attribute", "Add original mint date attribute")
  .option("-p, --prefix <prefix>", "Prefix for the image")
  .action(
    async ({
      inDir,
      outDir,
      giphyApiKey,
      giphySearchTerm,
      testnet,
      hunnys,
      mintAttribute,
      prefix,
    }) => {
      const env = { ...process.env, ...dotenv.config().parsed };
      giphyApiKey = giphyApiKey || env.GIPHY_API_KEY;
      await prepareMetadata({
        inDir,
        outDir,
        giphyApiKey,
        giphySearchTerm,
        testImages: testnet,
        hunnys,
        mintAttribute,
        imagePrefix: prefix,
      });
    }
  );

program
  .command("owners-of")
  .option("-c, --contract-name <contract>", "contract name")
  .option("-t, --trait-name <trait>", "trait name")
  .option("-v, --trait-value <value>", "trait value")
  .option("-o, --output <output>", "output file")
  .option("-r, --rpc <rpc-url>", "node url")
  .option("-a, --contract <contract>", "contract address")
  .option("-b, --block <block>", "block number")
  .action(
    async ({
      contract: contractAddress,
      rpc: rpcUrl,
      contractName,
      traitName,
      traitValue,
      output,
      block,
    }) => {
      const provider = new providers.JsonRpcProvider(rpcUrl);
      const contract = Ierc721AFactory.connect(contractAddress, provider);
      if (block && Number.isInteger(Number(block))) {
        block = BigNumber.from(block);
      }
      if (!traitName) {
        await ownersOf({
          contract,
          tokenName: contractName,
          output,
          blockTag: block,
        });
      } else {
        await ownersOfTrait({
          tokenName: contractName,
          traitName,
          traitValue,
          contract,
          output,
          blockTag: block,
        });
      }
    }
  );

program
  .command("hunnys-seasons-airdrop-list")
  .option("-o, --output <output>", "output file")
  .option("-r, --rpc <rpc-url>", "node url")
  .option("-b, --block <block>", "block number")
  .action(async ({ rpc: rpcUrl, output, block }) => {
    const provider = new providers.JsonRpcProvider(rpcUrl);
    await hunnysSeasonsAirdropList({
      provider,
      output,
      blockTag: block,
    });
  });

metadataCommands
  .command("opensea-pull")
  .option("-s, --slug <slug>", "collection slug")
  .option("-k, --key <key>", "opensea api key")
  .option("-c, --contract <contract>", "contract address")
  .option("-t, --token-ids <tokenIds>", "token ids")
  .action(async ({ slug, key, contract, tokenIds }) => {
    const env = { ...process.env, ...dotenv.config().parsed };
    key = key || env.OPENSEA_API_KEY;
    if (contract && tokenIds) {
      await fetchSpecificAssets({
        collectionAddress: contract,
        tokenIds: tokenIds.split(","),
        collectionSlug: slug,
      });
    } else {
      await downloadMetadata({ collectionSlug: slug, apiKey: key });
    }
  });

metadataCommands
  .command("opensea-update")
  .option("-m, --metadata <metadata>", "metadata folder name")
  .option("-k, --key <key>", "opensea api key")
  .action(async ({ metadata, key }) => {
    const env = { ...process.env, ...dotenv.config().parsed };
    key = key || env.OPENSEA_API_KEY;
    await updateOwnerOfMetadata({
      metadataFolder: metadata,
      apiKey: key,
    });
  });

const ipfsCommands = program.command("ipfs");

ipfsCommands
  .command("pin-file <file>")
  .option("-i, --ipfs <ipfs>", "ipfs url")
  .option(
    "--infura-ipfs-project-id <infura-ipfs-project-id>",
    "ipfs project id"
  )
  .option("--infura-ipfs-secret <infura-ipfs-secret>", "ipfs secret")
  .action(async (file, { ipfs, infuraIpfsProjectId, infuraIpfsSecret }) => {
    const dotEnv = dotenv.config().parsed;
    const env = { ...process.env, ...dotEnv };
    infuraIpfsProjectId = infuraIpfsProjectId || env.INFURA_IPFS_PROJECT_ID;
    infuraIpfsSecret = infuraIpfsSecret || env.INFURA_IPFS_SECRET;
    ipfs = ipfs || env.IPFS_API_URL;

    let ipfsBasicAuth: string | null = null;
    if (infuraIpfsProjectId && infuraIpfsSecret) {
      ipfsBasicAuth = `Basic ${Buffer.from(
        `${infuraIpfsProjectId}:${infuraIpfsSecret}`
      ).toString("base64")}`;
    }
    const ipfsUrl = new URL(ipfs || "https://ipfs.infura.io:5001");
    const ipfsClient = createIpfsHttpClient({
      host: ipfsUrl.hostname,
      protocol: ipfsUrl.protocol.replace(":", ""),
      port: Number(ipfsUrl.port),
      ...(ipfsBasicAuth ? { headers: { authorization: ipfsBasicAuth } } : {}),
    });

    try {
      await ipfsPinSingle({
        ipfsClient,
        localFile: file,
      });
    } catch (e) {
      console.error(e);
    }
  });

ipfsCommands
  .command("pin-metadata <folder>")
  .option("-i, --ipfs <ipfs>", "ipfs url")
  .option(
    "--infura-ipfs-project-id <infura-ipfs-project-id>",
    "ipfs project id"
  )
  .option("--infura-ipfs-secret <infura-ipfs-secret>", "ipfs secret")
  .option("--pin", "pin metadata")
  .action(
    async (inFolder, { ipfs, infuraIpfsProjectId, infuraIpfsSecret, pin }) => {
      const dotEnv = dotenv.config().parsed;
      const env = { ...process.env, ...dotEnv };
      infuraIpfsProjectId = infuraIpfsProjectId || env.INFURA_IPFS_PROJECT_ID;
      infuraIpfsSecret = infuraIpfsSecret || env.INFURA_IPFS_SECRET;
      ipfs = ipfs || env.IPFS_API_URL;

      let ipfsBasicAuth: string | null = null;
      if (infuraIpfsProjectId && infuraIpfsSecret) {
        ipfsBasicAuth = `Basic ${Buffer.from(
          `${infuraIpfsProjectId}:${infuraIpfsSecret}`
        ).toString("base64")}`;
      }
      const ipfsUrl = new URL(ipfs || "https://ipfs.infura.io:5001");
      const ipfsClient = createIpfsHttpClient({
        host: ipfsUrl.hostname,
        protocol: ipfsUrl.protocol.replace(":", ""),
        port: Number(ipfsUrl.port),
        ...(ipfsBasicAuth ? { headers: { authorization: ipfsBasicAuth } } : {}),
      });
      try {
        await ipfsPin({
          ipfsClient,
          localFolder: inFolder,
          pin,
        });
      } catch (e) {
        console.error(e);
      }
    }
  );

ipfsCommands
  .command("pin <cid>")
  .option("-i, --ipfs <ipfs>", "ipfs url")
  .option(
    "--infura-ipfs-project-id <infura-ipfs-project-id>",
    "ipfs project id"
  )
  .option("--infura-ipfs-secret <infura-ipfs-secret>", "ipfs secret")
  .action(async (cid, { ipfs, infuraIpfsProjectId, infuraIpfsSecret }) => {
    const dotEnv = dotenv.config().parsed;
    const env = { ...process.env, ...dotEnv };
    infuraIpfsProjectId = infuraIpfsProjectId || env.INFURA_IPFS_PROJECT_ID;
    infuraIpfsSecret = infuraIpfsSecret || env.INFURA_IPFS_SECRET;
    ipfs = ipfs || env.IPFS_API_URL;

    let ipfsBasicAuth: string | null = null;
    if (infuraIpfsProjectId && infuraIpfsSecret) {
      ipfsBasicAuth = `Basic ${Buffer.from(
        `${infuraIpfsProjectId}:${infuraIpfsSecret}`
      ).toString("base64")}`;
    }
    const ipfsUrl = new URL(ipfs || "https://ipfs.infura.io:5001");
    const ipfsClient = createIpfsHttpClient({
      host: ipfsUrl.hostname,
      protocol: ipfsUrl.protocol.replace(":", ""),
      port: Number(ipfsUrl.port),
      ...(ipfsBasicAuth ? { headers: { authorization: ipfsBasicAuth } } : {}),
    });
    try {
      const parsedCID = CID.parse(cid);
      await ipfsClient.pin.add(parsedCID);
    } catch (e) {
      console.error(e);
    }
  });

program.parse(process.argv);
