import * as algokit from '@algorandfoundation/algokit-utils'
import { UsdcaMockClient } from '../artifacts/usdca_mock/client'
import { makePaymentTxn } from '../helpers/test_helpers'

// Below is a showcase of various deployment options you can use in TypeScript Client
export async function deploy() {
  console.log('=== Deploying UsdcaMock ===')

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
  const appClient = new UsdcaMockClient(
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

  let assetId = 0
  // If app was just created fund the app account
  if (['create', 'replace'].includes(app.operationPerformed)) {
    await algokit.transferAlgos(
      {
        amount: algokit.algos(1),
        from: deployer,
        to: app.appAddress,
      },
      algod,
    )

  const payTxn = await makePaymentTxn(algod, deployer.addr, app.appAddress, 100_000)

  const method = 'dispenser create'
  const response_create = await appClient.dispenserCreate(
    { payMbr: payTxn },
    { sendParams: { fee: algokit.microAlgos(2_000) } },
  )
  assetId = response_create.return ? Number(response_create.return) : 0
  console.log(
    `Called ${method} on ${app.name} (${app.appId}), received asa ID: ${response_create.return}`,
  )

  } else {
    const state = await appClient.getGlobalState()
    assetId = state.assetId? state.assetId.asNumber(): 0
  } 
  // opt in
  const opt_in = await algokit.transferAsset(
    {
      amount: 0,
      assetId: assetId,
      from: deployer,
      to: deployer,
    },
    algod,
  )

  console.log(`Opin confirmation to asset id ${assetId} => ${opt_in.confirmation}`)

  const method = 'dispense'
  const response = await appClient.dispense({ amount: 10_000_000 }, { sendParams: { fee: algokit.microAlgos(2_000) }, assets:[assetId, ] })
  console.log(`Called ${method} on ${app.name} (${app.appId}) with name = world, received: ${response.return}`)
}
