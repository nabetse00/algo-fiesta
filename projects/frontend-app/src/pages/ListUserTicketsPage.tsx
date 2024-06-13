import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import ListUserTickets from "../components/ListUserTickets";

export function Component() {
  return <ListUserTickets />;
}

Component.displayName = "ListUserTicketsPage";

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
ErrorBoundary.displayName = "SampleErrorBoundary";
