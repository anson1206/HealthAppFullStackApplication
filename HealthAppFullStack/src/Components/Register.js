import React , {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/authContexts";
import { register } from "../api/authService";
//Handles registration

function Register() {
    const { userLoggedIn, signIn } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] =useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [errorMessage, setError] = useState("");
    const navigate = useNavigate();


    useEffect(() =>{
        if(userLoggedIn) {
            navigate("/dashboard");
        }
    }, [userLoggedIn, navigate]);



    const hanleRegister = async (e) => {
       e.preventDefault();
        if(password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if(password.length < 6){
            setError("Password must be at least 6 characters long");
            return;
        }
        if(!isRegistering){
            setIsRegistering(true);
            setError("");
            try {
                const res = await register({ email, name: email });
                if (res && res.user) signIn(res.user);
            } catch (error) {
                console.error("Registration Error:", error);
                setError("Failed to register. Please try again.");
            }
        }

    };
   return (
        <div className="min-h-screen bg-gradient-to-r from-purple-500 to-pink-500">
            <div className="flex items-center justify-center h-screen">
                <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold text-center mb-6">Register</h2>
                    
                    {errorMessage && (
                        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={hanleRegister}>
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
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isRegistering}
                            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-200 disabled:opacity-50"
                        >
                            {isRegistering ? "Creating Account..." : "Register"}
                        </button>
                    </form>

                    <p className="mt-4 text-center text-sm text-gray-600">
                        Already have an account?{" "}
                        <button
                            onClick={() => navigate("/login")}
                            className="text-blue-500 cursor-pointer hover:underline"
                        >
                            Login here
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;