import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, run, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("HunnysOGS_V2", {
    from: deployer,
    args: [
      "0x58666BD033D3e1d3e0add72beA53C3e771C9c743",
      "ipfs://QmV6PvMJRwNG1cc2Vjbq5v7AaH9aATPdVYkNxErXVTHGEN/",
    ],
    log: true,
    waitConfirmations: 5,
  });
};
export default func;
func.tags = ["hunnys-ogs:deploy", "deploy"];