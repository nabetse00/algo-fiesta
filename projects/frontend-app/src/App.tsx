import "@mantine/core/styles.css";
import { useDisclosure } from "@mantine/hooks";
import { AppShell, Burger, Button, Group, Image, MantineColorsTuple, MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

import { SegmentedControl } from "@mantine/core";
import {
  IconShoppingCart,
  IconLicense,
  IconMessage2,
  IconBellRinging,
  IconMessages,
  IconFingerprint,
  IconDatabaseImport,
  IconReceipt2,
  // IconLogout,
  // IconSwitchHorizontal,
  IconPlugConnected,
  IconPlugConnectedX,
} from "@tabler/icons-react";
import AlgoFiestaLogo from "./assets/logo_h_no_bg.png";
import classes from "./App.module.css";
import { Outlet, useNavigate } from "react-router-dom";
import { WalletProvider, useInitializeProviders, PROVIDER_ID, ProvidersArray, useWallet } from "@txnlab/use-wallet";
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from "./utils/network";
import { WalletConnectModalSign } from "@walletconnect/modal-sign-html";
import algosdk from "algosdk";
import ConnectWallet from "./components/WalletConnect";
import { useState } from "react";

const getDynamicDeflyWalletConnect = async () => {
  const DeflyWalletConnect = (await import("@blockshake/defly-connect")).DeflyWalletConnect;
  return DeflyWalletConnect;
};

const getDynamicPeraWalletConnect = async () => {
  const PeraWalletConnect = (await import("@perawallet/connect")).PeraWalletConnect;
  return PeraWalletConnect;
};

const getDynamicDaffiWalletConnect = async () => {
  const DaffiWalletConnect = (await import("@daffiwallet/connect")).DaffiWalletConnect;
  return DaffiWalletConnect;
};

const getDynamicLuteConnect = async () => {
  const LuteConnect = (await import("lute-connect")).default;
  return LuteConnect;
};

let providers: ProvidersArray;
if (import.meta.env.VITE_ALGOD_NETWORK === "") {
  const kmdConfig = getKmdConfigFromViteEnvironment();
  providers = [
    {
      id: PROVIDER_ID.KMD,
      clientOptions: {
        wallet: kmdConfig.wallet,
        password: kmdConfig.password,
        host: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ];
} else {
  providers = [
    { id: PROVIDER_ID.DEFLY, getDynamicClient: getDynamicDeflyWalletConnect },
    { id: PROVIDER_ID.PERA, getDynamicClient: getDynamicPeraWalletConnect },
    { id: PROVIDER_ID.DAFFI, getDynamicClient: getDynamicDaffiWalletConnect },
    {
      id: PROVIDER_ID.LUTE,
      getDynamicClient: getDynamicLuteConnect,
      clientOptions: { siteName: "AlgoFiesta" },
    },
    {
      id: PROVIDER_ID.WALLETCONNECT,
      clientStatic: WalletConnectModalSign,
      clientOptions: {
        projectId: import.meta.env.VITE_WALLET_CONNECT_ID,
        metadata: {
          name: "AlgoFiesta",
          description: "AlgoFiesta dapp",
          url: "#",
          icons: ["https://walletconnect.com/walletconnect-logo.png"],
        },
      },
    },
  ];
}

const tabs = {
  tickets: [
    { link: "", label: "Buy Tickets", icon: IconBellRinging, uri: "/list_events" },
    { link: "", label: "List events", icon: IconFingerprint, uri: "/list_events" },
    { link: "", label: "List your tickets", icon: IconDatabaseImport, uri: "list_user_tickets/" },
    { link: "", label: "Dispenser", icon: IconReceipt2, uri: "/dispenser" },
  ],
  events: [
    { link: "", label: "Create Event", icon: IconShoppingCart, uri: "/create_event" },
    { link: "", label: "List your events", icon: IconLicense, uri: "/list_events" },
    { link: "", label: "Withdraw founds", icon: IconMessage2, uri: "" },
    { link: "", label: "Messages", icon: IconMessages, uri: "" },
  ],
};

const myColor: MantineColorsTuple = [
  "#fdfce5",
  "#f8f6d3",
  "#f0ecaa",
  "#e7e17c",
  "#e0d957",
  "#dbd33e",
  "#d9d02f",
  "#c0b820",
  "#aaa316",
  "#938c03",
];

const theme = createTheme({
  colors: {
    myColor,
  },
});

export default function App() {
  const [section, setSection] = useState<"events" | "tickets">("tickets");
  const [active, setActive] = useState("Buy Tickets");
  const { activeAddress } = useWallet();
  const [opened, { toggle }] = useDisclosure();
  const [isOpenedModal, { open: openModal, close: closeModal }] = useDisclosure(false);
  const navigate = useNavigate();

  const algodConfig = getAlgodConfigFromViteEnvironment();

  const walletProviders = useInitializeProviders({
    providers: providers,
    nodeConfig: {
      network: algodConfig.network,
      nodeServer: algodConfig.server,
      nodePort: String(algodConfig.port),
      nodeToken: String(algodConfig.token),
    },
    algosdkStatic: algosdk,
  });
  const links = tabs[section].map((item) => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={(event) => {
        event.preventDefault();
        setActive(item.label);
        navigate(item.uri);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </a>
  ));

  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <WalletProvider value={walletProviders}>
        <Notifications />
        <AppShell header={{ height: 120 }} navbar={{ width: 300, breakpoint: "sm", collapsed: { mobile: !opened } }} padding="md">
          <AppShell.Header>
            <Group h="100%" px="md">
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <Image h={120} src={AlgoFiestaLogo} width={300} onClick={() => navigate("/")} />
            </Group>
          </AppShell.Header>
          <AppShell.Navbar>
            <nav className={classes.navbar}>
              <div>
                <Button
                  rightSection={activeAddress ? <IconPlugConnectedX /> : <IconPlugConnected />}
                  variant="primary"
                  mt="md"
                  fullWidth
                  onClick={() => openModal()}
                >
                  {activeAddress ? activeAddress : "Connect your wallet"}
                </Button>
                <ConnectWallet opened={isOpenedModal} close={closeModal} />

                <SegmentedControl
                  mt="md"
                  value={section}
                  onChange={(value: any) => setSection(value)}
                  transitionTimingFunction="ease"
                  fullWidth
                  data={[
                    { label: "Tickets", value: "tickets" },
                    { label: "Events", value: "events" },
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
      </WalletProvider>
    </MantineProvider>
  );
}
