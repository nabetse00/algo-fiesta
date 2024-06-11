import { Badge, Group, Title, Text, Card, SimpleGrid, Container, rem, useMantineTheme } from '@mantine/core'
import { IconUser, IconShield, IconWorld} from '@tabler/icons-react'
import classes from './FeaturesCards.module.css'

const data = [
  {
    title: 'Secure Transactions',
    description:
      'Leverage the robustness of blockchain to ensure every transaction is secure and immutable. Your tickets are safely stored on the blockchain, guaranteeing authenticity and ownership.',
    icon: IconShield,
  },
  {
    title: 'Transparent Pricing',
    description:
      'People say it can run at the same speed as lightning striking, Its icy body is so cold, it will not melt even if it is immersed in magmanjoy fair pricing with no hidden fees. The blockchain ensures full transparency in ticket distribution, pricing, and resale markets',
    icon: IconUser,
  },
  {
    title: 'Global Access',
    description: ' Access a wide array of events from around the world. Whether it’s a concert, sports event, theater show, or festival, AlgoFiesta brings the best of global entertainment to your fingertips.',
    icon: IconWorld,
  },
]

export function FeaturesCards() {
  const theme = useMantineTheme()
  const features = data.map((feature) => (
    <Card key={feature.title} shadow="md" radius="md" className={classes.card} padding="xl">
      <feature.icon style={{ width: rem(50), height: rem(50) }} stroke={2} color={theme.colors.green[6]} />
      <Text fz="lg" fw={500} className={classes.cardTitle} mt="md">
        {feature.title}
      </Text>
      <Text fz="sm" c="dimmed" mt="sm">
        {feature.description}
      </Text>
    </Card>
  ))

  return (
    <Container size="lg" py="xl">
      <Group justify="center">
        <Badge variant="filled" size="lg"  color={theme.colors.pink[6]}>
          Algo fiesta
        </Badge>
      </Group>

      <Title order={2} className={classes.title} ta="center" mt="sm">
        Discover, Create, Buy, and Enjoy with Confidence
      </Title>

      <Text c="dimmed" className={classes.description} ta="center" mt="md">
        Our dApp provides a seamless, secure, and transparent platform for purchasing and creating event tickets. Say
        goodbye to ticket fraud, exorbitant fees, and complicated buying processes.
      </Text>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mt={50}>
        {features}
      </SimpleGrid>
    </Container>
  )
}
