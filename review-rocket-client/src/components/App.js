import React, { useState } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Axios from 'axios';

import Front from '../routes/Front';
import ErrorPage from '../routes/404';
import Register from '../routes/Register';
import Login from '../routes/Login';
import Account from '../routes/Account';
import Generate from '../routes/Generate';
import Verify from '../routes/Verify';
import Logout from '../routes/Logout';

const router = createBrowserRouter([
    {
        path: "/",
        element: <Front />,
        errorElement: <ErrorPage />,
    },
    {
        path: "/register",
        element: <Register />,
    },
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/account",
        element: <Account />,
    },
    {
        path: "/generate",
        element: <Generate />,
    },
    {
        path: "/verify",
        element: <Verify />,
    },
    {
        path: "/logout",
        element: <Logout />,
    },
]);

export const ContextData = React.createContext();

export default function App() {
    const [sessionParameters, setSessionParameters] = useState({
        isLogged: undefined,
        isVerified: undefined,
        tokens: undefined,
    })
    const sessionValues = { sessionParameters, setSessionParameters }

    Axios.defaults.withCredentials = true;

    return (
        <ContextData.Provider value={sessionValues}>
            <RouterProvider router={router} />
        </ContextData.Provider>
    );
}
