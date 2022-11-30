import { Command } from "commander";
import dotenv from "dotenv";
import { create as createIpfsHttpClient } from "ipfs-http-client";
import { extractMetadata } from "./commands/metadataExtract";
import { prepareMetadata } from "./commands/metadataPrepare";
import { airdrop as airdropCommand } from "./commands/airdrop";
import { providers, Wallet } from "ethers";
import { IERC721A__factory } from "./typechain";
import { ownersOfTrait } from "./commands/ownersOfTrait";
import {
  downloadMetadata,
  fetchSpecificAssets,
  generateOpenseaAirdropListFromMetadata,
} from "./commands/opensea";
import fetch from "node-fetch";
import { ipfsPin } from "./commands/ipfs-pin";

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
  .option(
    "-p, --private-key <privateKey>",
    "Private key of the account to send from"
  )
  .option("-r, --rpc <rpcUrl>", "The RPC URL to connect to")
  .option("-c, --contract <contractAddress>", "The contract address to send to")
  .option("-f, --from <fromAddress>", "The from address to send from")
  .option("-d, --data <data>", "The optional data to send with the transaction")
  .option("--count <count>", "The number of transactions to send")
  .action(async (csv, { privateKey, rpc, contract, from, data, count }) => {
    await airdropCommand({
      csv,
      privateKey,
      rpcUrl: rpc,
      contractAddress: contract,
      fromAddress: from,
      data,
      count: Number(count),
    });
  });

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
  .action(
    async ({
      contract: contractAddress,
      ipfs,
      infuraIpfsProjectId,
      infuraIpfsSecret,
      rpc: rpcUrl,
    }) => {
      let ipfsBasicAuth: string | null = null;
      if (infuraIpfsProjectId && infuraIpfsSecret) {
        ipfsBasicAuth = `Basic ${Buffer.from(
          `${infuraIpfsProjectId}:${infuraIpfsSecret}`
        ).toString("base64")}`;
      }
      const ipfsClient = createIpfsHttpClient({
        host: ipfs || "ipfs.infura.io:5001",
        protocol: "https",
        ...(ipfsBasicAuth ? { headers: { authorization: ipfsBasicAuth } } : {}),
      });
      const provider = new providers.JsonRpcProvider(rpcUrl);
      const contract = IERC721A__factory.connect(contractAddress, provider);
      await extractMetadata({
        contract,
        ipfsClient,
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
  .action(
    async ({
      contract: contractAddress,
      rpc: rpcUrl,
      contractName,
      traitName,
      traitValue,
      output,
    }) => {
      const provider = new providers.JsonRpcProvider(rpcUrl);
      const contract = IERC721A__factory.connect(contractAddress, provider);

      await ownersOfTrait({
        tokenName: contractName,
        traitName,
        traitValue,
        contract,
        output,
      });
    }
  );

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

const ipfsCommands = program.command("ipfs");
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
program.parse(process.argv);
