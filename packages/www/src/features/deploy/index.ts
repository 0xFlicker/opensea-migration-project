import fetch from "node-fetch";
import { ContractFactory, Signer } from "ethers";

import {
  StacysCollab_V2,
  StacysCollab_V2__factory,
  Stacys_V2,
  Stacys_V2__factory,
  HunnysOGS_V2,
  HunnysOGS_V2__factory,
  GoldenTicket,
  GoldenTicket__factory,
  GoldenTicketRedeemed,
  GoldenTicketRedeemed__factory,
} from "@opensea-migration/contracts/typechain";

import { Artifact, ContractName, EtherscanVerifyRequest } from "./types";
// import Stacys_V2 from "../../data/Stacys_V2.json";
// import StacysCollab_V2 from "../../data/StacysCollab_V2.json";
// import HunnysOGS_V2 from "../../data/HunnysOGS_V2.json";
// import GoldenTicket from "../../data/GoldenTicket.json";
// import GoldenTicketRedeemed from "../../data/GoldenTicketRedeemed.json";
import buildInfo from "../../data/build-info.json";
import { solcVersion } from "../../data/solc-version.json";

// const contractArtifacts: Record<ContractName, Artifact> = {
//   Stacys_V2,
//   StacysCollab_V2,
//   HunnysOGS_V2,
//   GoldenTicket,
//   GoldenTicketRedeemed,
// };

// type ContractMap = {
//   Stacys_V2: Stacys_V2;
//   StacysCollab_V2: StacysCollab_V2;
//   HunnysOGS_V2: HunnysOGS_V2;
//   GoldenTicket: GoldenTicket;
//   GoldenTicketRedeemed: GoldenTicketRedeemed;
// };

// const contractFactories = {
//   Stacys_V2: Stacys_V2__factory,
//   StacysCollab_V2: StacysCollab_V2__factory,
//   HunnysOGS_V2: HunnysOGS_V2__factory,
//   GoldenTicket: GoldenTicket__factory,
//   GoldenTicketRedeemed: GoldenTicketRedeemed__factory,
// } as const;

// export function deployStacysCollab_V2(
//   signer: Signer,
//   args: Parameters<StacysCollab_V2__factory["deploy"]>
// ): Promise<StacysCollab_V2> {
//   return new StacysCollab_V2__factory(signer).deploy(...args);
// }

// export function argBytesStacysCollab_V2(
//   args: Parameters<StacysCollab_V2__factory["deploy"]>
// ): string {
//   return StacysCollab_V2__factory.createInterface().encodeDeploy(args);
// }

// export function deployStacys_V2(
//   signer: Signer,
//   args: Parameters<Stacys_V2__factory["deploy"]>
// ): Promise<Stacys_V2> {
//   return new Stacys_V2__factory(signer).deploy(...args);
// }

// export function deployHunnysOGS_V2(
//   signer: Signer,
//   args: Parameters<HunnysOGS_V2__factory["deploy"]>
// ): Promise<HunnysOGS_V2> {
//   return new HunnysOGS_V2__factory(signer).deploy(...args);
// }

// export function deployGoldenTicket(
//   signer: Signer,
//   args: Parameters<GoldenTicket__factory["deploy"]>
// ): Promise<GoldenTicket> {
//   return new GoldenTicket__factory(signer).deploy(...args);
// }

// export function deployGoldenTicketRedeemed(
//   signer: Signer,
//   args: Parameters<GoldenTicketRedeemed__factory["deploy"]>
// ): Promise<GoldenTicketRedeemed> {
//   return new GoldenTicketRedeemed__factory(signer).deploy(...args);
// }

const etherscanApis = {
  mainnet: "https://api.etherscan.io/api",
  goerli: "https://api-goerli.etherscan.io/api",
  sepolia: "https://api-sepolia.etherscan.io/api",
};

export function etherscanVerificationRequest({
  contractName,
  contractAddress,
  constructorArguments,
  etherscanApiKey,
}: {
  contractName: string;
  contractAddress: string;
  etherscanApiKey: string;
  constructorArguments: string;
  network: string;
}): EtherscanVerifyRequest {
  return {
    apikey: etherscanApiKey,
    module: "contract",
    codeformat: "solidity-standard-json-input",
    action: "verifysourcecode",
    contractaddress: contractAddress,
    sourceCode: JSON.stringify(buildInfo),
    contractname: contractName,
    compilerversion: solcVersion,
    constructorArguements: constructorArguments,
  };
}
