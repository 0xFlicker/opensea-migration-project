import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import { reducer as web3Reducer } from "features/web3/redux";
import { reducer as appbarReducer } from "features/appbar/redux";
import { api as deployApi } from "features/deploy/api";

export const store = configureStore({
  reducer: {
    web3: web3Reducer,
    appbar: appbarReducer,
    [deployApi.reducerPath]: deployApi.reducer,
  },
  devTools: process.env.NODE_ENV !== "production",
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(deployApi.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>(); // Export a hook that can be reused to resolve types
export const useAppSelector = <T>(selector: (state: RootState) => T) => {
  return useSelector<RootState, T>(selector);
};
