import * as dotenv from "dotenv";

import fs from "fs";
import { HardhatUserConfig, task, types } from "hardhat/config";
import "hardhat-deploy";
import "@nomiclabs/hardhat-etherscan";
import { TASK_VERIFY_GET_MINIMUM_BUILD } from "@nomiclabs/hardhat-etherscan/dist/src/constants";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { TASK_COMPILE_SOLIDITY_EMIT_ARTIFACTS } from "hardhat/builtin-tasks/task-names";
import { node_url, accounts, addForkConfiguration } from "./utils/network";
import { utils } from "ethers";
import {
  BuildInfo,
  CompilationJob,
  CompilerInput,
  CompilerOutput,
  SolcBuild,
} from "hardhat/types";
import { resolve } from "path";

dotenv.config();

// override TASK_COMPILE_SOLIDITY_EMIT_ARTIFACTS to extract the buildInfo
interface Build {
  compilationJob: CompilationJob;
  input: CompilerInput;
  output: CompilerOutput;
  solcBuild: any;
}
task(
  TASK_COMPILE_SOLIDITY_EMIT_ARTIFACTS,
  async (args: Build, hre, runSuper) => {
    await fs.promises.rm(resolve(__dirname, "../www/src/data"), {
      recursive: true,
    });

    const artifacts = await runSuper(args);
    // Get the first file inside of artifacts/build-info
    const buildInfo: BuildInfo["input"] = args.input;
    const solcVersion = args.solcBuild.longVersion;
    // Save to ../www/src/data/build-info.json
    await fs.promises.mkdir(resolve(__dirname, "../www/src/data"), {
      recursive: true,
    });
    const buildInfoPath = resolve(__dirname, "../www/src/data/build-info.json");
    await Promise.all([
      fs.promises.writeFile(
        buildInfoPath,
        JSON.stringify(buildInfo, null, 2),
        "utf8"
      ),
      fs.promises.writeFile(
        resolve(__dirname, "../www/src/data/solc-version.json"),
        JSON.stringify({ solcVersion }, null, 2),
        "utf8"
      ),
    ]);
    // assets to save
    const assets = [
      "Stacys_V2",
      "StacysCollab_V2",
      "HunnysOGS_V2",
      "GoldenTicket",
      "GoldenTicketRedeemed",
    ];
    await Promise.all(
      assets.map((asset) =>
        hre.artifacts.readArtifact(asset).then(async (a) => {
          const minimumBuild: Build = await hre.run(
            TASK_VERIFY_GET_MINIMUM_BUILD,
            {
              sourceName: `contracts/${asset}.sol`,
            }
          );
          const assetPath = resolve(__dirname, `../www/src/data/${asset}.json`);
          await fs.promises.writeFile(
            assetPath,
            JSON.stringify(minimumBuild.input, null, 2),
            "utf8"
          );
        })
      )
    );
    return artifacts;
  }
);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000,
      },
    },
  },
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  networks: addForkConfiguration({
    hardhat: {
      initialBaseFeePerGas: 0, // to fix : https://github.com/sc-forks/solidity-coverage/issues/652, see https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136
      accounts: accounts("hardhat"),
      tags: ["local"],
      forking: {
        enabled: true,
        url: node_url("mainnet"),
      },
    },
    sepolia: {
      url: node_url("sepolia"),
      accounts: accounts("sepolia"),
      gasPrice: utils.parseUnits("10", "gwei").toNumber(),
      deploy: ["deploy/"],
    },
    mainnet: {
      url: node_url("mainnet"),
      accounts: accounts("mainnet"),
      gasPrice: utils.parseUnits("15", "gwei").toNumber(),
      deploy: ["deploy/"],
    },
    goerli: {
      url: node_url("goerli"),
      accounts: accounts("goerli"),
      deploy: ["deploy/"],
    },
  }),
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    gasPrice: 20,
    currency: "ETH",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY_MAINNET || "",
      goerli: process.env.ETHERSCAN_API_KEY_GOERLI || "",
      sepolia: process.env.ETHERSCAN_API_KEY_SEPOLIA || "",
    },
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

export default config;
