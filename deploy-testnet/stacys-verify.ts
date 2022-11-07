import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, run } = hre;

  const stacys = await deployments.get("StacysV2");

  await run("verify:verify", {
    address: stacys.address,
    constructorArguments: stacys.args,
    contract: "contracts/Stacys_V2.sol:StacysV2",
  });
};
export default func;
func.tags = ["stacys:verify"];
