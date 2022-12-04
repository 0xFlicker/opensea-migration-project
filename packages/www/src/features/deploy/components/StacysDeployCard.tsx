import { FC } from "react";
import { Stacys_V2__factory } from "@opensea-migration/contracts/typechain";
import { contractArtifacts, Stacys_V2_airdrop } from "../verify";
import { DeployVerifyAirdropCard } from "./DeployVerifyAirdropCard";

export const StacysDeployCard: FC = () => {
  return (
    <DeployVerifyAirdropCard
      airdropAddresses={Stacys_V2_airdrop}
      byteCode={Stacys_V2__factory.bytecode}
      compilerInput={contractArtifacts.Stacys_V2}
      contractFullName="contracts/Stacys_V2.sol:Stacys_V2"
      contractDescription="Stacys"
      contractInterface={Stacys_V2__factory.createInterface()}
      defaultValues={{
        baseURI: "https://stacys-v2.s3.us-east-2.amazonaws.com/stacys/",
      }}
    />
  );
};
