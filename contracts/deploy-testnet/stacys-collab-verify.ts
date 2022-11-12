import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, run } = hre;

  const stacys = await deployments.get("StacysCollab_V2");

  await run("verify:verify", {
    address: stacys.address,
    constructorArguments: stacys.args,
    contract: "contracts/StacysCollab_V2.sol:StacysCollab_V2",
  });
};
export default func;
func.tags = ["stacys-collab:verify", "verify"];
