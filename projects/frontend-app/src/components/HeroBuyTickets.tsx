import { Image, Container, Title, Button, Group, Text, List, ThemeIcon, rem } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import classes from "./BuyTickets.module.css";
import { useNavigate } from "react-router-dom";

interface HeroProps {
  image: string;
}

export function HeroBuyTickets({ image }: HeroProps) {
  const navigate = useNavigate();
  return (
    <Container size="md">
      <div className={classes.inner}>
        <div className={classes.content}>
          <Title className={classes.title}>Start buying Tickets now !</Title>
          <Text c="dimmed" mt="md">
            Go to our list of events and buy some tickets now with USDC on algorand !
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
              <b>USDC</b> – Safe and stable asset on Algorand block chain
            </List.Item>
            <List.Item>
              <b>Low fees</b> – Algorand as very low fee and is fast to confirm blocks
            </List.Item>
          </List>

          <Group mt={30}>
            <Button radius="xl" size="md" className={classes.control}>
              Buy tickets
            </Button>
            <Button onClick={() => navigate("/dispenser")} variant="default" radius="xl" size="md" className={classes.control}>
              Dispenser [testnet Mock USDC]
            </Button>
          </Group>
        </div>
        <Image src={image} className={classes.image} />
      </div>
    </Container>
  );
}
