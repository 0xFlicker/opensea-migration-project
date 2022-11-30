import React, { Dispatch, FC, useCallback, useEffect, useReducer } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Field, Form, Formik, FormikHelpers, useFormikContext } from "formik";
import { actions, reducer, initialState } from "../redux";
import { IRoyaltiesAndMetadataForm } from "../types";
import { utils } from "ethers";
import { useObservable, useObservableState } from "observable-hooks";
import { BaseURIInput } from "./BaseURIInput";
import { EthereumAddressInput } from "./EthereumAddressInput";
import { PercentageInput } from "./PercentInput";
import { useSigner } from "wagmi";
import {
  catchError,
  combineLatest,
  exhaustMap,
  map,
  Observable,
  of,
  share,
  tap,
  withLatestFrom,
} from "rxjs";
import { StacysCollab_V2__factory } from "@opensea-migration/contracts/typechain";
import { CardActions, CircularProgress } from "@mui/material";
import { Signer } from "@wagmi/core";
import { AnyAction } from "@reduxjs/toolkit";
import useLocalStorage from "use-local-storage";

interface IDeployedContract {
  address: string;
  args: [string, number, string];
  txHash: string;
  status: "deployed" | "verified" | "airdropped";
}

const StacysCollabDeployCardFormContent: FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { data: signer, isError, isLoading } = useSigner();
  const { values, submitForm, setSubmitting, setValues } =
    useFormikContext<IRoyaltiesAndMetadataForm>();

  const [savedContractInfo, setSavedContractInfo] = useLocalStorage<
    Partial<IDeployedContract>
  >("StacysCollabContract", {});

  useEffect(() => {
    if (savedContractInfo.txHash) {
      setValues({
        royaltiesAddress: savedContractInfo.args[0],
        royaltiesPercentage: savedContractInfo.args[1] / 100,
        baseURI: savedContractInfo.args[2],
      });
      switch (savedContractInfo.status) {
        case "deployed":
          dispatch(actions.deployed());
          break;
        case "verified":
          dispatch(actions.verified());
          break;
        case "airdropped":
          dispatch(actions.airdropped());
          break;
      }
    }
  }, [savedContractInfo, setValues]);

  const deps$ = useObservable(
    (input$) =>
      input$.pipe(
        map(([signer, dispatch, setSubmitting]) => ({
          signer,
          dispatch,
          setSubmitting,
        }))
      ),
    [signer, dispatch, setSubmitting]
  );

  const [deployedContract, inputContractArgs] = useObservableState<
    {
      address: string;
      args: IDeployedContract["args"];
    },
    {
      args: IDeployedContract["args"];
    }
  >((input$) =>
    combineLatest([deps$, input$]).pipe(
      exhaustMap(async ([{ dispatch, signer, setSubmitting }, { args }]) => {
        try {
          setSubmitting(true);
          console.log("signer", signer);
          const [royaltiesAddress, feePercentage, baseURI] = args;
          const stacysCollabFactory = new StacysCollab_V2__factory(signer);
          console.log("deploying contract", stacysCollabFactory);
          const contract = await stacysCollabFactory.deploy(
            royaltiesAddress,
            feePercentage,
            baseURI
          );
          await contract.deployTransaction.wait();
          dispatch(actions.deployed());
          return {
            address: contract.address,
            args,
            txHash: contract.deployTransaction.hash,
            status: "deployed",
          };
        } catch (err: any) {
          console.error("second error", err);
          setSubmitting(false);
          dispatch(actions.error(err.message));
          return undefined;
        } finally {
          setSubmitting(false);
        }
      })
    )
  );

  useEffect(() => {
    if (deployedContract) {
      setSavedContractInfo(deployedContract);
    }
  }, [setSavedContractInfo, deployedContract]);

  const onSubmit = useCallback(() => {
    if (!signer) {
      return;
    }
    setSubmitting(true);
    if (state.status === "idle") {
      dispatch(actions.deploy("StacysCollab_V2"));
      inputContractArgs({
        args: [
          values.royaltiesAddress,
          Math.floor(values.royaltiesPercentage * 100),
          values.baseURI,
        ],
      });
    } else if (state.status === "deployed") {
      dispatch(actions.verify());
    } else if (state.status === "verified") {
      dispatch(actions.airdrop());
    } else {
      setSubmitting(false);
    }
  }, [
    inputContractArgs,
    setSubmitting,
    signer,
    state.status,
    values.baseURI,
    values.royaltiesAddress,
    values.royaltiesPercentage,
  ]);
  const onReset = useCallback(() => {
    dispatch(actions.reset());
  }, []);
  return (
    <>
      <CardContent>
        {isLoading && <Typography>Connecting...</Typography>}
        {isError && <Typography>Failed to connect to wallet</Typography>}
        {signer &&
          (() => {
            switch (state.status) {
              case "idle":
                return (
                  <Typography>
                    This is a collaboration between Stacy and the community.
                  </Typography>
                );
              case "deploying":
                return <Typography>Deploying...</Typography>;
              case "deployed":
                return (
                  <Typography>
                    Next verify your contract on Etherscan.
                  </Typography>
                );
              case "verifying":
                return <Typography>Verifying...</Typography>;
              case "verified":
                return (
                  <Typography>
                    Next airdrop your tokens to your community.
                  </Typography>
                );
              case "airdropping":
                return <Typography>Airdropping...</Typography>;
              case "airdropped":
                return <Typography>Success!</Typography>;
            }
          })()}
        <Form>
          <Field
            component={EthereumAddressInput}
            disabled={state.status !== "idle"}
            type="text"
            label="Royalties Address"
            name="royaltiesAddress"
          />
          <Field
            component={PercentageInput}
            disabled={state.status !== "idle"}
            type="number"
            label="Royalties Percentage"
            name="royaltiesPercentage"
          />
          <Field
            component={BaseURIInput}
            disabled={state.status !== "idle"}
            type="text"
            label="Base URI"
            name="baseURI"
          />
        </Form>
      </CardContent>
      <CardActions>
        <Button onClick={state.status === "error" ? onReset : onSubmit}>
          {["deploying", "verifying", "airdropping"].includes(state.status) && (
            <CircularProgress size={20} />
          )}
          {state.status === "error" && "Reset"}
          {state.status === "idle" && "Deploy"}
          {state.status === "deployed" && "Verify"}
        </Button>
      </CardActions>
    </>
  );
};

export const StacysCollabDeployCard: FC<{}> = ({}) => {
  return (
    <Card>
      <CardHeader title="Stacy's Collab" />
      <Formik
        initialValues={{
          royaltiesAddress: "",
          royaltiesPercentage: 0,
          baseURI: "",
        }}
        validate={(values) => {
          const errors: Partial<IRoyaltiesAndMetadataForm> = {};
          if (!values.royaltiesAddress) {
            errors.royaltiesAddress = "Required";
          } else if (!utils.isAddress(values.royaltiesAddress)) {
            errors.royaltiesAddress = "Invalid Ethereum address";
          }
          return errors;
        }}
      >
        <StacysCollabDeployCardFormContent />
      </Formik>
    </Card>
  );
};
