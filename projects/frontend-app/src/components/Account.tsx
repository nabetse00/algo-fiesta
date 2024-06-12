import { useWallet } from "@txnlab/use-wallet";
import { useEffect, useMemo, useState } from "react";
import { ellipseAddress } from "../utils/ellipseAddress";
import { getAlgodConfigFromViteEnvironment } from "../utils/network";
import { Avatar, Text, Group } from "@mantine/core";
import { IconMoneybag, IconNetwork, IconUserDollar } from "@tabler/icons-react";
import classes from "./Account.module.css";
import algosdk from "algosdk";
import * as algokit from "@algorandfoundation/algokit-utils";

const USDC_A_ID = Number(import.meta.env.VITE_USDCA);

export default function Account() {
  const { activeAddress } = useWallet();
  const [bal, setBal] = useState(0)
  const [balAsset, setBalAsset] = useState(0)
  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algodClient = algokit.getAlgoClient({
    server: algodConfig.server,
    port: algodConfig.port,
    token: algodConfig.token,
  });

  const dappFlowNetworkName = useMemo(() => {
    return algodConfig.network === "" ? "sandbox" : algodConfig.network.toLocaleLowerCase();
  }, [algodConfig.network]);

  function ethLikeAddr(address: string | undefined) {
    if (address) {
      return `0x${Buffer.from(algosdk.decodeAddress(address).publicKey.slice(0, 20)).toString("hex")}`;
    } else {
      return "";
    }
  }

  async function getBalance(address: string) {
    const info = await algodClient.accountInformation(address).do();
    console.log(`info is ${JSON.stringify(info)}`);
    return info["amount"];
  }

   async function getAssetBalance(address: string) {
    const info = await algodClient.accountAssetInformation(address, USDC_A_ID).do();
    console.log(`asset info is ${JSON.stringify(info)}`);
    return info["asset-holding"]["amount"];
  }

  useEffect(
    () => {
      if(activeAddress){
        getBalance(activeAddress).then(
          bal => setBal(bal)
        )
        getAssetBalance(activeAddress).then(
          bal => setBalAsset(bal)
        )
      }
    }, [activeAddress]
  )

  return (
    <Group wrap="nowrap" mb="md">
      <Avatar src={`https://effigy.im/a/${ethLikeAddr(activeAddress)}.svg`} size={94} radius="md" />
      <div>
        <Text fz="xs" tt="uppercase" fw={700} c="dimmed">
          ADDRESS
        </Text>

        <Text fz="lg" fw={500} className={classes.name}>
          <a
            target="_blank"
            href={`https://app.dappflow.org/setnetwork?name=${dappFlowNetworkName}&redirect=explorer/account/${activeAddress}/`}
          >
            {ellipseAddress(activeAddress, 7)}
          </a>
        </Text>
        <Group wrap="nowrap" gap={10} mt={3}>
          <IconUserDollar stroke={1.5} size="1rem" className={classes.icon} />
          <Text c="dimmed">{algokit.microAlgos(bal).toString()}</Text>
        </Group>
        <Group wrap="nowrap" gap={10} mt={3}>
          <IconMoneybag stroke={1.5} size="1rem" className={classes.icon} />
          <Text c="dimmed">{algokit.microAlgos(balAsset).algos.toFixed(2)} USDCa</Text>
        </Group>
        <Group wrap="nowrap" gap={10} mt={3}>
          <IconNetwork stroke={1.5} size="1rem" className={classes.icon} />
          <Text c="dimmed">{algodConfig.network === "" ? "localnet".toLocaleUpperCase() : algodConfig.network.toLocaleUpperCase()}</Text>
        </Group>
      </div>
    </Group>
  );
}
