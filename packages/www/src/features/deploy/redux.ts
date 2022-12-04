import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
  status: TStatus;
  error?: string;
  guid?: string;
}

export const initialState = {
  status: "idle",
} as IState;

const slice = createSlice({
  name: "deploy",
  initialState,
  reducers: {
    deploy(state: IState) {
      state.status = "deploying";
    },
    deployed(state: IState) {
      state.status = "deployed";
    },
    verify(state: IState, action: PayloadAction<string>) {
      state.status = "verifying";
      state.guid = action.payload;
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
