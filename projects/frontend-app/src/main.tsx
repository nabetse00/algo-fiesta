import React  from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import {
  // createBrowserRouter,
  createHashRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";
import MainPage from './pages/MainPage.tsx';
// import DispenserPage from './pages/DispenserPage.tsx';
// import CreateEventPage from './pages/CreateEventPage.tsx';
// import ListEventsPage from './pages/ListEventsPage.tsx';
// import EventPage from './pages/EventPage.tsx';
// import ListUserTicketsPage from './pages/ListUserTicketsPage.tsx';

const router = createHashRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route path="" element={<MainPage />} />
      <Route path="dispenser" lazy={() => import("./pages/DispenserPage")} />
      <Route path="create_event" lazy={()=>import("./pages/CreateEventPage")} />
      <Route path="list_events" lazy={()=>import("./pages/ListEventsPage")} />
      <Route path="events/:id" lazy={()=>import("./pages/EventPage")} />
      <Route path="list_user_tickets/" lazy={()=>import("./pages/ListUserTicketsPage")} />
    </Route>
  )
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
