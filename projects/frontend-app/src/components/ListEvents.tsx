import { ActionIcon, Card, LoadingOverlay, Table, Text } from "@mantine/core";
import { IconSettingsDown } from "@tabler/icons-react";
import { getAlgodConfigFromViteEnvironment } from "../utils/network";
import * as algokit from "@algorandfoundation/algokit-utils";
import { EventFactoryClient } from "../utils/eventFactoryClient";
import { EVENT_MANAGER_BOX_PREFIX, decodeEventMangerBoxFromFactory, encodeBoxNameUint8ArrayFromUint64 } from "../utils/contract_helpers";
import { EventManagerClient } from "../utils/eventManagerClient";
import { useEffect, useMemo, useState } from "react";
import algosdk from "algosdk";
import { ellipseAddress } from "../utils/ellipseAddress";
import { useNavigate } from "react-router-dom";
import { useDisclosure } from "@mantine/hooks";

const FACTORY_APP_ID = Number(import.meta.env.VITE_EVENT_FACTORY_CONTRACT);

type EventElementType = {
  appID: number;
  name: string;
  owner: string;
  ticketTypes: number;
  begins: Date;
  ends: Date;
};

export default function ListEvents() {
  const [visible, { open, close }] = useDisclosure(false);
  const navigate = useNavigate();
  const [elements, setElenemts] = useState<EventElementType[]>([
    {
      appID: 0,
      name: "",
      owner: "",
      ticketTypes: 0,
      begins: new Date(),
      ends: new Date(),
    },
  ]);
  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algodClient = algokit.getAlgoClient({
    server: algodConfig.server,
    port: algodConfig.port,
    token: algodConfig.token,
  });

  const dappFlowNetworkName = useMemo(() => {
    return algodConfig.network === "" ? "sandbox" : algodConfig.network.toLocaleLowerCase();
  }, [algodConfig.network]);

  const factoryClient = new EventFactoryClient(
    {
      // sender: { signer, addr: activeAddress } as TransactionSignerAccount,
      resolveBy: "id",
      id: FACTORY_APP_ID,
    },
    algodClient
  );

  async function getEvents() {
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
    close();
    return events.reverse();
  }

  useEffect(() => {
    getEvents().then((evt) => {
      if (evt) {
        setElenemts(evt);
      }
    });
  }, []);

  return (
    <Card title="Events on chain">
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
            <Table.Th>Event tickets types</Table.Th>
            <Table.Th>begins</Table.Th>
            <Table.Th>ends</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {elements.map((element) => (
            <Table.Tr key={element.appID}>
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
              <Table.Td>{element.ticketTypes}</Table.Td>
              <Table.Td>{element.begins.toLocaleString()}</Table.Td>
              <Table.Td>{element.ends.toLocaleString()}</Table.Td>
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
  );
}
