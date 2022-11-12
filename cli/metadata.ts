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
  external_url?: string;
  name: string;
  attributes?: IMetadataAttribute[];
  properties?: Record<string, string>;
  edition?: string | number;
  id?: string | number;
}

export interface OwnerUser {
  user: {
    username: string;
  };
  profile_img_url: string;
  address: string;
  config: string;
}

export interface Owner {
  quantity: string;
  created_date: string;
  owner: OwnerUser;
}

export interface AssetEvent {
  asset: CollectionAsset;
  event_type:
    | "created"
    | "successful"
    | "cancelled"
    | "bid_entered"
    | "bid_withdrawn"
    | "transfer"
    | "offer_entered"
    | "approve";
  created_date: string;
  listing_date: string;
  from_account?: OwnerUser;
  to_account?: OwnerUser;
  seller?: OwnerUser;
  is_private: boolean;
  payment_token: {
    symbol: "ETH" | "WETH" | "DAI";
    address: string;
    image_url: string;
    name: string;
    decimals: number;
    eth_price: string;
    usd_price: string;
  };
  quantity: string;
  total_price: number;
  collection_slug: string;
  starting_price: string;
  ending_price: string;
}

export interface CollectionAsset {
  id: number;
  slug: string;
  token_id: string;
  num_sales: number;
  image_url: string;
  image_original_url: string;
  name: string;
  description: string;
  permalink: string;
  traits: IMetadataAttribute[];
  asset_contract: {
    address: string;
  };
  collection: {
    created_date: string;
    description: string;
    name: string;
    slug: string;
  };
}

export interface IOpenSeaMetadata extends IMetadata {
  owners?: Owner[];
  events?: AssetEvent[];
  original_creation_date?: string;
  original_contract_address?: string;
  original_token_id?: string;
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
