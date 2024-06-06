import * as algokit from '@algorandfoundation/algokit-utils'
import { EventFactoryClient } from '../artifacts/event_factory/client'
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
} from '../helpers/test_helpers'
import { EventManagerClient } from '../artifacts/event_manager/client'

// Below is a showcase of various deployment options you can use in TypeScript Client
export async function deploy() {
  console.log('=== Deploying EventFactory ===')

  const algod = algokit.getAlgoClient()
  const indexer = algokit.getAlgoIndexerClient()
  const deployer = await algokit.mnemonicAccountFromEnvironment({ name: 'DEPLOYER', fundWith: algokit.algos(3) }, algod)
  await algokit.ensureFunded(
    {
      accountToFund: deployer,
      minSpendingBalance: algokit.algos(10),
      minFundingIncrement: algokit.algos(2),
    },
    algod,
  )
  const appClient = new EventFactoryClient(
    {
      resolveBy: 'creatorAndName',
      findExistingUsing: indexer,
      sender: deployer,
      creatorAddress: deployer.addr,
    },
    algod,
  )

  const app = await appClient.deploy({
    onSchemaBreak: 'append',
    onUpdate: 'append',
  })

  // If app was just created fund the app account
  if (['create', 'replace'].includes(app.operationPerformed)) {
    algokit.transferAlgos(
      {
        amount: algokit.algos(1),
        from: deployer,
        to: app.appAddress,
      },
      algod,
    )
  }

  const method = 'create_event_manager'
  const create_amount = EVENT_MANAGER_BOX_MBR + EVENT_MANAGER_CREATOR_BOX_MBR + EVENT_CREATION_FEE
  const create_payTxn = await makePaymentTxn(algod, deployer.addr, app.appAddress, create_amount)
  const state = await appClient.getGlobalState()
  const last_event = state.lastEventManager ? state.lastEventManager.asNumber() : 0
  const ref_event = (app.appId, encodeBoxNameUint8ArrayFromUint64(EVENT_MANAGER_BOX_PREFIX, last_event))
  const ref_creator = (app.appId, encodeBoxNameUint8ArrayFromUint64(EVENT_MANAGER_CREATOR_BOX_PREFIX, last_event))
  const response = await appClient.createEventManager(
    { pay: create_payTxn },
    { sendParams: { fee: algokit.microAlgos(3_000) }, boxes: [ref_event, ref_creator] },
  )
  console.log(`Called ${method} on ${app.name} (${app.appId}), received: ${response.return}`)
  const em_app_id = Number(response.return)

  // start event

  const bytes32 = new Uint8Array(32)
  const zero = bytes32
  bytes32[0] = 1
  const one = bytes32
  bytes32[1] = 1
  const two = bytes32

  const my_tt: [string, Uint8Array, number | bigint, number, number, number][] = [
    ['ipfs://this-is-a-test/1', zero, 10_000_000, 200, 20, 0],
    ['ipfs://this-is-a-test/2', one, 100_000_000, 50, 5, 0],
    ['ipfs://this-is-a-test/3', two, 1000_000_000, 5, 2, 0],
  ]

  const ticketsData = {
    ticketUri: ['ipfs://this-is-a-test/1', 'ipfs://this-is-a-test/2', 'ipfs://this-is-a-test/3'],
    ticketUriHash: [zero, one, two],
    ticketPrice: [10_000_000, 100_000_000, 1000_000_000],
    ticketSupply: [200, 50, 5],
    ticketsMaxPerAddr: [20, 10, 2],
    soldAmounts: [0, 0, 0],
  }

  const duration: number = 7 * 24 * 3600 // 7 days in seconds
  const aheadTime: number = 1 * 24 * 3600 // 1 days in seconds
  const now = Date.now()
  const beginTimestamp = Math.round(now / 1000) + aheadTime
  const endTimestamp = beginTimestamp + duration
  const boxes_refs: Uint8Array[] = []
  for (let i = 0; i < my_tt.length; i++) {
    const ref = (BigInt(em_app_id), encodeBoxNameUint8ArrayFromUint64(TICKET_TYPES_BOX_PREFIX, i))
    boxes_refs.push(ref)
  }

    const managerClient = new EventManagerClient(
    {
      resolveBy: 'id',
      id:em_app_id,
      sender: deployer
    },
    algod,
  )

  const m_app = await managerClient.appClient.getAppReference()

  const amount = computeMbrFromType(ticketsData)
  const payTxn = await makePaymentTxn(algod, deployer.addr, m_app.appAddress, amount)


  const result = await managerClient.startEvent(
    {
      name: 'New special event',
      owner: deployer.addr,
      beginTs: beginTimestamp,
      endTs: endTimestamp,
      ttUrls: ticketsData.ticketUri,
      ttHash: ticketsData.ticketUriHash,
      ttPrices: ticketsData.ticketPrice,
      ttMaxPerUser: ticketsData.ticketsMaxPerAddr,
      ttSupply: ticketsData.ticketSupply,
      ttSoldAmount: ticketsData.soldAmounts,
      pay: payTxn,
    },
    { boxes: boxes_refs },
  )

  console.log(`Event started !!`)
  
}
