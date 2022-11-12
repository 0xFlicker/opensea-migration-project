import fs from "fs";
import { parse } from "csv-parse/sync";
import { Wallet, providers, utils, BigNumber } from "ethers";
import { IERC1155__factory } from "../typechain";
import { retryWithBackoff } from "../retry";

interface IAirdropRow {
  holderAddress: string;
  tokenId: number;
  amount: number;
}
export async function airdrop({
  csv,
  privateKey,
  contractAddress,
  fromAddress,
  rpcUrl,
  data = "",
  count: transactionCount,
}: {
  csv: string;
  privateKey: string;
  rpcUrl: string;
  contractAddress: string;
  fromAddress: string;
  data?: string;
  count?: number;
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
  const wallet = new Wallet(privateKey);
  const provider = new providers.JsonRpcProvider(rpcUrl);
  const signer = wallet.connect(provider);

  // Create the contract instance
  const contract = IERC1155__factory.connect(contractAddress, signer);

  // Send the transactions
  const failedAddresses: string[] = [];
  const batchSize = 10;
  for (let i = 0; i < airdropRows.length; i += batchSize) {
    console.log(`Sending batch ${i} to ${i + batchSize}`);
    const batch = airdropRows.slice(i, i + batchSize);
    let nonce = await retryWithBackoff(
      async () => await provider.getTransactionCount(fromAddress),
      10,
      750
    );
    console.log(`Using nonce ${nonce}`);
    await Promise.all(
      batch.map(async ({ holderAddress, tokenId, amount }) => {
        console.log(
          `Sending ${amount} of token ${tokenId} from ${fromAddress} to ${holderAddress}`
        );
        try {
          // Check the balance of the from address
          const balance = await retryWithBackoff(
            async () => await contract.balanceOf(holderAddress, tokenId),
            10,
            750
          );
          if (balance.eq(0)) {
            const receipt = await retryWithBackoff(
              async () =>
                contract.safeTransferFrom(
                  fromAddress,
                  holderAddress,
                  tokenId,
                  amount,
                  utils.hexlify(utils.toUtf8Bytes(data)),
                  {
                    gasPrice: (await provider.getGasPrice()).mul(2),
                    nonce: nonce++,
                  }
                ),
              10,
              750
            );
            console.log(
              `Transaction sent nonce: ${receipt.nonce}: tx hash: ${receipt.hash}\n waiting....`
            );
            await receipt.wait();
          } else {
            console.log(
              `Token ${tokenId} already owned by ${holderAddress} skipping...`
            );
          }
        } catch (e) {
          console.error(e);
          failedAddresses.push(holderAddress);
        }
      })
    );
  }
  console.log("Done!");
  console.log("Failed addresses:");
  console.log(failedAddresses);
}
