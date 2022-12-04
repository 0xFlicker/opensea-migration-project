import { FC } from "react";
import { GoldenTicketRedeemed__factory } from "@opensea-migration/contracts/typechain";
import { contractArtifacts, GoldenTicketRedeemed_airdrop } from "../verify";
import { DeployVerifyAirdropCard } from "./DeployVerifyAirdropCard";

export const GoldenTicketRedeemedDeployCard: FC = () => {
  return (
    <DeployVerifyAirdropCard
      airdropAddresses={GoldenTicketRedeemed_airdrop}
      byteCode={GoldenTicketRedeemed__factory.bytecode}
      compilerInput={contractArtifacts.GoldenTicketRedeemed}
      contractFullName="contracts/GoldenTicketRedeemed.sol:GoldenTicketRedeemed"
      contractDescription="Golden Ticket"
      contractInterface={GoldenTicketRedeemed__factory.createInterface()}
      defaultValues={{
        baseURI:
          "https://stacys-v2.s3.us-east-2.amazonaws.com/golden-hunny-ticket-redeemed/",
      }}
    />
  );
};
