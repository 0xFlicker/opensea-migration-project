import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ContractName } from "./types";

type TStatus =
  | "idle"
  | "deploying"
  | "deployed"
  | "verifying"
  | "verified"
  | "airdropping"
  | "airdropped"
  | "error";

interface IState {
  contractName?: ContractName;
  status: TStatus;
  error?: string;
}

export const initialState = {
  status: "idle",
} as IState;

const slice = createSlice({
  name: "deploy",
  initialState,
  reducers: {
    deploy(state: IState, action: PayloadAction<ContractName>) {
      state.status = "deploying";
      state.contractName = action.payload;
    },
    deployed(state: IState) {
      state.status = "deployed";
    },
    verify(state: IState) {
      state.status = "verifying";
    },
    verified(state: IState) {
      state.status = "verified";
    },
    airdrop(state: IState) {
      state.status = "airdropping";
    },
    airdropped(state: IState) {
      state.status = "airdropped";
    },
    error(state: IState, msg: PayloadAction<string>) {
      state.status = "error";
      state.error = msg.payload;
    },
    reset(state: IState) {
      state.status = "idle";
      state.error = undefined;
    },
  },
});

export const { actions, reducer } = slice;
