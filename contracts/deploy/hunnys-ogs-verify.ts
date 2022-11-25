import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, run } = hre;

  const stacys = await deployments.get("HunnysOGS_V2");

  await run("verify:verify", {
    address: stacys.address,
    constructorArguments: stacys.args,
    contract: "contracts/HunnysOGS_v2.sol:HunnysOGS_V2",
  });
};
export default func;
func.tags = ["hunnys-ogs:verify", "verify"];
