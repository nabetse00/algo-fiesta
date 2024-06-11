import React from 'react'
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
import DispenserPage from './pages/DispenserPage.tsx';

const router = createHashRouter(
  createRoutesFromElements(
    <Route path="/" element={<App />}>
      <Route path="" element={<MainPage />} />
      <Route path="dispenser" element={<DispenserPage />} />
    </Route>
  )
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
