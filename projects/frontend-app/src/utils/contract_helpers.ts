import algosdk, { Algodv2, Account, encodeUint64, decodeAddress } from "algosdk";
import * as algokit from "@algorandfoundation/algokit-utils";
import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount";

/* eslint-disable no-console */
const COST_PER_BYTE = 400;
const COST_PER_BOX = 2500;
const T_PREFIX_SIZE = 3;
const T_KEY_SIZE = 8;

export const EVENT_MANAGER_STATE = {
  INIT: 0,
  STARTED: 1,
  ON_GOING: 2,
  ENDED: 3,
  CANCELED: 4,
} as const;

export const EVENT_MANAGER_BOX_MBR = COST_PER_BOX + COST_PER_BYTE * (T_PREFIX_SIZE + 8 + 8);
export const EVENT_MANAGER_CREATOR_BOX_MBR = COST_PER_BOX + COST_PER_BYTE * (T_PREFIX_SIZE + 8 + 32);
export const EVENT_CREATION_FEE = 2_000_000;

export const EVENT_MANAGER_BOX_PREFIX = "em-";
export const EVENT_MANAGER_CREATOR_BOX_PREFIX = "ce-";
export const TICKET_TYPES_BOX_PREFIX = "tt-";

export const OWNER_BOX_PREFIX = "ot-";
export const SEATS_BOX_PREFIX = "sb-";
export const ASSETS_BOX_PREFIX = "ab-";

export type bytes32Str = `${string}`;

export async function dispenseAlgos(to: Account, dispenser: Account, amountMicroAlgos: number, algod: Algodv2): Promise<void> {
  await algokit.transferAlgos(
    {
      from: dispenser,
      to,
      amount: AlgoAmount.MicroAlgos(amountMicroAlgos),
    },
    algod
  );
}

export function computeOwnerBoxMbr(numberOfTypes: number, ownedTicketsNumber: number, prefix_size: number = 3, key_size = 32): number {
  let mbr = 0;
  // seats: SeatsArray
  mbr += computeDynamicAddressMbr(ownedTicketsNumber);
  // assets: AssetsArray and bought_tickets: arc4.DynamicArray[arc4.UInt64]
  mbr += computeDynamicUint64Mbr(ownedTicketsNumber);
  // check this no + 4 for length ... why ???
  mbr += numberOfTypes * 8 * COST_PER_BYTE;
  mbr += commonBoxCost(prefix_size, key_size);
  return mbr;
}

export function computeSeatsArrayMbr(seatsNumber: number, prefix_size: number = 3, key_size = 8): number {
  let mbr = 0;
  mbr += computeDynamicAddressMbr(seatsNumber);
  mbr += commonBoxCost(prefix_size, key_size);
  return mbr;
}

export function computeAssetsArrayMbr(assetsNumber: number, prefix_size: number = 3, key_size = 8): number {
  let mbr = 0;
  mbr += computeDynamicUint64Mbr(assetsNumber);
  mbr += commonBoxCost(prefix_size, key_size);
  return mbr;
}

function commonBoxCost(prefix_size: number, key_size: number) {
  const commonBoxCost = COST_PER_BOX + COST_PER_BYTE * (prefix_size + key_size);
  return commonBoxCost;
}

function computeDynamicAddressMbr(array_size: number): number {
  // address => 32 bytes
  // 4 bytes for dynamic len and type
  return (array_size * 32 + 4) * COST_PER_BYTE;
}

function computeDynamicUint64Mbr(array_size: number) {
  // uint64 => 8 bytes
  // 4 bytes for dynamic len and type
  return (array_size * 8 + 4) * COST_PER_BYTE;
}

function computeBytesElement(element: unknown): number {
  if (element instanceof Array) {
    let tempSize = 0;
    for (let i = 0; i < element.length; i += 1) {
      const el = element[i];
      tempSize += computeBytesElement(el);
    }
    return tempSize;
  }
  const elementType = typeof element;

  switch (elementType) {
    case "string":
      // string => dynamic array so 4 bytes for len and type
      return (element as string).length + 4;
    // return (element as string).length
    case "number":
      return 8;
    default:
      if (element instanceof Uint8Array) {
        // TODO: needs to be checked
        return element.length;
      }
      return 8;
  }
}

export function computeMbrFromType(obj: { [key: string]: unknown[] }): number {
  const objKeys = Object.keys(obj);
  let mbr = 0;
  for (let i = 0; i < objKeys.length; i += 1) {
    const k = objKeys[i];
    const element = obj[k];
    const numBytes = computeBytesElement(element);
    mbr += numBytes * COST_PER_BYTE;
  }
  const commonBoxCost = COST_PER_BOX + COST_PER_BYTE * (T_PREFIX_SIZE + T_KEY_SIZE);
  // console.log(`common box cost is ${commonBoxCost}`);
  mbr += commonBoxCost * obj[objKeys[0]].length;

  return mbr;
}

export function computeMbrFromList(obj: unknown[][]): number {
  let mbr = 0;
  for (let i = 0; i < obj.length; i += 1) {
    for (let j = 0; j < obj[i].length; j += 1) {
      const element = obj[i][j];
      const numBytes = computeBytesElement(element);
      mbr += numBytes * COST_PER_BYTE;
    }
  }
  const commonBoxCost = COST_PER_BOX + COST_PER_BYTE * (T_PREFIX_SIZE + T_KEY_SIZE);
  // console.log(`common box cost is ${commonBoxCost}`);
  mbr += commonBoxCost * obj.length;

  return mbr;
}

export function decodeBoxName(base64: string, prefixSize: number): string {
  const buffer = Buffer.from(base64, "base64");
  const bufString = buffer.toString("hex").substring(prefixSize * 2);
  const prefix = buffer.subarray(0, prefixSize);
  return `${prefix}${parseInt(bufString, 16)}`;
}

export async function checkNftAsset(
  assetId: number,
  name: string,
  unitName: string,
  creatorAddr: string,
  managerAddr: string,
  freezeAddr: string,
  uri: string,
  base64Hash: string,
  seatAsReserveAddr: string,
  algod: Algodv2
): Promise<boolean> {
  const asset = await algod.getAssetByID(assetId).do();
  const { index, params } = asset;
  // console.log(`asset check val: ${JSON.stringify(asset)}`);
  if (index !== assetId) {
    return false;
  }
  // it's a nft
  if (params.decimals !== 0) {
    return false;
  }

  if (params.total !== 1) {
    return false;
  }

  if (params["default-frozen"] !== true) {
    return false;
  }
  // app addr controls this nft
  if (params.creator !== creatorAddr) {
    console.debug(`Wrong creator addr ${params.creator} isn't ${creatorAddr}`);
    return false;
  }
  if (params.manager !== managerAddr) {
    console.debug(`Wrong manager addr ${params.manager} isn't ${managerAddr}`);
    return false;
  }
  if (params.freeze !== freezeAddr) {
    console.debug(`Wrong freeze addr ${params.freeze} isn't ${freezeAddr}`);
    return false;
  }

  // names
  if (params.name !== name) {
    console.debug(`Wrong name: ${params.name} should be ${name}`);
    return false;
  }
  if (params["unit-name"] !== unitName) {
    console.debug(`Wrong uint-name: ${params["unit-name"]} should be ${unitName}`);
    return false;
  }

  // uri and hash
  if (params.url !== uri) {
    console.debug(`Wrong uri: ${params.uri} should be ${uri}`);
    return false;
  }

  if (params["metadata-hash"] !== base64Hash) {
    console.debug(`Wrong metadata-hash: ${params["metadata-hash"]} should be ${base64Hash}`);
    return false;
  }

  // reserve address
  if (params.reserve !== seatAsReserveAddr) {
    console.debug(`Wrong reserve address [encodes a seat]: ${params.reserve} should be ${seatAsReserveAddr}`);
    return false;
  }

  return true;
}

export type TicketTypeBox = {
  uri: string;
  uriHash: string;
  priceMicroAlgo: number;
  supply: number;
  maxPerAddress: number;
  sold: number;
};

export function decodeTicketTypeBox(boxBytes: Uint8Array): TicketTypeBox {
  const codec = algosdk.ABIType.from("(string,byte[32],uint64,uint64,uint64,uint64)");
  const decodedValue = codec.decode(boxBytes) as algosdk.ABIValue[];
  // const val = decodedValue.toString().split(',')
  const uri = decodedValue[0] as string;
  const hash = decodedValue[1] as Uint8Array;
  const hashHex = Buffer.from(hash).toString("hex");
  const price = decodedValue[2] as number;
  const supply = decodedValue[3] as number;
  const maxPerUser = decodedValue[4] as number;
  const sold = decodedValue[5] as number;
  const ttb: TicketTypeBox = {
    uri: uri,
    uriHash: `0x${hashHex}`,
    priceMicroAlgo: price,
    supply: supply,
    maxPerAddress: maxPerUser,
    sold: sold,
  };
  return ttb;
}

export type SoldTicketsBox = {
  ownerAddr: string;
  buyerAddr: string;
  asaId: number;
  type: number;
  seatAsAddr: string;
};

export function decodeSoldTicketsBox(boxBytes: Uint8Array): SoldTicketsBox {
  const codec = algosdk.ABIType.from("(address,address,uint64,uint64,address)");
  const decodedValue = codec.decode(boxBytes);
  const val = decodedValue.toString().split(",");
  const stb: SoldTicketsBox = {
    ownerAddr: val[0],
    buyerAddr: val[1],
    asaId: parseInt(val[2], 10),
    type: parseInt(val[3], 10),
    seatAsAddr: val[4],
  };
  return stb;
}

export function decodeEventMangerBoxFromFactory(boxBytes: Uint8Array): number {
  const codec = algosdk.ABIType.from("uint64");
  const decodedValue = codec.decode(boxBytes);
  return decodedValue as number;
}

export function encodeBase64(str: string): string {
  return Buffer.from(str, "binary").toString("base64");
}

export function encodeBoxNameUint8ArrayFromUint64(prefix: string, index: number): Uint8Array {
  const intEnc = encodeUint64(index);
  const prefixEnc = new TextEncoder().encode(prefix);
  const concatArray = new Uint8Array([...prefixEnc, ...intEnc]);
  return concatArray;
}

export function encodeBoxNameUint8ArrayFromAddress(prefix: string, addr: string): Uint8Array {
  const addrEnc = decodeAddress(addr).publicKey;
  const prefixEnc = new TextEncoder().encode(prefix);
  const concatArray = new Uint8Array([...prefixEnc, ...addrEnc]);
  return concatArray;
}

export async function makePaymentTxn(
  algod: Algodv2,
  fromAddr: string,
  toAddr: string,
  amount: number | bigint
): Promise<algosdk.Transaction> {
  const payment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    from: fromAddr,
    to: toAddr,
    amount: amount,
    suggestedParams: await algod.getTransactionParams().do(),
  });
  return payment;
}

export function encodeSeatAsUint8Array(seatNumber: number) {
  let bytes32 = new Uint8Array(32);
  const ref = Uint8Array.from([seatNumber]);
  if (ref.length > 32) {
    throw "Ref number is too large";
  }
  for (let i = 0; i < ref.length; i++) {
    bytes32[i] = ref[i];
  }
  return bytes32;
}
