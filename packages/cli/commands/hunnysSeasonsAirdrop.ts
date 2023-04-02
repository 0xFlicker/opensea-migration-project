import fs from "fs";
import { parse } from "csv-parse/sync";
import ethProvider from "eth-provider";
import {
  bufferCount,
  catchError,
  from,
  map,
  mergeMap,
  mergeScan,
  of,
  range,
  scan,
  Subject,
} from "rxjs";
import { Wallet, providers, utils, BigNumber } from "ethers";
import { HunnysSeasonsFactory } from "../typechain/HunnysSeasonsFactory";
import { MulticallFactory } from "../typechain/MulticallFactory";
import { retryWithBackoff } from "../retry";

interface IAirdropRow {
  holderAddress: string;
  tokenId: number;
  amount: number;
}

// Polygon
const HunnysSeasonsContractAddress =
  "0x43668e306dba9172824524fd2c0c6924e710ea5b";
const multicall3ContractAddress = "0xca11bde05977b3631167028862be2a173976ca11";

interface IAirdropDetails {
  Bunny: string[];
  "Bunny Knight": string[];
  "Bunny Duke": string[];
  "Royal Bunny": string[];
  Relic: string[];
  ["*"]: string[];
}

function noZeroAddress(address: string) {
  return address !== "0x0000000000000000000000000000000000000000";
}

export async function hunnysSeasonsAirdrop({
  startFromBatch,
  data = "",
  batchCount,
  airdropDetails,
  startWithTokenId,
}: {
  startFromBatch: number;
  airdropDetails: IAirdropDetails;
  data?: string;
  batchCount: number;
  startWithTokenId: number;
}) {
  // Connect to the network
  const provider = new providers.Web3Provider(ethProvider("frame") as any);
  await provider.send("wallet_addEthereumChain", [
    {
      chainId: "0x89",
      rpcUrls: ["https://rpc-mainnet.matic.network/"],
      chainName: "Matic Mainnet",
      nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18,
      },
      blockExplorerUrls: ["https://polygonscan.com/"],
    },
  ]);
  const signer = provider.getSigner();
  const fromAddress = await signer.getAddress();

  console.log(
    `Sending from ${fromAddress} using batch size ${batchCount}, starting from batch ${startFromBatch} and tokenID ${startWithTokenId}`
  );
  // Create the contract instance
  const contract = HunnysSeasonsFactory.connect(
    HunnysSeasonsContractAddress,
    signer
  );

  // Create the multicall3 instance3
  const multicall = MulticallFactory.connect(multicall3ContractAddress, signer);

  // Send the transactions
  const failedAddresses: string[] = [];

  // Strategy for sending the airdrop is to collect up transactions up to the batch count size and
  // then create multicall batches to send them.

  // First convert the airdrop description into a series of token ids and destination addresses
  const airdropTxDetails = [
    ...[...airdropDetails["Bunny"], ...airdropDetails["*"]]
      .filter(noZeroAddress)
      .map((address) => ({
        tokenId: startWithTokenId,
        destinationAddress: address,
      })),
    ...[...airdropDetails["Bunny Knight"], ...airdropDetails["*"]]
      .filter(noZeroAddress)
      .map((address) => ({
        tokenId: startWithTokenId + 1,
        destinationAddress: address,
      })),
    ...[...airdropDetails["Bunny Duke"], ...airdropDetails["*"]]
      .filter(noZeroAddress)
      .map((address) => ({
        tokenId: startWithTokenId + 2,
        destinationAddress: address,
      })),
    ...[...airdropDetails["Royal Bunny"], ...airdropDetails["*"]]
      .filter(noZeroAddress)
      .map((address) => ({
        tokenId: startWithTokenId + 3,
        destinationAddress: address,
      })),
    ...[...airdropDetails["Relic"], ...airdropDetails["*"]]
      .filter(noZeroAddress)
      .map((address) => ({
        tokenId: startWithTokenId + 4,
        destinationAddress: address,
      })),
  ];
  from(airdropTxDetails)
    .pipe(
      bufferCount(batchCount),
      mergeScan(
        async (acc, batch) => {
          if (acc.currentBatch < startFromBatch - 1) {
            return {
              ...acc,
              currentBatch: acc.currentBatch + 1,
            };
          }

          const calldata = batch.map(({ tokenId, destinationAddress }) => {
            return contract.interface.encodeFunctionData("safeTransferFrom", [
              fromAddress,
              destinationAddress,
              tokenId,
              1,
              "0x",
            ]);
          });
          // Create a multicall batch where any individual transaction can fail (for example, due to safeTransferFrom error)
          // but the whole batch will still be executed
          // now make the multicall

          // First estimate the gas
          const gasEstimate = await multicall.estimateGas.aggregate3(
            calldata.map((c) => ({
              allowFailure: true,
              target: HunnysSeasonsContractAddress,
              callData: c,
            }))
          );
          const receipt: providers.TransactionResponse = await retryWithBackoff(
            async () =>
              await multicall.aggregate3(
                calldata.map((c) => ({
                  allowFailure: true,
                  target: HunnysSeasonsContractAddress,
                  callData: c,
                })),
                {
                  gasPrice: (await provider.getGasPrice()).mul(2),
                  gasLimit: gasEstimate.mul(8).div(7),
                }
              ),
            2,
            750
          );
          console.log(
            `Transaction sent nonce: ${receipt.nonce}: tx hash: ${receipt.hash}\n waiting....`
          );
          const tx = await receipt.wait();
          process.stdout.write("Success\n");
          return {
            ...acc,
            currentBatch: acc.currentBatch + 1,
            ...(tx.gasUsed && tx.effectiveGasPrice
              ? {
                  totalTxFees: acc.totalTxFees.add(
                    tx.gasUsed.mul(tx.effectiveGasPrice)
                  ),
                }
              : {}),
            totalGasUsed: acc.totalGasUsed.add(tx.gasUsed),
            totalAirdrops: acc.totalAirdrops + batch.length,
          };
        },
        {
          currentBatch: 0,
          totalTxFees: BigNumber.from(0),
          totalGasUsed: BigNumber.from(0),
          totalAirdrops: 0,
        },
        1
      )
    )
    .subscribe({
      complete: () => {
        console.log("Airdrop complete");
      },
      error: (err) => {
        console.log("Airdrop failed", err);
      },
    });
}
