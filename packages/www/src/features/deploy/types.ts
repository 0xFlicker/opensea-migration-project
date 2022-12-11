export type Artifact = {
  abi: any[];
  bytecode: string;
};

export type ContractName =
  | "Stacys_V2"
  | "StacysCollab_V2"
  | "HunnysOGS_V2"
  | "GoldenTicket"
  | "GoldenTicketRedeemed";

export interface EtherscanRequest {
  apikey: string;
  module: "contract";
  action: string;
}

export interface EtherscanVerifyRequest extends EtherscanRequest {
  action: "verifysourcecode";
  contractaddress: string;
  sourceCode: string;
  codeformat: "solidity-standard-json-input";
  contractname: string;
  compilerversion: string;
  // This is misspelt in Etherscan's actual API parameters.
  // See: https://etherscan.io/apis#contracts
  constructorArguements: string;
}

export interface IRoyaltiesAndMetadataForm {
  royaltiesAddress: string;
  royaltiesPercentage: number;
  baseURI: string;
}

export interface IMetadataForm {
  baseURI: string;
}
