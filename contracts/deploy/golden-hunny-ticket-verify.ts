import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, run } = hre;

  const stacys = await deployments.get("GoldenTicket");

  await run("verify:verify", {
    address: stacys.address,
    constructorArguments: stacys.args,
    contract: "contracts/GoldenTicket.sol:GoldenTicket",
  });
};
export default func;
func.tags = ["golden-hunny-ticket:verify", "verify"];
