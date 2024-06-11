import AlgodClient from 'algosdk/dist/types/client/v2/algod/algod'
import { UsdcaMockClient } from '../../../smart_contracts/artifacts/usdca_mock/client'
import algosdk from 'algosdk'


const DISPENSER_TESTNET = 1023
const CLIENT_SERVER_PORT = 8822
const CLIENT_SERVER_URL =  "http://ccc"
const ASSET_ID = 100

export function dispense() {
    const algod = new algosdk.Algodv2("", CLIENT_SERVER_URL, CLIENT_SERVER_PORT);
    const appClient = new UsdcaMockClient(
    {
      resolveBy: 'id',
      id: DISPENSER_TESTNET
    },
    // @ts-ignore
    algod,
  )
  const response = await appClient.dispense({ amount: 10_000_000 }, { sendParams: { fee: AlgoAmount(2_000) }, assets:[ASSET_ID, ] })

}
