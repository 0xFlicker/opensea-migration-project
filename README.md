# OpenSea migration project

## What is it?

Project used to migrate OpenSea shared storefront tokens, created initially for https://twitter.com/cryptostacys to migrate various OpenSea shared storefront collections

## What is in it?

 - [cli](packages/cli) - Command line tools to fetch metadata from OpenSea and upload to IPFS
 - [contracts](packages/contracts) - Hardhat contracts and tests
 - [deploy](packages/deploy) - Deploy scripts for the website
 - [www](packages/www) - NextJS website for deploying, verifying and running airdrops
 
 ## What does a migration look like?
 
First the [cli](packages/cli) tools are used to extract all assets, metadata, events and holder information from OpenSea API. This requires an OpenSea API key. New metadata is created, and information about the token from OpenSea is added to the metadata. The assets and metadata are uploaded to AWS for the initial airdrop, because experience has shown that OpenSea can have difficulty and loading when a large number of tokens are minted. Later on, the metadata is replaced with metadata stored in IPFS. During this process, the current list of token holders is extracted for the airdrop.
 
New contracts are created. These are standard, gas efficient ERC721A with ERC721AEnumeration, EIP165 (interface declaration), EIP2981 (Royalty declaration), bulkAdminMint (for airdrop) and withdraw (for withdrawing mint/royalties if needed).

With the compiled contracts and airdrop list, a website is deployed for the contract owner to deploy the new contracts, verify the contracts on etherscan and perform the airdrop. These steops can optionally be performed on Goerli testnet first, to verify everything looks good on https://testnets.opensea.io.

Once the tokens have been airdropped and all tokens appears on OpenSea, the metadata can be updated to the IPFS version.

And done!  
