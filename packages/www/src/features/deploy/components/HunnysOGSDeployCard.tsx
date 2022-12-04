import { FC } from "react";
import { HunnysOGS_V2__factory } from "@opensea-migration/contracts/typechain";
import { contractArtifacts, HunnysOGS_V2_airdrop } from "../verify";
import { DeployVerifyAirdropCard } from "./DeployVerifyAirdropCard";

export const HunnysOGSDeployCard: FC = () => {
  return (
    <DeployVerifyAirdropCard
      airdropAddresses={HunnysOGS_V2_airdrop}
      byteCode={HunnysOGS_V2__factory.bytecode}
      compilerInput={contractArtifacts.HunnysOGS_V2}
      contractFullName="contracts/HunnysOGS_V2.sol:HunnysOGS_V2"
      contractDescription="Hunnys OGS"
      contractInterface={HunnysOGS_V2__factory.createInterface()}
      defaultValues={{
        baseURI: "https://stacys-v2.s3.us-east-2.amazonaws.com/hunnys-ogs/",
      }}
    />
  );
};
