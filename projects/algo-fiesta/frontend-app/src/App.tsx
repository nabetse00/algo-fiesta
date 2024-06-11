import '@mantine/core/styles.css'
import { useDisclosure } from '@mantine/hooks'
import { AppShell, Burger, Button, Group, MantineColorsTuple, MantineProvider, createTheme } from '@mantine/core'

import { useEffect, useState } from 'react'

import { SegmentedControl } from '@mantine/core'
import {
  IconShoppingCart,
  IconLicense,
  IconMessage2,
  IconBellRinging,
  IconMessages,
  IconFingerprint,
  IconKey,
  IconDatabaseImport,
  IconReceipt2,
  // IconLogout,
  // IconSwitchHorizontal,
  IconPlugConnected,
  IconPlugConnectedX,
} from '@tabler/icons-react'
import AlgoFiestaLogo from './assets/logo_h_no_bg.png'
import classes from './App.module.css'
import { PeraWalletConnect } from '@perawallet/connect'
import { Outlet, useNavigate } from 'react-router-dom'

const tabs = {
  tickets: [
    { link: '', label: 'Buy Tickets', icon: IconBellRinging, uri: '' },
    { link: '', label: 'List events', icon: IconFingerprint, uri: '' },
    { link: '', label: 'List your tickets', icon: IconKey, uri: '' },
    { link: '', label: 'Withdraw ticket as NFT', icon: IconDatabaseImport, uri: '' },
    { link: '', label: 'Dispenser', icon: IconReceipt2, uri: '/dispenser' },
  ],
  events: [
    { link: '', label: 'Create Event', icon: IconShoppingCart, uri: '' },
    { link: '', label: 'List your events', icon: IconLicense, uri: '' },
    { link: '', label: 'Withdraw founds', icon: IconMessage2, uri: '' },
    { link: '', label: 'Messages', icon: IconMessages, uri: '' },
  ],
}

const myColor: MantineColorsTuple = [
  '#fdfce5',
  '#f8f6d3',
  '#f0ecaa',
  '#e7e17c',
  '#e0d957',
  '#dbd33e',
  '#d9d02f',
  '#c0b820',
  '#aaa316',
  '#938c03',
]

const theme = createTheme({
  colors: {
    myColor,
  },
})

function displayText(address: string, size: number): string {
  return address.slice(0, size) + '...' + address.slice(-size)
}
// wallet
const peraWallet = new PeraWalletConnect({ shouldShowSignTxnToast: true, chainId: 416002 })

export default function App() {
  const [section, setSection] = useState<'events' | 'tickets'>('tickets')
  const [active, setActive] = useState('Buy Tickets')
  const [accountAddress, setAccountAddress] = useState<string | null>(null)
  const isConnectedToPeraWallet = !!accountAddress
  const [opened, { toggle }] = useDisclosure()
  const navigate = useNavigate()

  function handleConnectWalletClick() {
    peraWallet
      .connect()
      .then((newAccounts) => {
        if (peraWallet.connector) {
          peraWallet.connector.on('disconnect', handleDisconnectWalletClick)
        }

        setAccountAddress(newAccounts[0])
      })
      .catch((error) => {
        if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
          console.log(error)
        }
      })
  }

  function handleDisconnectWalletClick() {
    peraWallet.disconnect()
    setAccountAddress(null)
  }

  useEffect(() => {
    // Reconnect to the session when the component is mounted
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        if (peraWallet.connector) {
          peraWallet.connector.on('disconnect', handleDisconnectWalletClick)
        }

        if (accounts.length) {
          setAccountAddress(accounts[0])
        }
      })
      .catch((e) => console.log(e))
  }, [])

  const links = tabs[section].map((item) => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={(event) => {
        event.preventDefault()
        setActive(item.label)
        navigate(item.uri)
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </a>
  ))

  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <AppShell
        header={{ height: 120 }}
        navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <img src={AlgoFiestaLogo} width={300} />
          </Group>
        </AppShell.Header>
        <AppShell.Navbar>
          <nav className={classes.navbar}>
            <div>
              <Button
                rightSection={isConnectedToPeraWallet ? <IconPlugConnectedX /> : <IconPlugConnected />}
                variant="primary"
                mt="md"
                fullWidth
                onClick={isConnectedToPeraWallet ? handleDisconnectWalletClick : handleConnectWalletClick}
              >
                {isConnectedToPeraWallet ? displayText(accountAddress, 7) : 'Connect to Pera Wallet'}
              </Button>

              <SegmentedControl
                mt="md"
                value={section}
                onChange={(value: any) => setSection(value)}
                transitionTimingFunction="ease"
                fullWidth
                data={[
                  { label: 'Tickets', value: 'tickets' },
                  { label: 'Events', value: 'events' },
                ]}
              />
            </div>

            <div className={classes.navbarMain}>{links}</div>
          </nav>
        </AppShell.Navbar>
        <AppShell.Main>
          <main>
            <Outlet />
          </main>
        </AppShell.Main>
      </AppShell>
      );
    </MantineProvider>
  )
}
