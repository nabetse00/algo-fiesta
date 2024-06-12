import CheersImg from '../assets/1.png'
import GlobalImg from '../assets/3.png'
import { HeroBuyTickets } from '../components/HeroBuyTickets'
import { HeroCreateEvent } from '../components/HeroCreateEvent'
import { FeaturesCards } from '../components/FeaturesCards'

export default function MainPage() {
  return (
    <>
      <HeroBuyTickets image={CheersImg} />
      <HeroCreateEvent image={GlobalImg} />
      <FeaturesCards />
    </>
  )
}
