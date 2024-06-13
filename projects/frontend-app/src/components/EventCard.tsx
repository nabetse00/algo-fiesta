import { Card, Image, Text, Badge, Button, Group, Accordion, List, ThemeIcon, rem, Modal, NumberInput } from "@mantine/core";
import { EventManagerClient } from "../utils/eventManagerClient";
import { getAlgodConfigFromViteEnvironment } from "../utils/network";
import * as algokit from "@algorandfoundation/algokit-utils";
import { useEffect, useState } from "react";
import {
  ASSETS_BOX_PREFIX,
  OWNER_BOX_PREFIX,
  SEATS_BOX_PREFIX,
  TICKET_TYPES_BOX_PREFIX,
  TicketTypeBox,
  computeAssetsArrayMbr,
  computeOwnerBoxMbr,
  computeSeatsArrayMbr,
  decodeTicketTypeBox,
  encodeBoxNameUint8ArrayFromAddress,
  encodeBoxNameUint8ArrayFromUint64,
  encodeSeatAsUint8Array,
  makePaymentTxn,
} from "../utils/contract_helpers";
import algosdk from "algosdk";
import { getJsonData, ipfsUrl } from "../utils/ipfs";
import { EventTypeJson } from "../types/models";
import maplibregl from "maplibre-gl";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount";
import { IconCheck, IconCircleCheck, IconCreditCardPay, IconTicket, IconX } from "@tabler/icons-react";
import { useWallet } from "@txnlab/use-wallet";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";

type TicketJson = {
  name: string;
  description: string;
  price: number;
  supply: number;
  maxPerUser: number;
  sold: number;
};
type EventType = {
  appID: number;
  name: string;
  image: string;
  location?: any;
  coordinates?: number[];
  description: string;
  owner: string;
  ticketTypes: number;
  begins: Date;
  ends: Date;
  tTypes: TicketTypeBox[];
  tTypesJson: TicketJson[];
};

interface props {
  appId: number;
}
const apiKey = import.meta.env.VITE_GEOMAP_API_KEY;
const USDC_A_ID = Number(import.meta.env.VITE_USDCA);

const xIcon = <IconX style={{ width: rem(20), height: rem(20) }} />;
const checkIcon = <IconCheck style={{ width: rem(20), height: rem(20) }} />;

export default function EventCard({ appId }: props) {
  const { signer, activeAddress } = useWallet();
  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algodClient = algokit.getAlgoClient({
    server: algodConfig.server,
    port: algodConfig.port,
    token: algodConfig.token,
  });

  const [opened, { open, close }] = useDisclosure(false);
  const [buyData, setBuyData] = useState({
    index: 0,
    amount: 0,
  });

  const [event, setEvent] = useState<EventType>({
    appID: 0,
    name: "",
    image: "",
    description: "",
    owner: "",
    ticketTypes: 0,
    begins: new Date(),
    ends: new Date(),
    tTypes: [],
    tTypesJson: [],
  });
  async function getEventData() {
    const managerClient = new EventManagerClient(
      {
        // sender: { signer, addr: activeAddress } as TransactionSignerAccount,
        resolveBy: "id",
        id: appId,
      },
      algodClient
    );
    const managerState = await managerClient.getGlobalState();
    const lastIndex = managerState.lastTypeIndex!.asNumber();
    let event: EventType = {
      appID: appId,
      image: "",
      description: "",
      name: managerState.name!.asString(),
      owner: `${algosdk.encodeAddress(managerState.eventOwner!.asByteArray())}`,
      ticketTypes: managerState.lastTypeIndex!.asNumber(),
      begins: new Date(managerState.eventBegin!.asNumber() * 1000),
      ends: new Date(managerState.eventEnd!.asNumber() * 1000),
      tTypes: [],
      tTypesJson: [],
    };

    for (let i = 0; i < lastIndex; i++) {
      const boxName = encodeBoxNameUint8ArrayFromUint64(TICKET_TYPES_BOX_PREFIX, i);
      const boxBytes = await managerClient.appClient.getBoxValue(boxName);
      const box = decodeTicketTypeBox(boxBytes);
      // console.log(box)
      event.tTypes.push(box);
      const json = (await getJsonData(box.uri.replace("ipfs://", ""))) as EventTypeJson;
      // console.log(json)
      event.image = json.event_image;
      event.description = json.event_description;
      const loc_obj = json.event_location;
      // console.log(loc_obj);
      //@ts-ignore
      event.coordinates = loc_obj["geometry"]["coordinates"];
      if (loc_obj.hasOwnProperty("place_name")) {
        //@ts-ignore
        event.location = loc_obj["place_name"];
      }

      const t: TicketJson = {
        name: json.type_name,
        description: json.type_description,
        price: Number(json.type_price),
        supply: Number(json.type_supply),
        maxPerUser: Number(json.type_max_per_user),
        sold: Number(box.sold),
      };
      event.tTypesJson.push(t);
    }

    return event;
  }

  useEffect(() => {
    getEventData().then((evt) => {
      setEvent(evt);
    });
  }, [appId]);

  async function buyTickets() {
    // data
    if (buyData.amount == 0) {
      console.error("Cannot buy 0 tickets");
      return;
    }
    const amountToBuy = Number(buyData.amount);
    const index = buyData.index;
    // buy tickets
    const typeBox = event.tTypes[index];
    const ticketCost = Number(typeBox.priceMicroAlgo);
    // const maxPerUser = typeBox.maxPerAddress;
    // const supply = typeBox.supply;
    const seats: Uint8Array[] = [];
    const ticketsSold = Number(typeBox.sold);
    for (let i = 0; i < amountToBuy; i++) {
      seats.push(encodeSeatAsUint8Array(i + ticketsSold));
    }

    const owner_b_mbr = computeOwnerBoxMbr(event.ticketTypes, amountToBuy);
    const assets_mbr = computeAssetsArrayMbr(amountToBuy);
    const seats_mbr = computeSeatsArrayMbr(amountToBuy);

    const client = new EventManagerClient(
      {
        resolveBy: "id",
        id: appId,
        sender: { signer, addr: activeAddress } as TransactionSignerAccount,
      },
      algodClient
    );

    const appRef = await client.appClient.getAppReference();

    // const amount = amountToBuy * ticketCost + owner_b_mbr + assets_mbr + seats_mbr + 100_000 * amountToBuy;
    const amount = owner_b_mbr + assets_mbr + seats_mbr + 100_000 * amountToBuy;
    console.log(`computed mbr: ${amount} - owner ${owner_b_mbr} - assets ${assets_mbr} - seats ${seats_mbr}`);
    const payTxn = await makePaymentTxn(algodClient, activeAddress!, appRef.appAddress, amount);
    const boxes_refs: Uint8Array[] = [];
    const ref_tt = (appRef.appId, encodeBoxNameUint8ArrayFromUint64(TICKET_TYPES_BOX_PREFIX, index));
    const ref_owner = (appRef.appId, encodeBoxNameUint8ArrayFromAddress(OWNER_BOX_PREFIX, activeAddress!));
    const ref_seats = (appRef.appId, encodeBoxNameUint8ArrayFromUint64(SEATS_BOX_PREFIX, index));
    const ref_assets = (appRef.appId, encodeBoxNameUint8ArrayFromUint64(ASSETS_BOX_PREFIX, index));
    boxes_refs.push(ref_tt);
    boxes_refs.push(ref_owner);
    boxes_refs.push(ref_seats);
    boxes_refs.push(ref_assets);

    // TODO check this formula
    // cost opt = 600 + 100 * [number of tickets]
    // in case of 5 tickets opts = 600 + 5* 100 = 1100 => 1 opt up
    let estimation = 600 + (amountToBuy + ticketsSold) * 500;
    const optup = Math.floor(estimation / 700);
    console.log(`1st opt up is ${optup}`);

    // asset txn
    const suggestedParams = await algodClient.getTransactionParams().do();
    const payAsset = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      assetIndex: USDC_A_ID,
      from: activeAddress!,
      to: appRef.appAddress,
      amount: amountToBuy * ticketCost,
      suggestedParams,
    });

    // simulate buy tickets
    const result = await client
      .buyTicket(
        {
          owner: activeAddress!,
          numberTickets: amountToBuy,
          ticketTypeIndex: index,
          seats: seats,
          payMbr: payTxn,
          payAsset: payAsset,
        },
        { boxes: boxes_refs, sendParams: { fee: AlgoAmount.MicroAlgos(1_000 * (amountToBuy + 1 + optup)) } }
      )
      .catch((e: Error) => {
        notifications.show({
          title: "Error on buy tickets",
          message: `Error calling the contract: ${e.message}`,
          color: "red",
          icon: xIcon,
        });
        console.error(`buy tickets [manager id ${appRef.appId} ] [address ${appRef.appAddress}] form failed: ${e.message}`);
        return undefined;
      });

    if (result === undefined) {
      return;
    }
    notifications.show({
      title: "buy tickets successfull",
      message: `Response ${JSON.stringify(result.confirmation)}`,
      color: "green",
      icon: checkIcon,
    });
    setBuyData({ index: 0, amount: 0 });
    close();
  }

  return (
    <>
      <Card style={{ width: 600 }} shadow="sm" padding="lg" radius="md" withBorder>
        <Card.Section>
          <Image src={ipfsUrl(event.image)} height={160} alt={`${event.name} image`} />
        </Card.Section>

        <Group justify="space-between" mt="md" mb="xs">
          <Text size="xl" fw={800}>
            {event.name.toUpperCase()}
          </Text>
          <Badge color="pink">On Sale</Badge>
        </Group>

        <Text size="md">Description: {event.description}</Text>
        <Text size="md">Location: {event.location}</Text>
        {event.coordinates && (
          <Group mb="md">
            <Map
              mapLib={maplibregl}
              initialViewState={{
                longitude: event.coordinates[0],
                latitude: event.coordinates[1],
                zoom: 16,
              }}
              style={{ width: "300px", height: "300px" }}
              mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${apiKey}`}
            ></Map>
          </Group>
        )}
        <Accordion variant="separated" radius="lg">
          {event.tTypesJson.map((item, index) => (
            <Accordion.Item key={item.name} value={item.name}>
              <Accordion.Control icon={<IconTicket />}>
                Buy {item.name} tickets - Available {item.supply - item.sold} / {item.supply}
              </Accordion.Control>
              <Accordion.Panel>
                <List
                  spacing="xs"
                  size="sm"
                  mb="md"
                  center
                  icon={
                    <ThemeIcon color="grey" size={24} radius="xl">
                      <IconCircleCheck style={{ width: rem(16), height: rem(16) }} />
                    </ThemeIcon>
                  }
                >
                  <List.Item>Description: {item.description}</List.Item>
                  <List.Item>Max tickets per user: {item.maxPerUser}</List.Item>
                  <List.Item>Ticket price: {item.price ? (item.price / 10 ** 6).toFixed(2) : 0} USDCa</List.Item>
                </List>
                <Text></Text>
                <Button
                  leftSection={<IconCreditCardPay />}
                  color="blue"
                  radius="md"
                  onClick={() => {
                    setBuyData({ index: index, amount: buyData.amount });
                    open();
                  }}
                  disabled={!activeAddress}
                >
                  {!activeAddress ? "Connect wallet to" : ""} buy {item.name} tickets
                </Button>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Card>
      {event.tTypesJson.length > 0 && (
        <Modal
          opened={opened}
          onClose={() => {
            setBuyData({ index: 0, amount: 0 });
            close();
          }}
          title={`Buy ${event.tTypesJson[buyData.index].name} tickets`}
        >
          <NumberInput
            allowNegative={false}
            label="number of tickets to buy"
            value={buyData.amount}
            max={event.tTypesJson[buyData.index].maxPerUser}
            onChange={(ref) => {
              setBuyData({ index: buyData.index, amount: Number(ref) });
            }}
          />
          <Group justify="flex-end" mt="md">
            <Button
              leftSection={<IconX />}
              color="red"
              radius="md"
              onClick={() => {
                setBuyData({ index: 0, amount: 0 });
                close();
              }}
            >
              cancel
            </Button>
            <Button
              leftSection={<IconCreditCardPay />}
              color="blue"
              radius="md"
              onClick={() => {
                buyTickets()
                  .then((_) => {
                    return getEventData();
                  })
                  .then((e) => {
                    setEvent(e);
                  });
              }}
              disabled={!activeAddress}
            >
              {!activeAddress ? "Connect wallet to" : ""} buy {buyData.amount} tickets for{" "}
              {((event.tTypesJson[buyData.index].price * buyData.amount) / 10 ** 6).toFixed(2)} USDCa
            </Button>
          </Group>
        </Modal>
      )}
    </>
  );
}
