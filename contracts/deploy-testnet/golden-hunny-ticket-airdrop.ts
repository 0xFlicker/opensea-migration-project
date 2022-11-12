import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { utils } from "ethers";
import { FlickDropNFT__factory } from "../typechain";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const contractDeployment = await deployments.get("GoldenTicket");

  const count = 11;
  const addresses: string[] = [];
  for (let i = 0; i < count; i++) {
    addresses.push(utils.getAddress(utils.hexlify(utils.randomBytes(20))));
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
func.tags = ["golden-hunny-ticket:airdrop", "airdrop"];
