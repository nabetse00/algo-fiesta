import { isRouteErrorResponse, useParams, useRouteError } from "react-router-dom";
import EventCard from "../components/EventCard";

export function Component() {
  let params = useParams();
  return <EventCard appId={parseInt(params.id!)} />;
}

Component.displayName = "EventCard";

export function ErrorBoundary() {
  let error = useRouteError();
  return isRouteErrorResponse(error) ? (
    <h1>
      {error.status} {error.statusText}
    </h1>
  ) : (
    <h1>{(error as any).message || error}</h1>
  );
}

// If you want to customize the component display name in React dev tools:
ErrorBoundary.displayName = "EventDetailPage";
