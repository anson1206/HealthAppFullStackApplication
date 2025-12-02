import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/authContexts";
import { login } from "../api/authService";
//Login in page
function Login() {
    const {userLoggedIn, signIn} = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] =useState("");
    const [error, setError] = useState("");
    const [isSigningIn, setIsSigningIn] = useState(false);
    const navigate = useNavigate();

    useEffect(() =>{
        if(userLoggedIn){
            navigate("/dashboard");
        }
    }, [userLoggedIn, navigate]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!isSigningIn) {
            setIsSigningIn(true);
            setError("");
            try {
                // call backend login (lightweight)
                const res = await login({ email });
                if (res && res.user) {
                    signIn(res.user);
                }
            } catch (error) {
                console.error("Login Error:", error);
                setIsSigningIn(false);
                setError(error.message || "Failed to sign in. Please try again.");
            }
        }
    }


    //goes to register page
    const goToRegister = () => {
        navigate("/register");
        console.log("Navigating to Register page");
    };
return (
        <div className="min-h-screen bg-gradient-to-r from-purple-500 to-pink-500">
            <div className="flex items-center justify-center h-screen">
                <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
                    
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    <form onSubmit={onSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSigningIn}
                            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-200 disabled:opacity-50"
                        >
                            {isSigningIn ? "Signing In..." : "Login"}
                        </button>
                    </form>

                    <button
                            onClick={async (e) => {
                            e.preventDefault();
                            if (!isSigningIn) {
                                setIsSigningIn(true);
                                setError("");
                                try {
                                    // Create or login a lightweight user via backend
                                    const res = await login({ email: email || `guest_${Date.now()}@local`, name: 'Guest' });
                                    if (res && res.user) signIn(res.user);
                                } catch (error) {
                                    console.error("Login Error:", error);
                                    setIsSigningIn(false);
                                    setError(error.message || "Failed to sign in. Please try again.");
                                }
                            }
                        }}
                        disabled={isSigningIn}
                        className="mt-4 w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition duration-200 disabled:opacity-50"
                    >
                        {isSigningIn ? "Signing In..." : "Sign in as Guest"}
                    </button>

                    <p className="mt-4 text-center text-sm text-gray-600">
                        Don't have an account? 
                        <button
                            onClick={goToRegister}
                            className="text-blue-500 hover:underline ml-1"
                        >
                            Register
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;