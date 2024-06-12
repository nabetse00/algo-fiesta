import { Button, Card, Fieldset, FileInput, Group, LoadingOverlay, Modal, NumberInput, TextInput, rem } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import "@mantine/dates/styles.css";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import MapComponent from "../components/maps";
// import type { Feature } from "@maptiler/geocoding-control/types";
import { IconCheck, IconCoin, IconPhotoUp, IconTrashFilled, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { hashObj, uploadJson, uploadToIpfs } from "../utils/ipfs";
import { EventTypeJson } from "../types/models";
import { algosToMicroalgos } from "algosdk";
import { Feature } from "maplibre-gl";
import { EventFactoryClient } from "../utils/eventFactoryClient";
import { useWallet } from "@txnlab/use-wallet";
import { getAlgodConfigFromViteEnvironment } from "../utils/network";
import * as algokit from "@algorandfoundation/algokit-utils";
import WalletNotConnected from "../components/WalleNotConnected";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import {
  EVENT_CREATION_FEE,
  EVENT_MANAGER_BOX_MBR,
  EVENT_MANAGER_BOX_PREFIX,
  EVENT_MANAGER_CREATOR_BOX_MBR,
  EVENT_MANAGER_CREATOR_BOX_PREFIX,
  TICKET_TYPES_BOX_PREFIX,
  computeMbrFromType,
  encodeBoxNameUint8ArrayFromUint64,
  makePaymentTxn,
} from "../utils/contract_helpers";
import { EventManagerClient } from "../utils/eventManagerClient";
import { useDisclosure } from "@mantine/hooks";
import { CodeHighlight } from "@mantine/code-highlight";
import "@mantine/code-highlight/styles.css";

const MIN_DURATION_HR = 24;
const MIN_DURATION_MS = MIN_DURATION_HR * 3600 * 1000;
const MIN_AHEAD_TIME_HR = 12;
const MIN_AHEAD_TIME_MS = MIN_AHEAD_TIME_HR * 3600 * 1000;

const FACTORY_APP_ID = Number(import.meta.env.VITE_EVENT_FACTORY_CONTRACT);
const USDC_A_ID = Number(import.meta.env.VITE_USDCA);

dayjs.extend(customParseFormat);

const xIcon = <IconX style={{ width: rem(20), height: rem(20) }} />;
const checkIcon = <IconCheck style={{ width: rem(20), height: rem(20) }} />;

interface ticketType {
  name: string;
  description: string;
  uri: string;
  hash: string;
  price: number;
  supply: number;
  maxPerUser: number;
  sold: number;
}

function validateTicket({ name, description, price, supply, maxPerUser }: ticketType) {
  if (name.length == 0) return false;
  if (description.length == 0) return false;
  if (price < 0) return false;
  if (supply <= 0) return false;
  if (maxPerUser <= 0) return false;
  if (maxPerUser > supply) return false;
  return true;
}

export default function CreateEventPage() {
  const [loading, setLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState("init");
  const { signer, activeAddress } = useWallet();
  const [opened, { open, close }] = useDisclosure(false);

  const algodConfig = getAlgodConfigFromViteEnvironment();
  const algodClient = algokit.getAlgoClient({
    server: algodConfig.server,
    port: algodConfig.port,
    token: algodConfig.token,
  });

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      name: "",
      description: "",
      beginDate: new Date(),
      endDate: new Date(),
      image: undefined,
      location: undefined,
      tickets: [
        {
          name: "",
          description: "",
          uri: "",
          hash: "",
          price: 0,
          supply: 0,
          maxPerUser: 0,
          sold: 0,
        },
      ],
    },
    validate: {
      name: (value) => (value.length > 5 ? null : "Invalid name, at least 5 characters"),
      description: (value) => (value.length > 10 ? null : "Invalid description, at least 10 characters"),
      beginDate: (value) =>
        value.getTime() > Date.now() + MIN_AHEAD_TIME_MS
          ? null
          : `invalid begin date should be at least ${MIN_AHEAD_TIME_HR} hours in the future`,
      endDate: (value, values) =>
        value.getTime() > values.beginDate.getTime() + MIN_DURATION_MS
          ? null
          : `invalid end date, event duration should be at least ${MIN_DURATION_HR} hours`,
      location: (value) => (value !== undefined ? null : `You must choose a location`),
      image: (value) => (value !== undefined ? null : `You must choose am image`),
      tickets: (value) => (!value.some((e) => !validateTicket(e)) ? null : `Error in tickets type`),
    },
  });

  async function handleForm(values: {
    name: string;
    description: string;
    beginDate: Date;
    endDate: Date;
    image: undefined;
    location: undefined;
    tickets: {
      name: string;
      description: string;
      uri: string;
      hash: string;
      price: number;
      supply: number;
      maxPerUser: number;
      sold: number;
    }[];
  }) {
    setLoading(true);
    console.log(values);

    // upload image to ipfs
    setCreateStatus("upload image to ipfs");
    const imageCid = await uploadToIpfs(values.image as unknown as File).catch((e) => {
      notifications.show({
        title: "image upload to ipfs failed",
        message: `Received error ${e}`,
        color: "red",
        icon: xIcon,
      });
      return undefined;
    });
    if (imageCid === undefined) {
      return;
    }
    console.log(`image cid ${imageCid}`);
    notifications.show({
      title: "image uploaded to ipfs",
      message: `Received cid is ${imageCid}`,
      color: "green",
      icon: checkIcon,
    });
    // prepare metadata
    let eventType: EventTypeJson = {
      begin_date: values.beginDate,
      end_date: values.endDate,
      event_image: imageCid,
      event_name: values.name,
      event_description: values.description,
      type_name: "",
      type_description: "",
      type_price: "",
      type_supply: "",
      type_max_per_user: "",
      event_location: values.location as unknown as Feature,
    };
    const tickets = values.tickets;
    setCreateStatus("upload metadata to ipfs");
    for (const t of tickets) {
      setCreateStatus(`uploading [${t.name} type]`);
      eventType.type_name = t.name;
      eventType.type_description = t.description;
      eventType.type_price = algosToMicroalgos(t.price).toString();
      eventType.type_supply = t.supply.toString();
      eventType.type_max_per_user = t.maxPerUser.toString();

      const event_type_cid = await uploadJson(eventType).catch((e) => {
        notifications.show({
          title: "Event json upload to ipfs failed",
          message: `Received error ${e}`,
          color: "red",
          icon: xIcon,
        });
        return undefined;
      });
      if (!event_type_cid) {
        return;
      }
      t.uri = event_type_cid;
      notifications.show({
        title: "Event Json uploaded to ipfs",
        message: `Received cid is ${event_type_cid}`,
        color: "green",
        icon: checkIcon,
      });
      // hash metadata
      setCreateStatus(`Waiting for ipfs data [${t.name} type]`);
      // const hash = await hashJsonData(event_type_cid);
      const hash = hashObj(eventType);
      setCreateStatus(`Done for ipfs data [${t.name} type]`);
      t.hash = hash;
    }
    console.log("done with ipfs");
    setCreateStatus("upload to ipfs done");
    console.log(tickets);

    // contract factory
    setCreateStatus("Retreive event factory info");
    const factoryClient = new EventFactoryClient(
      {
        sender: { signer, addr: activeAddress } as TransactionSignerAccount,
        resolveBy: "id",
        id: FACTORY_APP_ID,
      },
      algodClient
    );
    const factoryAppRef = await factoryClient.appClient.getAppReference();
    const create_amount = EVENT_MANAGER_BOX_MBR + EVENT_MANAGER_CREATOR_BOX_MBR + EVENT_CREATION_FEE;
    const create_payTxn = await makePaymentTxn(algodClient, activeAddress!, factoryAppRef.appAddress, create_amount);
    setCreateStatus("Prepare event factory call");
    const state = await factoryClient.getGlobalState();
    const last_event = state.lastEventManager ? state.lastEventManager.asNumber() : 0;
    const ref_event = (factoryAppRef.appId, encodeBoxNameUint8ArrayFromUint64(EVENT_MANAGER_BOX_PREFIX, last_event));
    const ref_creator = (factoryAppRef.appId, encodeBoxNameUint8ArrayFromUint64(EVENT_MANAGER_CREATOR_BOX_PREFIX, last_event));
    const response = await factoryClient
      .createEventManager({ pay: create_payTxn }, { sendParams: { fee: algokit.microAlgos(3_000) }, boxes: [ref_event, ref_creator] })
      .catch((e: Error) => {
        notifications.show({
          title: "Error on Create Event",
          message: `Error calling the contract: ${e.message}`,
          color: "red",
          icon: xIcon,
        });
        console.error(`create event form factory failed: ${e.message}`);
        return undefined;
      });
    if (response === undefined) {
      return;
    }
    const eventManagerAppId = Number(response.return);
    notifications.show({
      title: "Create Event Success !",
      message: `${activeAddress} created empty event Manager with id ${eventManagerAppId}`,
      color: "green",
      icon: checkIcon,
    });

    // start event
    const ticketsData = {
      ticketUri: [] as string[],
      ticketUriHash: [] as Uint8Array[],
      ticketPrice: [] as number[],
      ticketSupply: [] as number[],
      ticketsMaxPerAddr: [] as number[],
      soldAmounts: [] as number[],
    };
    for (const t of tickets) {
      ticketsData.ticketUri.push(`ipfs://${t.uri}`);
      //const hashArr =  new TextEncoder().encode(t.hash)
      const hashArr = Uint8Array.from(Buffer.from(t.hash, "hex"));
      ticketsData.ticketUriHash.push(hashArr);
      ticketsData.ticketPrice.push(algosToMicroalgos(t.price));
      ticketsData.ticketSupply.push(t.supply);
      ticketsData.ticketsMaxPerAddr.push(t.maxPerUser);
      ticketsData.soldAmounts.push(t.sold);
    }

    const boxes_refs: Uint8Array[] = [];
    for (let i = 0; i < tickets.length; i++) {
      const ref = (BigInt(eventManagerAppId), encodeBoxNameUint8ArrayFromUint64(TICKET_TYPES_BOX_PREFIX, i));
      boxes_refs.push(ref);
    }

    const managerClient = new EventManagerClient(
      {
        resolveBy: "id",
        id: eventManagerAppId,
        sender: { signer, addr: activeAddress } as TransactionSignerAccount,
      },
      algodClient
    );

    const managerAppRef = await managerClient.appClient.getAppReference();

    const amount = computeMbrFromType(ticketsData) + 100_000;
    const payTxn = await makePaymentTxn(algodClient, activeAddress!, managerAppRef.appAddress, amount);

    const result = await managerClient
      .startEvent(
        {
          name: values.name,
          owner: activeAddress!,
          usdcAsset: USDC_A_ID,
          beginTs: Math.floor(eventType.begin_date.getTime()/1000),
          endTs: Math.floor(eventType.end_date.getTime()/1000),
          ttUrls: ticketsData.ticketUri,
          ttHash: ticketsData.ticketUriHash,
          ttPrices: ticketsData.ticketPrice,
          ttMaxPerUser: ticketsData.ticketsMaxPerAddr,
          ttSupply: ticketsData.ticketSupply,
          ttSoldAmount: ticketsData.soldAmounts,
          payMbr: payTxn,
        },
        { sendParams: { fee: algokit.microAlgos(3_000) }, boxes: boxes_refs }
      )
      .catch((e: Error) => {
        notifications.show({
          title: "Error on Event start",
          message: `Error calling the contract: ${e.message}`,
          color: "red",
          icon: xIcon,
        });
        console.error(`start event [manager id ${managerAppRef} ] [factory id ${eventManagerAppId}]form failed: ${e.message}`);
        return undefined;
      });
    setCreateStatus("Contract call Done!");
    if (result == undefined) {
      setCreateStatus("Result undefined after start event call");
      return;
    }
    setCreateStatus("All Done!");

    console.log("done");
    setLoading(false);
    open();
  }

  return (
    <>
      {activeAddress ? (
        <Card style={{ width: 800 }}>
          <LoadingOverlay
            visible={loading}
            zIndex={400}
            overlayProps={{ radius: "sm", blur: 2 }}
            loaderProps={{ children: createStatus }}
          />
          <form onSubmit={form.onSubmit((values) => handleForm(values))}>
            <TextInput label="Event Name" placeholder="Your event name" key={form.key("name")} {...form.getInputProps("name")} />
            <TextInput
              label="Event Description"
              placeholder="Your description"
              key={form.key("description")}
              {...form.getInputProps("description")}
            />
            <FileInput
              leftSection={<IconPhotoUp style={{ width: rem(18), height: rem(18) }} stroke={1.5} />}
              label="Event image"
              placeholder="your event image"
              leftSectionPointerEvents="none"
              key={form.key("image")}
              {...form.getInputProps("image")}
            />
            <DateInput
              key={form.key("beginDate")}
              valueFormat="YYYY MMM DD HH:mm"
              {...form.getInputProps("beginDate")}
              label="BeginDate"
              placeholder="Event begin date"
            />

            <DateInput
              key={form.key("endDate")}
              valueFormat="YYYY MMM DD HH:mm"
              {...form.getInputProps("endDate")}
              label="endDate"
              placeholder="Event End date"
            />
            <Fieldset legend="Event Location" variant="filled">
              <MapComponent {...form.getInputProps("location")} key={form.key("location")} />
            </Fieldset>

            {form.getValues().tickets.map((_item, index) => (
              <Fieldset key={`fs${index}`} mt="md" legend={`Ticket Type ${index + 1}`}>
                <Group key={`g${index}`} mt="xs">
                  <TextInput label="Type Name" key={form.key(`tickets.${index}.name`)} {...form.getInputProps(`tickets.${index}.name`)} />
                  <TextInput
                    label="Type Description"
                    key={form.key(`tickets.${index}.description`)}
                    {...form.getInputProps(`tickets.${index}.description`)}
                  />
                  <NumberInput
                    label="Price"
                    leftSection={<IconCoin />}
                    thousandSeparator=" "
                    allowNegative={false}
                    min={0}
                    key={form.key(`tickets.${index}.price`)}
                    {...form.getInputProps(`tickets.${index}.price`)}
                  />
                  <NumberInput
                    label="Supply"
                    allowNegative={false}
                    min={0}
                    max={1000}
                    key={form.key(`tickets.${index}.supply`)}
                    {...form.getInputProps(`tickets.${index}.supply`)}
                  />
                  <NumberInput
                    label="Max Per User"
                    allowNegative={false}
                    min={0}
                    max={1000}
                    key={form.key(`tickets.${index}.maxPerUser`)}
                    {...form.getInputProps(`tickets.${index}.maxPerUser`)}
                  />
                </Group>
                {index > 0 && (
                  <Group justify="flex-end" mt="md">
                    <Button
                      onClick={() => form.removeListItem("tickets", index)}
                      leftSection={<IconTrashFilled size={18} stroke={1.5} />}
                      variant="filled"
                      color="red"
                    >
                      Remove type
                    </Button>
                  </Group>
                )}
              </Fieldset>
            ))}

            <Group justify="flex-end" mt="4">
              <Button
                justify="flex-end"
                onClick={() =>
                  form.insertListItem("tickets", {
                    name: "",
                    description: "",
                    uri: "",
                    hash: 0,
                    price: 0,
                    supply: 0,
                    maxPerUser: 0,
                    sold: 0,
                  })
                }
              >
                Add Type
              </Button>
            </Group>
            <Group justify="flex-start" mt="md">
              <Button type="submit">Create Event [2 Algo fee]</Button>
            </Group>
          </form>
        </Card>
      ) : (
        <WalletNotConnected message="Create Event page" />
      )}
      <Modal
        opened={opened}
        onClose={close}
        title="Event Created succesfully!"
        size="auto"
        transitionProps={{ transition: "fade", duration: 200 }}
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        centered
      >
        <p>Meta Data </p>
        <CodeHighlight
          code={JSON.stringify(form.getValues(), null, "\t")}
          language="json"
          copyLabel="Copy button code"
          copiedLabel="Copied!"
        />
      </Modal>
    </>
  );
}
