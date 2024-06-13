import { ActionIcon, Card, LoadingOverlay, Table, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { getAlgodConfigFromViteEnvironment } from "../utils/network";
import * as algokit from "@algorandfoundation/algokit-utils";
import { useEffect, useMemo, useState } from "react";
import { EventFactoryClient } from "../utils/eventFactoryClient";
import { useWallet } from "@txnlab/use-wallet";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { IconSettingsDown } from "@tabler/icons-react";
import { ellipseAddress } from "../utils/ellipseAddress";
import { useNavigate } from "react-router-dom";
import algosdk from "algosdk";
import {
  EVENT_MANAGER_BOX_PREFIX,
  OWNER_BOX_PREFIX,
  decodeEventMangerBoxFromFactory,
  decodeOwnerBox,
  encodeBoxNameUint8ArrayFromAddress,
  encodeBoxNameUint8ArrayFromUint64,
} from "../utils/contract_helpers";
import { EventManagerClient } from "../utils/eventManagerClient";
import WalletNotConnected from "./WalleNotConnected";

const FACTORY_APP_ID = Number(import.meta.env.VITE_EVENT_FACTORY_CONTRACT);

type EventElementType = {
  appID: number;
  name: string;
  owner: string;
  ticketTypes: number;
  begins: Date;
  ends: Date;
};

type EventTicketType = {
  appID: number;
  nftId: number;
  name: string;
  owner: string;
  //typeName: number;
};

export default function ListUserTickets() {
  const { signer, activeAddress } = useWallet();
  const [visible, { open, close }] = useDisclosure(false);
  const navigate = useNavigate();

  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algodClient = algokit.getAlgoClient({
    server: algodConfig.server,
    port: algodConfig.port,
    token: algodConfig.token,
  });

  const [tickets, setTickets] = useState<EventTicketType[]>([
    {
      appID: 0,
      nftId: 0,
      name: "",
      owner: "",
    },
  ]);

  const dappFlowNetworkName = useMemo(() => {
    return algodConfig.network === "" ? "sandbox" : algodConfig.network.toLocaleLowerCase();
  }, [algodConfig.network]);

  const factoryClient = new EventFactoryClient(
    {
      sender: { signer, addr: activeAddress } as TransactionSignerAccount,
      resolveBy: "id",
      id: FACTORY_APP_ID,
    },
    algodClient
  );

  async function readOwnerBox(appId: number) {
    if(!activeAddress){
        return undefined
    }
    const client = new EventManagerClient(
      {
        resolveBy: "id",
        id: appId,
        sender: { signer, addr: activeAddress } as TransactionSignerAccount,
      },
      algodClient
    );
    // const appRef = await client.appClient.getAppReference();
    console.log(activeAddress);
    const owner_box_val = await client.appClient
      .getBoxValue(encodeBoxNameUint8ArrayFromAddress(OWNER_BOX_PREFIX, activeAddress!))
      .catch((e) => {
        console.error(e);
        return undefined;
      });
    if (owner_box_val === undefined) {
      return undefined;
    }
    const ob = decodeOwnerBox(owner_box_val);
    return ob;
  }

  async function getData() {
    open();

    const state = await factoryClient.getGlobalState();
    const lastIndex = state.lastEventManager!.asNumber();
    if (lastIndex == 0) {
      console.log(`no events for ${FACTORY_APP_ID}`);
      return;
    }
    const events = [] as EventElementType[]; //factoryClient.appClient.getBoxValue()
    for (let i = 0; i < lastIndex; i++) {
      const boxName = encodeBoxNameUint8ArrayFromUint64(EVENT_MANAGER_BOX_PREFIX, i);
      const box = await factoryClient.appClient.getBoxValue(boxName);
      const appId = decodeEventMangerBoxFromFactory(box);
      // read state
      const managerClient = new EventManagerClient(
        {
          // sender: { signer, addr: activeAddress } as TransactionSignerAccount,
          resolveBy: "id",
          id: appId,
        },
        algodClient
      );
      const managerState = await managerClient.getGlobalState();
      if (managerState.lastTypeIndex!.asNumber() > 0) {
        events.push({
          appID: appId,
          name: managerState.name!.asString(),
          owner: `${algosdk.encodeAddress(managerState.eventOwner!.asByteArray())}`,
          ticketTypes: managerState.lastTypeIndex!.asNumber(),
          begins: new Date(managerState.eventBegin!.asNumber() * 1000),
          ends: new Date(managerState.eventEnd!.asNumber() * 1000),
        });
      }
    }
    const tickets_ = [] as EventTicketType[];
    for (const evt of events) {
      const ownerBox = await readOwnerBox(evt.appID);
      if (ownerBox === undefined) {
        continue;
      }
      for (let i = 0; i < ownerBox.asaIds.length; i++) {
        const asaId = ownerBox.asaIds[i];
        const ticket: EventTicketType = {
          appID: evt.appID,
          nftId: asaId,
          name: evt.name,
          owner: evt.owner,
        };
        tickets_.push(ticket);
      }
    }

    close();

    return tickets_.reverse();
  }

  useEffect(() => {
    getData().then((tickets_) => {
      if (tickets_) {
        setTickets(tickets_);
      }
    });
  }, [activeAddress]);

  return (
    <>
      {activeAddress ? (
        <Card title="User Tickets">
          <Card.Section withBorder inheritPadding py="md">
            <Text fw={500}>Event on chain</Text>
          </Card.Section>
          <LoadingOverlay visible={visible} zIndex={5000} overlayProps={{ radius: "sm", blur: 2 }} />
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Event App Id</Table.Th>
                <Table.Th>Event name</Table.Th>
                <Table.Th>Event owner</Table.Th>
                <Table.Th>Tickets NFT id</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tickets.map((element) => (
                <Table.Tr key={`${element.nftId}-${element.appID}`}>
                  <Table.Td>{element.appID.toString()}</Table.Td>
                  <Table.Td>{element.name}</Table.Td>
                  <Table.Td>
                    {
                      <a
                        target="_blank"
                        href={`https://app.dappflow.org/setnetwork?name=${dappFlowNetworkName}&redirect=explorer/account/${element.owner}/`}
                      >
                        {ellipseAddress(element.owner, 7)}
                      </a>
                    }
                  </Table.Td>
                  <Table.Td>
                    <a
                      target="_blank"
                      href={`https://app.dappflow.org/setnetwork?name=${dappFlowNetworkName}&redirect=explorer/nft/${element.nftId.toString()}/`}
                    >
                        {element.nftId.toString()}
                    </a>
                  </Table.Td>
                  <Table.Td>
                    {
                      <ActionIcon>
                        <IconSettingsDown onClick={() => navigate(`/events/${element.appID}`)} />
                      </ActionIcon>
                    }
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      ) : (
        <WalletNotConnected message="List your tickets" />
      )}
    </>
  );
}
