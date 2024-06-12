import * as algokit from "@algorandfoundation/algokit-utils";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { UsdcaMockClient } from "../utils/usdClient";
import { getAlgodConfigFromViteEnvironment } from "../utils/network";
import "@mantine/notifications/styles.css";
import { IconX, IconCheck } from "@tabler/icons-react";
import { Button, Card, Loader, rem, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useWallet } from "@txnlab/use-wallet";
import algosdk from "algosdk";
import { useState } from "react";
import WalletNotConnected from "./WalleNotConnected";

const DISPENSER_APP_ID = Number(import.meta.env.VITE_DISPENSER);
const USDC_A_ID = Number(import.meta.env.VITE_USDCA);
const xIcon = <IconX style={{ width: rem(20), height: rem(20) }} />;
const checkIcon = <IconCheck style={{ width: rem(20), height: rem(20) }} />;

export default function dispense() {
  const [loading, setLoading] = useState<boolean>(false);
  // const [contractInput, setContractInput] = useState<string>("");

  const { signer, activeAddress, signTransactions, sendTransactions } = useWallet();

  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algodClient = algokit.getAlgoClient({
    server: algodConfig.server,
    port: algodConfig.port,
    token: algodConfig.token,
  });

  async function optIn() {
    setLoading(true);
    try {
      const suggestedParams = await algodClient.getTransactionParams().do();

      const transaction = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        assetIndex: USDC_A_ID,
        from: activeAddress!,
        to: activeAddress!,
        amount: 0,
        suggestedParams,
      });

      const encodedTransaction = algosdk.encodeUnsignedTransaction(transaction);
      const signedTransactions = await signTransactions([encodedTransaction]);
      const waitRoundsToConfirm = 4;
      const { id } = await sendTransactions(signedTransactions, waitRoundsToConfirm);

      console.log(`Successfully sent transaction. Transaction ID: ${id}`);
      notifications.show({
        title: "Optin Success !",
        message: `Successfully sent Optin to ${USDC_A_ID} asset. Transaction ID: ${id}`,
        color: "green",
        icon: checkIcon,
      });
    } catch (e) {
      console.error(e);
      notifications.show({
        title: "Error on optin",
        // @ts-ignore
        message: `Error calling the contract: ${e.message}`,
        color: "red",
        icon: xIcon,
      });
    } finally {
      console.log(`optin  done!`);
      setLoading(false);
    }
  }

  async function sendAppCall() {
    setLoading(true);
    const appClient = new UsdcaMockClient(
      {
        sender: { signer, addr: activeAddress } as TransactionSignerAccount,
        resolveBy: "id",
        id: DISPENSER_APP_ID,
      },
      algodClient
    );
    const amountUsdA = 100_000_000;
    await appClient
      .dispense({ amount: amountUsdA }, { sendParams: { fee: algokit.microAlgos(2_000) }, assets: [USDC_A_ID] })
      .catch((e: Error) => {
        notifications.show({
          title: "Error on dispense",
          message: `Error calling the contract: ${e.message}`,
          color: "red",
          icon: xIcon,
        });

        setLoading(false);
        //return;
      })
      .then((response) => {
        console.log(response);
        if (response) {
          notifications.show({
            title: "Dispense Success !",
            message: `${amountUsdA} USDCa sent to ${activeAddress}`,
            color: "green",
            icon: checkIcon,
          });
        }
        setLoading(false);
        return;
      });
  }

  return (
    <>{ activeAddress ? 
    <Card shadow="sm" padding="lg" withBorder radius="md">
      <Text size="lg" fw={700}>
        Optin and dispense USDCa Mock token
      </Text>
      <Text size="md" mt="md">
        1. Click to optin to Mock token
      </Text>
      <Button onClick={optIn} disabled={loading}>
        {loading ? <Loader size="xs" color="blue" /> : "Optin to asset"}
      </Button>
      <Text size="md" mt="md">
        2. Click to dispense 100 USDCa
      </Text>
      <Button onClick={sendAppCall} disabled={loading}>
        {loading ? <Loader size="xs" color="blue" /> : "Dispense usdc"}
      </Button>
    </Card>
: <WalletNotConnected message={"Dispenser functions."}/>
}
</>
  );
}
