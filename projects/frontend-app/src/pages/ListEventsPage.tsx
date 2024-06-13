import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import ListEvents from "../components/ListEvents";

Component.displayName = "ListEventsPage";

export function Component() {
  return <ListEvents />;
}

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
ErrorBoundary.displayName = "ListEventsPageErrorBoundary";
