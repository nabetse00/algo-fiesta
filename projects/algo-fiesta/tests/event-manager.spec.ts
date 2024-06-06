import { algoKitLogCaptureFixture, algorandFixture } from '@algorandfoundation/algokit-utils/testing'
import { EventManagerClient } from '../smart_contracts/artifacts/event_manager/client'
import algosdk, { Account, Algodv2, Indexer, decodeAddress } from 'algosdk'
import * as algokit from '@algorandfoundation/algokit-utils'
import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals'
import {
  EVENT_MANAGER_STATE,
  computeAssetsArrayMbr,
  computeMbrFromList,
  computeMbrFromType,
  computeOwnerBoxMbr,
  computeSeatsArrayMbr,
  decodeBoxName,
  dispenseAlgos,
  encodeBoxNameUint8ArrayFromAddress,
  encodeBoxNameUint8ArrayFromUint64,
  makePaymentTxn,
} from '../smart_contracts/helpers/test_helpers'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'

const ALGORAND_ZERO_ADDRESS_STRING = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'
const duration: number = 7 * 24 * 3600 // 7 days in seconds
const aheadTime: number = 1 * 24 * 3600 // 1 days in seconds
const TICKET_TYPES_BOX_PREFIX = 'tt-'
const OWNER_BOX_PREFIX = 'ot-'
const SEATS_BOX_PREFIX = 'sb-'
const ASSETS_BOX_PREFIX = 'ab-'

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
const TICKET_TYPE_REGEXP = /^tt-([0-9]+)/g
const TICKET_SOLD_REGEXP = /^ts-([0-9]+)/g
// useful const
const zero32bytes = new Uint8Array(32)

describe('event manager contract', () => {
  const localnet = algorandFixture()
  const logs = algoKitLogCaptureFixture()
  beforeAll(() => {
    algokit.Config.configure({
      debug: true,
      // traceAll: true,
    }),
      30_000
  })
  beforeEach(async () => {
    await localnet.beforeEach()
    logs.beforeEach()
  })

  async function deploy(account: Account, algod: Algodv2, indexer: Indexer) {
    const client = new EventManagerClient(
      {
        resolveBy: 'creatorAndName',
        findExistingUsing: indexer,
        sender: account,
        creatorAddress: account.addr,
      },
      algod,
    )
    const app = await client.deploy({
      onSchemaBreak: 'append',
      onUpdate: 'append',
    })
    if (['create', 'replace'].includes(app.operationPerformed)) {
      logs.testLogger.info(`Created or replaced ${app.appId} at ${app.appAddress}`)
      algokit.transferAlgos(
        {
          amount: algokit.algos(0.1),
          from: account,
          to: app.appAddress,
        },
        algod,
      )
    }
    return { client, app }
  }

  async function startEvent(
    account: Account,
    now: number,
    duration: number,
    aheadTime: number,
    algod: Algodv2,
    indexer: Indexer,
  ) {
    const { client, app } = await deploy(account, algod, indexer)
    const beginTimestamp = Math.round(now / 1000) + aheadTime
    const endTimestamp = beginTimestamp + duration
    const boxes_refs: Uint8Array[] = []
    for (let i = 0; i < my_tt.length; i++) {
      const ref = (app.appId, encodeBoxNameUint8ArrayFromUint64(TICKET_TYPES_BOX_PREFIX, i))
      boxes_refs.push(ref)
    }
    const amount = computeMbrFromType(ticketsData)
    const payTxn = await makePaymentTxn(algod, account.addr, app.appAddress, amount)

    await client.startEvent(
      {
        name: 'New special event',
        owner: account.addr,
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
    return { beginTimestamp, endTimestamp, client, app }
  }

  async function new_buy_tickets(
    testAccount: Account,
    algod: Algodv2,
    client: EventManagerClient,
    app: any,
    typeIndex: number,
    prev_buy: number
  ) {
    // buy tickets
    const ticketCost = ticketsData.ticketPrice[typeIndex]
    const maxPerUser = ticketsData.ticketsMaxPerAddr[typeIndex]
    const supply = ticketsData.ticketSupply[typeIndex]
    const numberTickets = maxPerUser / 2
    const seats: Uint8Array[] = []
    let ticketsSold = 0
    for (let index = 0; index < numberTickets; index++) {
      seats.push(decodeAddress(algokit.randomAccount().addr).publicKey)
    }
    
    const owner_b_mbr = computeOwnerBoxMbr(ticketsData.ticketUri.length, numberTickets)
    const assets_mbr = computeAssetsArrayMbr(numberTickets)
    const seats_mbr = computeSeatsArrayMbr(numberTickets)

    const amount = numberTickets * ticketCost + owner_b_mbr + assets_mbr + seats_mbr + 100_000 * numberTickets
    logs.testLogger.info(`computed mbr: ${amount} - owner ${owner_b_mbr} - assets ${assets_mbr} - seats ${seats_mbr}`)
    const payTxn = await makePaymentTxn(algod, testAccount.addr, app.appAddress, amount)
    const boxes_refs: Uint8Array[] = []
    const ref_tt = (app.appId, encodeBoxNameUint8ArrayFromUint64(TICKET_TYPES_BOX_PREFIX, typeIndex))
    const ref_owner = (app.appId, encodeBoxNameUint8ArrayFromAddress(OWNER_BOX_PREFIX, testAccount.addr))
    const ref_seats = (app.appId, encodeBoxNameUint8ArrayFromUint64(SEATS_BOX_PREFIX, typeIndex))
    const ref_assets = (app.appId, encodeBoxNameUint8ArrayFromUint64(ASSETS_BOX_PREFIX, typeIndex))
    boxes_refs.push(ref_tt)
    boxes_refs.push(ref_owner)
    boxes_refs.push(ref_seats)
    boxes_refs.push(ref_assets)

    // TODO check this formula
    // cost opt = 600 + 100 * [number of tickets]
    // in case of 5 tickets opts = 600 + 5* 100 = 1100 => 1 opt up
    let estimation = 600 + (numberTickets + ticketsSold) * 500
    const optup = Math.floor(estimation / 700)
    logs.testLogger.info(`1st opt up is ${optup}`)

    // simulate buy tickets
    let comp = client.compose().buyTicket(
      {
        owner: testAccount.addr,
        numberTickets: numberTickets,
        ticketTypeIndex: typeIndex,
        seats: seats,
        pay: payTxn,
      },
      { boxes: boxes_refs, sendParams: { fee: AlgoAmount.MicroAlgos(1_000 * (numberTickets + 1 + optup)) } },
    )
    let sim = await comp.simulate()
    logs.testLogger.info(
      `1st sim result [app bud added] ${JSON.stringify(sim.simulateResponse.txnGroups[0].appBudgetAdded)}`,
    )
    logs.testLogger.info(
      `1st sim result [app budget consumed] ${JSON.stringify(sim.simulateResponse.txnGroups[0].appBudgetConsumed)}`,
    )
    logs.testLogger.info(
      `1st sim result [fail message] ${JSON.stringify(sim.simulateResponse.txnGroups[0].failureMessage)}`,
    )

    // execute buy tickets
    let txn = await comp.execute()

    // check owner box
    const owner_box_val = await client.appClient.getBoxValue(
      encodeBoxNameUint8ArrayFromAddress(OWNER_BOX_PREFIX, testAccount.addr),
    )
    const owner_box_abi_codec = algosdk.ABIType.from('(byte[32][],uint64[],uint64[])')
    const decoded_owner_box = owner_box_abi_codec.decode(owner_box_val) as algosdk.ABIValue[]

    expect(decoded_owner_box.length).toBe(3)
    let d_seats = decoded_owner_box[0].toString().split(',')
    let n_seats = d_seats.length / 32
    expect(n_seats).toBe(numberTickets+prev_buy)
    for (let i = prev_buy; i < n_seats; i++) {
      const box_s = d_seats.slice(i * 32, 32 * (i + 1))
      const s = seats[i-prev_buy].toString().split(',')
      expect(box_s).toStrictEqual(s)
    }

    const asaIds = decoded_owner_box[1] as Uint8Array
    expect(asaIds.length).toBe(numberTickets+prev_buy)
    const bought_tickets = decoded_owner_box[2] as Uint8Array
    expect(bought_tickets.length).toBe(ticketsData.ticketUri.length)
    expect(bought_tickets[typeIndex].toString()).toBe(numberTickets.toString())

    // check seats box
    const seats_box_val = await client.appClient.getBoxValue(
      encodeBoxNameUint8ArrayFromUint64(SEATS_BOX_PREFIX, typeIndex),
    )

    const seats_box_abi_codec = algosdk.ABIType.from('byte[32][]')
    const decoded_seats_box = seats_box_abi_codec.decode(seats_box_val) as algosdk.ABIValue[]
    // for (const el of decoded_owner_box) {
    //   logs.testLogger.info(` 1 box ===========> ${el}`)
    // }
    d_seats = decoded_seats_box.toString().split(',')
    n_seats = d_seats.length / 32
    expect(n_seats).toBe(numberTickets)
    for (let i = 0; i < n_seats; i++) {
      const box_s = d_seats.slice(i * 32, 32 * (i + 1))
      const s = seats[i].toString().split(',')
      expect(box_s).toStrictEqual(s)
    }
    const assets_box_val = await client.appClient.getBoxValue(
      encodeBoxNameUint8ArrayFromUint64(ASSETS_BOX_PREFIX, typeIndex),
    )
    const assets_box_abi_codec = algosdk.ABIType.from('uint64[]')
    const decoded_assets_box = assets_box_abi_codec.decode(assets_box_val) as algosdk.ABIValue[] as number[]
    expect(decoded_assets_box.length).toBe(numberTickets)
    expect(asaIds.slice(prev_buy)).toStrictEqual(decoded_assets_box)

    // buy more tickets

    // new mbr
    const new_owner_b_mbr = computeOwnerBoxMbr(ticketsData.ticketUri.length, 2 * numberTickets) - owner_b_mbr
    const new_assets_mbr = computeAssetsArrayMbr(2 * numberTickets) - assets_mbr
    const new_seats_mbr = computeSeatsArrayMbr(2 * numberTickets) - seats_mbr
    const new_amount =
      numberTickets * ticketCost + new_owner_b_mbr + new_assets_mbr + new_seats_mbr + 100_000 * numberTickets

    // logs.testLogger.info(
    //   `====>>>> new computed mbr: ${new_amount} - owner ${new_owner_b_mbr} - assets ${new_assets_mbr} - seats ${new_seats_mbr}`,
    // )

    const new_seats: Uint8Array[] = []
    for (let index = 0; index < numberTickets; index++) {
      new_seats.push(decodeAddress(algokit.randomAccount().addr).publicKey)
    }

    const tt_codec = algosdk.ABIType.from('(string,byte[32],uint64,uint64,uint64,uint64)')
    const tt_box = await client.appClient.getBoxValue(
      encodeBoxNameUint8ArrayFromUint64(TICKET_TYPES_BOX_PREFIX, typeIndex),
    )
    const tt_val = tt_codec.decode(tt_box) as algosdk.ABIValue[]
    logs.testLogger.info(`tt_val ===> ${tt_val}`)
    // TODO check this formula
    // cost opt = 600 + 100 * [number of tickets]
    // in this case 10 tickets opts = 600 + 10* 100 = 1600 => 2 opt up
    ticketsSold = Number(tt_val[5].valueOf())
    estimation = 600 + (numberTickets + ticketsSold) * 500
    const new_opt_up = Math.floor(estimation / 700)
    logs.testLogger.info(`2nd opt up is ${new_opt_up}`)

    const new_payTxn = await makePaymentTxn(algod, testAccount.addr, app.appAddress, new_amount)
    // comp = client.compose().buyTicket(
    comp = client.compose().buyTicket(
      {
        owner: testAccount.addr,
        numberTickets: numberTickets,
        ticketTypeIndex: typeIndex,
        seats: new_seats,
        pay: new_payTxn,
      },
      { boxes: boxes_refs, sendParams: { fee: AlgoAmount.MicroAlgos(1_000 * (numberTickets + 1 + new_opt_up)) } },
    )

    sim = await comp.simulate()
    logs.testLogger.info(
      `2nd sim result [app bud added] ${JSON.stringify(sim.simulateResponse.txnGroups[0].appBudgetAdded)}`,
    )
    logs.testLogger.info(
      `2nd sim result [app budget consumed] ${JSON.stringify(sim.simulateResponse.txnGroups[0].appBudgetConsumed)}`,
    )
    logs.testLogger.info(
      `2nd sim result [fail message] ${JSON.stringify(sim.simulateResponse.txnGroups[0].failureMessage)}`,
    )

    // execute buy tickets
    txn = await comp.execute()

    // check owner box
    const new_owner_box_val = await client.appClient.getBoxValue(
      encodeBoxNameUint8ArrayFromAddress(OWNER_BOX_PREFIX, testAccount.addr),
    )
    const new_owner_box_abi_codec = algosdk.ABIType.from('(byte[32][],uint64[],uint64[])')
    const new_decoded_owner_box = new_owner_box_abi_codec.decode(new_owner_box_val) as algosdk.ABIValue[]

    expect(decoded_owner_box.length).toBe(3)
    // for (const el of new_decoded_owner_box) {
    //   logs.testLogger.info(`2 box ===========> ${el}`)
    // }

    d_seats = new_decoded_owner_box[0].toString().split(',')
    n_seats = d_seats.length / 32
    const complete_seats = [...seats, ...new_seats]
    expect(n_seats).toBe(2 * numberTickets+ prev_buy)
    for (let i = prev_buy; i < n_seats; i++) {
      const box_s = d_seats.slice(i * 32, 32 * (i + 1))
      const s = complete_seats[i-prev_buy].toString().split(',')
      // logs.testLogger.info(`2 box addr ===========> ${box_s}`)
      // logs.testLogger.info(`2 box ref addr ===========> ${s}`)
      expect(box_s).toStrictEqual(s)
    }
  }

  test('Test start event wrong times', async () => {
    const { algod, indexer, testAccount, waitForIndexer } = localnet.context
    const now = Date.now()
    const wrongDuration: number = 12 * 3600 // 12 hours in seconds
    const wrongAheadTime: number = 10 * 3600 // 10 hours in seconds
    waitForIndexer()
    await expect(startEvent(testAccount, now, duration, wrongAheadTime, algod, indexer)).rejects.toThrowError()
    await expect(startEvent(testAccount, now, wrongDuration, aheadTime, algod, indexer)).rejects.toThrowError()
  })

  test('Test start event correct values', async () => {
    const { algod, indexer, testAccount, waitForIndexer } = localnet.context
    const now = Date.now()
    const { beginTimestamp, endTimestamp, client, app } = await startEvent(
      testAccount,
      now,
      duration,
      aheadTime,
      algod,
      indexer,
    )
    await waitForIndexer()
    // check global state
    const g_state = await client.getGlobalState()
    const evt_status = g_state.eventStatus?.asNumber()
    const b_ts = g_state.eventBegin?.asNumber()
    const e_ts = g_state.eventEnd?.asNumber()
    const last_idx = g_state.lastTypeIndex?.asNumber()
    expect(evt_status).toBe(EVENT_MANAGER_STATE.STARTED)
    expect(last_idx).toBe(my_tt.length)
    expect(b_ts).toBe(beginTimestamp)
    expect(e_ts).toBe(endTimestamp)
    // check boxes
    const codec = algosdk.ABIType.from('(string,byte[32],uint64,uint64,uint64,uint64)')
    const boxes = await client.appClient.getBoxValuesFromABIType(codec)
    boxes.forEach((b) => {
      const name = decodeBoxName(b.name.nameBase64, 3)
      const exec = TICKET_TYPE_REGEXP.exec(name)
      if (exec !== null) {
        const captured = exec[1]
        const capturedIndex = parseInt(captured, 10)
        expect(captured !== null).toBeTruthy()
        const decodedTuple = b.value
        const values = decodedTuple.toString()
        expect(values).toStrictEqual(
          `${ticketsData.ticketUri[capturedIndex]},${ticketsData.ticketUriHash[
            capturedIndex
          ].toString()},${ticketsData.ticketPrice[capturedIndex].toString()},${ticketsData.ticketSupply[
            capturedIndex
          ].toString()},${ticketsData.ticketsMaxPerAddr[capturedIndex].toString()},${ticketsData.soldAmounts[
            capturedIndex
          ].toString()}`,
        )
      }
    })
  }, 30_000)

  test('Test cannot restart an event', async () => {
    const { algod, indexer, testAccount, waitForIndexer } = localnet.context
    const now = Date.now()
    await startEvent(testAccount, now, duration, aheadTime, algod, indexer)
    await waitForIndexer()
    await expect(startEvent(testAccount, now, duration, aheadTime, algod, indexer)).rejects.toThrowError()
  }, 30_000)

  test('Test buy tickets', async () => {
    const { algod, indexer, kmd, testAccount, waitForIndexer } = localnet.context
    // make test account rich
    const dispenserAccount = await algokit.getLocalNetDispenserAccount(algod, kmd)
    dispenseAlgos(testAccount, dispenserAccount, 1_000_000_000_000, algod)
    // start event
    const now = Date.now()
    const { client, app } = await startEvent(testAccount, now, duration, aheadTime, algod, indexer)

    // buy tickets
    let typeIndex = 1
    await new_buy_tickets(testAccount, algod, client, app, typeIndex, 0)
    typeIndex = 0
    await new_buy_tickets(testAccount, algod, client, app, typeIndex, 10)
   
   

    // sim
  }, 30_000)
})
