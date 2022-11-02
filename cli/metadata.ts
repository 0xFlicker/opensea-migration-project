import fs from "fs";
import { IPFSHTTPClient } from "ipfs-http-client";
import { fileExists } from "./files";
import { loadIpfsContent } from "./ipfs";
import { retryWithBackoff } from "./retry";

export interface IAttributeString {
  value: string;
  trait_type: string;
  colors?: string[];
}

export interface IAttributeNumeric {
  value: number;
  trait_type: string;
  display_type?: "number" | "boost_number" | "boost_percentage";
}

export type IMetadataAttribute = IAttributeString | IAttributeNumeric;

export interface IMetadata {
  image: string;
  description?: string;
  tokenId?: string;
  external_url?: string;
  name: string;
  attributes?: IMetadataAttribute[];
  properties?: Record<string, string>;
  edition?: string | number;
  id?: string | number;
}

export interface Owner {
  quantity: string;
  created_date: string;
  owner: {
    user: {
      username: string;
    };
    profile_img_url: string;
    address: string;
    config: string;
  };
}

export interface IOpenSeaMetadata extends IMetadata {
  owners: Owner[];
}

export async function extractMetadata(
  contractName: string,
  tokenId: string,
  ipfsClient: IPFSHTTPClient,
  uriFetcher: (tokenId: string) => Promise<string>
) {
  if (await fileExists(`metadata/${contractName}/${tokenId}.json`)) {
    return {
      tokenId,
      content: JSON.parse(
        await fs.promises.readFile(
          `metadata/${contractName}/${tokenId}.json`,
          "utf8"
        )
      ),
    };
  }
  const tokenURI = await uriFetcher(tokenId);
  const tokenURL = new URL(tokenURI);
  let fetchURL = tokenURI;
  if (tokenURL.protocol === "ipfs:") {
    const ipfsHash = tokenURI.slice(7);
    const content = await retryWithBackoff(
      () => loadIpfsContent(ipfsClient, ipfsHash),
      5,
      250
    );
    return { tokenId, content };
  }
  const content = await retryWithBackoff(
    async () => {
      const response = await fetch(fetchURL);
      return await response.text();
    },
    5,
    250
  );
  return { tokenId, content };
}
