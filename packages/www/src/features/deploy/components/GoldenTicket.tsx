import { FC } from "react";
import { GoldenTicket__factory } from "@opensea-migration/contracts/typechain";
import { contractArtifacts, GoldenTicket_airdrop } from "../verify";
import { DeployVerifyAirdropCard } from "./DeployVerifyAirdropCard";

export const GoldenTicketDeployCard: FC = () => {
  return (
    <DeployVerifyAirdropCard
      airdropAddresses={GoldenTicket_airdrop}
      byteCode={GoldenTicket__factory.bytecode}
      compilerInput={contractArtifacts.GoldenTicket}
      contractFullName="contracts/GoldenTicket.sol:GoldenTicket"
      contractDescription="Golden Ticket"
      contractInterface={GoldenTicket__factory.createInterface()}
      defaultValues={{
        baseURI:
          "https://stacys-v2.s3.us-east-2.amazonaws.com/golden-hunny-ticket/",
      }}
    />
  );
};
