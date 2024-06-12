import { Card, Image, Text, Badge, Button, Group } from "@mantine/core";
import { EventManagerClient } from "../utils/eventManagerClient";
import { getAlgodConfigFromViteEnvironment } from "../utils/network";
import * as algokit from "@algorandfoundation/algokit-utils";
import { useEffect, useState } from "react";
import { TICKET_TYPES_BOX_PREFIX, TicketTypeBox, decodeTicketTypeBox, encodeBoxNameUint8ArrayFromUint64 } from "../utils/contract_helpers";
import algosdk from "algosdk";
import { getJsonData, ipfsUrl } from "../utils/ipfs";
import { EventTypeJson } from "../types/models";

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
export default function EventCard({ appId }: props) {
  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algodClient = algokit.getAlgoClient({
    server: algodConfig.server,
    port: algodConfig.port,
    token: algodConfig.token,
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
      const loc_obj = json.event_location
      console.log(loc_obj)
      if (loc_obj.hasOwnProperty('place_name')) {
        //@ts-ignore
        event.location = loc_obj['place_name'];
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

  return (
    <Card style={{ width: 600 }} shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image src={ipfsUrl(event.image)} height={160} alt="Norway" />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={600}>{event.name}</Text>
        <Badge color="pink">On Sale</Badge>
      </Group>

      <Text size="sm" c="dimmed">
        Description: {event.description}
      </Text>
      <Text size="sm" c="dimmed">
        Location: {event.location}
      </Text>

      {event.tTypesJson.map((t) => (
        <Group mt="md" mb="xs">
          <Button color="blue" radius="md">
            buy {t.name} tickets
          </Button>
          <Text>
            available {t.supply - t.sold} / {t.supply}
          </Text>
          <Text>Max per user: {t.maxPerUser}</Text>
        </Group>
      ))}
    </Card>
  );
}
