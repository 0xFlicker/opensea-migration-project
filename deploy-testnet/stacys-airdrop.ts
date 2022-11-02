import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { utils } from "ethers";
import { FlickDropNFT__factory } from "../typechain";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const contractDeployment = await deployments.get("Stacys_V2");

  const count = 148;
  // Pick 148 random addresses
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
  const tx = await contract.bulkMint(addresses);
  await tx.wait();
};
export default func;
func.tags = ["stacys:airdrop"];
