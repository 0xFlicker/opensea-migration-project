import React, {
  Dispatch,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import CardActions from "@mui/material/CardActions";
import LinearProgress from "@mui/material/LinearProgress";
import { GoldenTicketRedeemed__factory } from "@opensea-migration/contracts/typechain";
import { contractArtifacts, GoldenTicketRedeemed_airdrop } from "../verify";
import { Field, Form, Formik, FormikHelpers, useFormikContext } from "formik";
import { actions, reducer, initialState } from "../redux";
import { IMetadataForm } from "../types";
import { ContractFactory, utils } from "ethers";
import { Interface } from "@ethersproject/abi";
import type { CompilerInput } from "hardhat/types";
import { useObservable, useObservableState } from "observable-hooks";
import { TextFieldInput } from "./TextFieldInput";
import { EthereumAddressInput } from "./EthereumAddressInput";
import { PercentageInput } from "./PercentInput";
import { useNetwork, useSigner, useTransaction, useProvider } from "wagmi";
import { combineLatest, exhaustMap, map } from "rxjs";
import useLocalStorage from "use-local-storage";
import { api, useLazyVerifyQuery, useLazyStatusQuery } from "../api";
import {
  isResponseVerificationFailure,
  isResponseVerificationPending,
  isResponseVerificationSuccess,
} from "../verify";
import { useAirdrop } from "../hooks/useAirdrop";

interface IDeployedContract {
  address: string;
  args: [string];
  txHash: `0x${string}`;
  status: "deploying" | "deployed" | "verified" | "airdropped";
}

const CardFormContent: FC<{
  byteCode: utils.BytesLike;
  contractFullName: string;
  contractInterface: Interface;
  compilerInput: CompilerInput;
  airdropAddresses: string[];
}> = ({
  airdropAddresses,
  byteCode,
  compilerInput,
  contractFullName,
  contractInterface,
}) => {
  const { chain } = useNetwork();
  const [state, dispatch] = useReducer(reducer, initialState);
  const { data: signer, isError, isLoading } = useSigner();
  const provider = useProvider();

  const { values, submitForm, setSubmitting, setValues } =
    useFormikContext<IMetadataForm>();
  const [requestVerifyStatus, { data: verifyStatus }] = useLazyStatusQuery();

  const [requestVerification] = useLazyVerifyQuery();

  const isVerificationPending = useMemo(() => {
    if (!verifyStatus) return undefined;
    return isResponseVerificationPending(verifyStatus);
  }, [verifyStatus]);

  const isVerificationFailure = useMemo(() => {
    if (!verifyStatus) return undefined;
    return isResponseVerificationFailure(verifyStatus);
  }, [verifyStatus]);

  const isVerificationSuccess = useMemo(() => {
    if (!verifyStatus) return undefined;
    return isResponseVerificationSuccess(verifyStatus);
  }, [verifyStatus]);

  const [savedContractInfo, setSavedContractInfo] = useLocalStorage<
    Partial<IDeployedContract>
  >(`${contractFullName}${chain?.name ? `:${chain.name}` : ""}`, {});

  const {
    data: contractTxInfo,
    error: contractTxError,
    isLoading: contractTxIsLoading,
    isSuccess: contractTxIsSuccess,
    isError: contractTxIsError,
  } = useTransaction({
    hash: savedContractInfo.txHash,
  });

  const {
    data: airdropTxInfo,
    write: airdrop,
    error: airdropError,
  } = useAirdrop(
    savedContractInfo.address,
    airdropAddresses,
    ["verified", "airdropping", "verifying", "deploying", "deployed"].includes(
      state.status
    )
  );

  useEffect(() => {
    if (airdropTxInfo) {
      airdropTxInfo.wait().then(() => {
        setSavedContractInfo({
          ...savedContractInfo,
          status: "airdropped",
        });
      });
    }
  }, [setSavedContractInfo, savedContractInfo, airdropTxInfo]);

  useEffect(() => {
    if (airdropError) {
      setSavedContractInfo({
        ...savedContractInfo,
        status: "verified",
      });
      dispatch(actions.error(airdropError.message));
    }
  }, [airdropError, setSavedContractInfo, savedContractInfo]);

  // If the contract is deployed, and the tx is successful, but under 5 confirmations, then track the progress
  const [contractIsConfirmed, setContractIsConfirmed] = useState(true); // assume true to start
  const [confirmations, setConfirmations] = useState(0);
  useEffect(() => {
    if (
      provider &&
      state.status === "deploying" &&
      contractTxIsSuccess &&
      contractTxInfo?.confirmations < 5
    ) {
      setContractIsConfirmed(false);
      const blockWatcher = async (block: number) => {
        const tx = await provider.getTransaction(savedContractInfo.txHash);
        console.log("block", block, tx);
        if (tx) {
          console.log("confirmations", tx.confirmations);
          setConfirmations(tx.confirmations);
          if (tx.confirmations >= 5) {
            dispatch(actions.deployed());
            setContractIsConfirmed(true);
            provider.off("block", blockWatcher);
          }
        }
      };
      provider.on("block", blockWatcher);
      return () => {
        provider.off("block", blockWatcher);
      };
    } else if (
      state.status === "deploying" &&
      contractTxIsSuccess &&
      contractTxInfo?.confirmations >= 5
    ) {
      dispatch(actions.deployed());
    }
  }, [
    provider,
    savedContractInfo,
    contractTxIsSuccess,
    contractTxInfo,
    state.status,
  ]);

  useEffect(() => {
    if (savedContractInfo.txHash) {
      switch (savedContractInfo.status) {
        case "deploying":
          dispatch(actions.deploy());
          break;
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
      setValues(
        {
          baseURI: savedContractInfo.args[0],
        },
        true
      );
    }
  }, [savedContractInfo, setValues]);

  const deployDeps$ = useObservable(
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
    IDeployedContract,
    {
      args: IDeployedContract["args"];
    }
  >((input$) =>
    combineLatest([deployDeps$, input$]).pipe(
      exhaustMap(async ([{ dispatch, signer, setSubmitting }, { args }]) => {
        try {
          setSubmitting(true);
          const [baseURI] = args;
          const contractFactory = new ContractFactory(
            contractInterface,
            byteCode,
            signer
          );
          const contract = await contractFactory.deploy(baseURI);
          return {
            address: contract.address,
            args,
            txHash: contract.deployTransaction.hash as `0x${string}`,
            status: "deploying" as const,
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

  const [etherscanApiKey] = useLocalStorage("etherscanApiKey", "");

  const network = useMemo(() => {
    switch (chain?.name) {
      case "Homestead":
        return "mainnet";
      case "Goerli":
        return "goerli";
      case "Sepolia":
        return "sepolia";
      default:
        return undefined;
    }
  }, [chain]);

  const doVerify = useCallback(() => {
    if (!network || !savedContractInfo) {
      return;
    }
    const constructorArgs = contractInterface
      .encodeDeploy(savedContractInfo.args)
      .split("0x")[1];

    requestVerification({
      address: savedContractInfo?.address,
      constructorArguments: constructorArgs,
      contractName: contractFullName,
      source: compilerInput,
      etherscanApiKey,
      network,
    }).then((res) => {
      const { data } = res;
      if (data.message === "NOTOK") {
        dispatch(actions.error(data.result));
      } else {
        dispatch(actions.verify(data.result));
      }
    });
  }, [
    network,
    savedContractInfo,
    contractInterface,
    requestVerification,
    contractFullName,
    compilerInput,
    etherscanApiKey,
  ]);

  useEffect(() => {
    if (deployedContract) {
      setSavedContractInfo(deployedContract);
    }
  }, [setSavedContractInfo, deployedContract]);

  useEffect(() => {
    if (state.status === "verifying" && state.guid) {
      // Wait 1s, then check if verified and poll every 2s until verified or error
      let intervalId: NodeJS.Timeout | undefined = undefined;
      let errorRetryCount = 0;
      const checkStatus = () => {
        if (state.status === "verifying") {
          console.log("checking verification status");

          requestVerifyStatus({
            etherscanApiKey,
            network,
            guid: state.guid,
          })
            .then((res) => {
              const { data } = res;
              console.log("verification status", data);
              if (isResponseVerificationFailure(data)) {
                console.error("verification failed");
                dispatch(actions.error(data.result));
              } else if (isResponseVerificationSuccess(data)) {
                console.log("verification success");
                dispatch(actions.verified());
                setSavedContractInfo({
                  ...savedContractInfo,
                  status: "verified",
                });
              } else {
                console.log("verification pending");
                intervalId = setTimeout(checkStatus, 2000);
              }
            })
            .catch((err) => {
              console.error("error checking verification status", err);
              if (errorRetryCount < 3) {
                errorRetryCount++;
                intervalId = setTimeout(checkStatus, 2000);
              }
            });
        }
      };
      intervalId = setTimeout(checkStatus, 1000);
      return () => {
        if (intervalId) {
          clearTimeout(intervalId);
        }
      };
    }
  }, [
    state.status,
    state.guid,
    requestVerifyStatus,
    etherscanApiKey,
    network,
    setSavedContractInfo,
    savedContractInfo,
  ]);

  const onSubmit = useCallback(() => {
    if (!signer) {
      return;
    }
    setSubmitting(true);
    if (state.status === "idle") {
      dispatch(actions.deploy());
      inputContractArgs({
        args: [values.baseURI],
      });
    } else if (state.status === "deployed") {
      doVerify();
    } else if (state.status === "verified") {
      dispatch(actions.airdrop());
      airdrop();
    } else {
      setSubmitting(false);
    }
  }, [
    airdrop,
    doVerify,
    inputContractArgs,
    setSubmitting,
    signer,
    state.status,
    values.baseURI,
  ]);
  const onAirdrop = useCallback(() => {
    dispatch(actions.airdrop());
    airdrop();
  }, [airdrop]);
  const onReset = useCallback(() => {
    setSavedContractInfo({} as IDeployedContract);
    dispatch(actions.reset());
  }, [setSavedContractInfo]);

  return (
    <>
      <CardContent>
        {isLoading && <Typography>Connecting...</Typography>}
        {isError && <Typography>Failed to connect to wallet</Typography>}
        {signer &&
          (() => {
            switch (state.status) {
              case "idle":
                return <Typography>Not yet deployed</Typography>;
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
            component={TextFieldInput}
            disabled={state.status !== "idle"}
            type="text"
            label="Base URI"
            name="baseURI"
          />
        </Form>
        {state.status === "deploying" && (
          <>
            <Typography>
              {!contractTxInfo
                ? "Waiting for transaction to be submitted"
                : contractIsConfirmed
                ? "Waiting for contract transaction to be validated"
                : "Please wait for your transaction to be confirmed"}
            </Typography>
            <LinearProgress
              variant={contractIsConfirmed ? "indeterminate" : "determinate"}
              value={confirmations * 20}
            />
          </>
        )}
        {state.status === "error" ? (
          <Typography color="error">{state.error}</Typography>
        ) : isVerificationPending ? (
          <Typography color="secondary">Verification is pending.</Typography>
        ) : isVerificationSuccess ? (
          <Typography color="primary">Verification is successful.</Typography>
        ) : (
          <Typography> </Typography>
        )}
      </CardContent>
      <CardActions>
        <Button onClick={state.status === "error" ? onReset : onSubmit}>
          {["deploying", "verifying", "airdropping"].includes(state.status) && (
            <CircularProgress size={20} />
          )}
          {state.status === "idle" && "Deploy"}
          {state.status === "deployed" && "Verify"}
          {state.status === "verified" && "Airdrop"}
        </Button>
        {airdrop && state.status !== "airdropped" && (
          <Button onClick={onAirdrop}>Airdrop, skip verification</Button>
        )}
        <Button onClick={onReset}>Reset</Button>
      </CardActions>
    </>
  );
};

const DeployVerifyAirdropCard: FC<{
  byteCode: utils.BytesLike;
  contractDescription: string;
  contractFullName: string;
  contractInterface: Interface;
  compilerInput: CompilerInput;
  airdropAddresses: string[];
  defaultValues?: Partial<IMetadataForm>;
}> = ({
  byteCode,
  contractDescription,
  contractFullName,
  contractInterface,
  compilerInput,
  airdropAddresses,
  defaultValues,
}) => {
  return (
    <Card>
      <CardHeader title={contractDescription} />
      <Formik
        initialValues={
          defaultValues || {
            baseURI: "",
          }
        }
        validate={(values) => {
          const errors: Partial<IMetadataForm> = {};
          return errors;
        }}
        onSubmit={() => {}}
      >
        <CardFormContent
          byteCode={byteCode}
          contractFullName={contractFullName}
          contractInterface={contractInterface}
          compilerInput={compilerInput}
          airdropAddresses={airdropAddresses}
        />
      </Formik>
    </Card>
  );
};

export const GoldenTicketRedeemedCard: FC = () => {
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
