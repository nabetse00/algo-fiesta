import * as algokit from '@algorandfoundation/algokit-utils'
import { EventManagerCallFactory, EventManagerClient } from '../artifacts/event_manager/client'
import { ApplicationClient } from '@algorandfoundation/algokit-utils/types/app-client'
import { encodeUint64 } from 'algosdk'
import { encodeBoxNameUint8ArrayFromUint64, makePaymentTxn } from '../helpers/test_helpers'

const duration: number = 7 * 24 * 3600 // 7 days in seconds
const aheadTime: number = 1 * 24 * 3600 // 1 days in seconds
const TICKET_TYPES_BOX_PREFIX = 'tt-'

// Below is a showcase of various deployment options you can use in TypeScript Client
export async function deploy() {
  console.log('=== Deploying EventManager ===')

  const algod = algokit.getAlgoClient()
  const indexer = algokit.getAlgoIndexerClient()
  const deployer = await algokit.mnemonicAccountFromEnvironment({ name: 'DEPLOYER', fundWith: algokit.algos(3) }, algod)
  await algokit.ensureFunded(
    {
      accountToFund: deployer,
      minSpendingBalance: algokit.algos(2),
      minFundingIncrement: algokit.algos(2),
    },
    algod,
  )
  const appClient = new EventManagerClient(
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
}
