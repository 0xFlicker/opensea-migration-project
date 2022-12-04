import { useContractWrite, usePrepareContractWrite, useSigner } from "wagmi";

const airdropAbi = [
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_to",
        type: "address[]",
      },
    ],
    name: "bulkMint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const useAirdrop = (
  contractAddress: string,
  addresses: string[],
  enabled?: boolean
) => {
  const { data: signer } = useSigner();
  const { config } = usePrepareContractWrite({
    signer,
    contractInterface: airdropAbi,
    args: [addresses],
    addressOrName: contractAddress,
    functionName: "bulkMint",
    enabled,
    cacheTime: 0,
  });

  return useContractWrite(config);
};
