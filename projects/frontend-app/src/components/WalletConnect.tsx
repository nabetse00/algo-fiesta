import { Provider, useWallet } from "@txnlab/use-wallet";
import Account from "./Account";
import { Avatar, Button, Group, Modal } from "@mantine/core";

interface ConnectWalletInterface {
  opened: boolean;
  close: () => void;
}

const ConnectWallet = ({ opened, close }: ConnectWalletInterface) => {
  const { providers, activeAddress } = useWallet();

  const isKmd = (provider: Provider) => provider.metadata.name.toLowerCase() === "kmd";

  return (
    <Modal
      opened={opened}
      onClose={close}
      title="Wallet connection"
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      centered
    >
      <div>
        {activeAddress && (
          <>
            <Account />
            <div className="divider" />
          </>
        )}

        {!activeAddress && (
          <Group mb="md">
            {providers?.map((provider) => (
              <Button
              variant="outline"
                id={`${provider.metadata.id}-connect`}
                key={`provider-${provider.metadata.id}`}
                leftSection={
                  !isKmd(provider) && (
                    <Avatar
                      alt={`wallet_icon_${provider.metadata.id}`}
                      src={provider.metadata.icon}
                      size="1.5rem"
                    />
                  )
                }
                onClick={() => {
                  close()
                  return provider.connect();
                }}
              >
                {isKmd(provider) ? "LocalNet Wallet" : provider.metadata.name}
              </Button>
            ))}
          </Group>
        )}
      </div>

      <Group id="modal action">
        <Button onClick={() => close()}>Close </Button>
        {activeAddress && (
          <Button
            id="logout"
            onClick={() => {
              if (providers) {
                const activeProvider = providers.find((p) => p.isActive);
                if (activeProvider) {
                  activeProvider.disconnect();
                } else {
                  // Required for logout/cleanup of inactive providers
                  // For instance, when you login to localnet wallet and switch network
                  // to testnet/mainnet or vice verse.
                  localStorage.removeItem("txnlab-use-wallet");
                  window.location.reload();
                }
              }
            }}
          >
            Logout
          </Button>
        )}
      </Group>
    </Modal>
  );
};
export default ConnectWallet;
