import { FC } from "react";
import { StacysCollab_V2__factory } from "@opensea-migration/contracts/typechain";
import { contractArtifacts, StacysCollab_V2_airdrop } from "../verify";
import { DeployVerifyAirdropCard } from "./DeployVerifyAirdropCard";

export const StacysCollabDeployCard: FC = () => {
  return (
    <DeployVerifyAirdropCard
      airdropAddresses={StacysCollab_V2_airdrop}
      byteCode={StacysCollab_V2__factory.bytecode}
      compilerInput={contractArtifacts.StacysCollab_V2}
      contractFullName="contracts/StacysCollab_V2.sol:StacysCollab_V2"
      contractDescription="Stacys Collab"
      contractInterface={StacysCollab_V2__factory.createInterface()}
      defaultValues={{
        baseURI: "https://stacys-v2.s3.us-east-2.amazonaws.com/stacys-collab/",
      }}
    />
  );
};
