import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import fs from "fs";
import { FlickDropNFT__factory } from "../typechain";
import { parse } from "csv-parse";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const contractDeployment = await deployments.get("StacysCollab_V2");

  const count = 7;
  const addresses: string[] = [];
  const holders = await fs.promises.readFile(
    "../cli/.metadata/stacys-collab-airdrop.csv",
    "utf8"
  );
  const record = new Promise<[string, string][]>((resolve, reject) =>
    parse(holders, { delimiter: "," }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    })
  );
  const [_, ...rows] = await record;
  for (const [_, address] of rows) {
    addresses.push(address);
    console.log(address);
  }
  if (addresses.length !== count) {
    throw new Error(`Expected ${count} addresses, got ${addresses.length}`);
  }
  console.log(`Bulk minting to ${addresses.length} addresses`);
  const signer = await ethers.getSigner(deployer);
  const contract = FlickDropNFT__factory.connect(
    contractDeployment.address,
    signer
  );
  // get current base gas price
  const { maxFeePerGas, maxPriorityFeePerGas } =
    await ethers.provider.getFeeData();

  const tx = await contract.bulkMint(addresses, {
    type: 2,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  console.log(`Tx hash: ${tx.hash}`);
  await tx.wait();
};
export default func;
func.tags = ["stacys-collab:airdrop", "airdrop"];
