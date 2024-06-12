import { useParams } from "react-router-dom";
import EventCard from "../components/EventCard";

export default function EventDetailPage() {
let params = useParams();

    return (
        <EventCard appId={parseInt(params.id!)} />
    );

}