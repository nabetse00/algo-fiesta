import { Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

interface props {
    message:string
}

export default function WalletNotConnected({message}:props) {
  const icon = <IconInfoCircle />;
  return (
    <Alert variant="outline" color="yellow" radius="lg" title="Wallet not connected" icon={icon} style={{width:400}}>
      {`Please connect your wallet to access ${message}`}
    </Alert>
  );
}