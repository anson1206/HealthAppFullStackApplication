import React, { useContext, useState, useEffect } from "react";

const AuthContext = React.createContext();

export function useAuth() {
    return useContext(AuthContext);
}

// Simple local auth provider: creates or loads a local guest user stored in localStorage.
export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userLoggedIn, setUserLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('appUser');
        if (stored) {
            const user = JSON.parse(stored);
            setCurrentUser(user);
            setUserLoggedIn(true);
        }
        setLoading(false);
    }, []);

    function signOut() {
        localStorage.removeItem('appUser');
        setCurrentUser(null);
        setUserLoggedIn(false);
    }

    function signIn(user) {
        // user is expected to be an object { id, email, name } returned from backend
        const appUser = { uid: user.id || user._id || `user_${Date.now()}`, email: user.email, name: user.name };
        localStorage.setItem('appUser', JSON.stringify(appUser));
        setCurrentUser(appUser);
        setUserLoggedIn(true);
    }

    const value = { currentUser, userLoggedIn, loading, signOut, signIn };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}