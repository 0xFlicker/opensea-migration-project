const withTM = require('next-transpile-modules')(['@opensea-migration/contracts']);

if (!process.env.INFURA_KEY) {
  throw new Error('INFURA_KEY is not defined')
}
const INFURA_KEY = process.env.INFURA_KEY

if (!process.env.NFT_CONTRACT_ADDRESS) {
  throw new Error('NFT_CONTRACT_ADDRESS is not defined')
}
const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS

if (!process.env.APP_NAME) {
  throw new Error('APP_NAME is not defined')
}
const APP_NAME = process.env.APP_NAME

/** @type {import('next').NextConfig} */
const nextConfig = withTM({
  reactStrictMode: true,
  env: {
    LOG_LEVEL: "debug",
    NEXT_PUBLIC_INFURA_KEY: INFURA_KEY,
    NEXT_PUBLIC_DEFAULT_CHAIN_ID: process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || "1",
    NEXT_PUBLIC_NFT_CONTRACT_ADDRESS: NFT_CONTRACT_ADDRESS,
    NEXT_PUBLIC_APP_NAME: APP_NAME,
    NEXT_PUBLIC_SUPPORTED_CHAINS: JSON.stringify(["homestead", "goerli", "sepolia"]),
  },
  images: {
    unoptimized: true,
  }
})

module.exports = nextConfig
