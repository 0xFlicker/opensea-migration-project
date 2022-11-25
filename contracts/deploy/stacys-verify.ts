import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, run } = hre;

  const stacys = await deployments.get("Stacys_V2");

  await run("verify:verify", {
    address: stacys.address,
    constructorArguments: stacys.args,
    contract: "contracts/Stacys_V2.sol:Stacys_V2",
  });
};
export default func;
func.tags = ["stacys:verify", "verify"];
