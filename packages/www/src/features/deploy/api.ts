import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import fetch from "isomorphic-unfetch";
import type { CompilerInput } from "hardhat/types";
import { etherscanApis, etherscanVerificationRequest } from "./verify";

export const api = createApi({
  reducerPath: "etherscanVerifyApi",
  baseQuery: fetchBaseQuery({ fetchFn: fetch }),
  endpoints: (builder) => ({
    verify: builder.query<
      {
        message: string;
        result: string;
        status: string;
      },
      {
        address: string;
        contractName: string;
        constructorArguments: string;
        etherscanApiKey: string;
        network: keyof typeof etherscanApis;
        source: CompilerInput;
      }
    >({
      query: ({
        address,
        contractName,
        constructorArguments,
        etherscanApiKey,
        network,
        source,
      }) => {
        const parameters = new URLSearchParams({
          ...etherscanVerificationRequest({
            contractAddress: address,
            contractName,
            constructorArguments,
            etherscanApiKey,
            source,
          }),
        });
        return {
          url: etherscanApis[network],
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: parameters.toString(),
        };
      },
    }),
    status: builder.query<
      {
        message: string;
        result: string;
        status: string;
      },
      {
        etherscanApiKey: string;
        guid: string;
        network: keyof typeof etherscanApis;
      }
    >({
      query: ({ etherscanApiKey, guid, network }) => ({
        url: etherscanApis[network],
        method: "GET",
        params: {
          module: "contract",
          action: "checkverifystatus",
          guid,
          apiKey: etherscanApiKey,
        },
      }),
    }),
  }),
});

export const { reducer, useLazyVerifyQuery, useLazyStatusQuery } = api;
