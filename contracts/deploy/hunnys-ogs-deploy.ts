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
      "https://stacys-v2.s3.us-east-2.amazonaws.com/hunnys-ogs/",
    ],
    log: true,
    waitConfirmations: 5,
  });
};
export default func;
func.tags = ["hunnys-ogs:deploy", "deploy"];
