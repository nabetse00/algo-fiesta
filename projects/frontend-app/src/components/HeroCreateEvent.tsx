import { Image, Container, Title, Button, Group, Text, List, ThemeIcon, rem } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import classes from './BuyTickets.module.css';
import { useNavigate } from 'react-router-dom';

interface HeroProps {
  image:string,

}

export function HeroCreateEvent({image}:HeroProps) {
  const navigate = useNavigate()
  return (
    <Container size="md">
      <div className={classes.inner}>
        <div className={classes.content}>
          <Title className={classes.title}>
            Create your own !
          </Title>
          <Text c="dimmed" mt="md">
            Create an event today and start selling tickets !
          </Text>

          <List
            mt={30}
            spacing="sm"
            size="sm"
            icon={
              <ThemeIcon size={20} radius="xl">
                <IconCheck style={{ width: rem(12), height: rem(12) }} stroke={1.5} />
              </ThemeIcon>
            }
          >
            <List.Item>
              <b>Global</b> – Sell world wide !
            </List.Item>
            <List.Item>
              <b>Payment in USDC</b> – Safe and stable asset on Algorand block chain
            </List.Item>
            <List.Item>
              <b>Low fees</b> – Algorand as very low fee and is fast to confirm blocks
            </List.Item>
            <List.Item>
              <b>Secure NFT</b> – Secure tickets as NFTs on chain. Easy to distribute, transparent for end users.
            </List.Item>
          </List>

          <Group mt={30}>
            <Button radius="xl" size="md" className={classes.control}>
              Create Event
            </Button>
            <Button  onClick={()=> navigate('/dispenser')} variant="default" radius="xl" size="md" className={classes.control}>
              Dispenser [testnet Mock USDC]
            </Button>
          </Group>
        </div>
        <Image src={image} className={classes.image} />
      </div>
    </Container>
  );
}