import fs from "fs";
import { parse } from "csv-parse/sync";
import { Wallet, providers, utils, BigNumber } from "ethers";
import { Ierc1155Factory } from "../typechain/Ierc1155Factory";
import { retryWithBackoff } from "../retry";
import { bufferCount, from, mergeScan } from "rxjs";
import ethProvider from "eth-provider";
import { MulticallFactory } from "../typechain/MulticallFactory";

interface IAirdropRow {
  holderAddress: string;
  tokenId: number;
  amount: number;
}

const multicall3ContractAddress = "0xca11bde05977b3631167028862be2a173976ca11";

export async function airdrop({
  csv,
  batchCount,
  contractAddress,
  startFromBatch,
}: {
  csv: string;
  batchCount: number;
  contractAddress: string;
  startFromBatch: number;
}) {
  // Read the CSV file
  const records = parse(fs.readFileSync(csv));
  const [_, ...rows] = records;
  const airdropRows: IAirdropRow[] = rows
    .filter(
      ([address]: string[]) =>
        address !== "0x0000000000000000000000000000000000000000"
    )
    .map(([holder, tokenId, amount]: string[]) => ({
      holderAddress: holder,
      tokenId: parseInt(tokenId),
      amount: parseInt(amount),
    }));

  // Connect to the network
  const provider = new providers.Web3Provider(ethProvider("frame") as any);
  const signer = provider.getSigner();
  const fromAddress = await signer.getAddress();

  // Create the contract instance
  const contract = Ierc1155Factory.connect(contractAddress, signer);
  const multicall = MulticallFactory.connect(multicall3ContractAddress, signer);

  // Send the transactions
  const failedAddresses: string[] = [];

  from(airdropRows)
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
          // For each batch entry, construct the calldata for the safeTransferFrom call

          const calldata = batch.map(
            ({ tokenId, holderAddress: destinationAddress }) => {
              return contract.interface.encodeFunctionData("safeTransferFrom", [
                fromAddress,
                destinationAddress,
                tokenId,
                1,
                "0x",
              ]);
            }
          );
          // Create a multicall batch where any individual transaction can fail (for example, due to safeTransferFrom error)
          // but the whole batch will still be executed
          // now make the multicall
          const receipt = await multicall.aggregate3(
            calldata.map((c) => ({
              allowFailure: false,
              target: contractAddress,
              callData: c,
            })),
            {
              gasPrice: (await provider.getGasPrice()).mul(2),
            }
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
    });
}
