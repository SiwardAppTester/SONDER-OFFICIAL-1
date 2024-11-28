import React, { useState, useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

interface SignInProps {
  initialFestivalCode?: string;
}

const SignIn: React.FC<SignInProps> = ({ initialFestivalCode }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [festivalCode] = useState(initialFestivalCode || "");

  useEffect(() => {
    // Create admin account if it doesn't exist
    const createAdminAccount = async () => {
      try {
        console.log("Attempting to create admin account...");
        
        // First, try to delete any existing admin account (optional, uncomment if needed)
        /*try {
          const adminUser = await signInWithEmailAndPassword(auth, "admin@sonder.com", "Admin123");
          if (adminUser) {
            await deleteUser(adminUser.user);
            console.log("Existing admin account deleted");
          }
        } catch (error) {
          console.log("No existing admin account found or couldn't delete");
        }*/

        // Create new admin account
        const result = await createUserWithEmailAndPassword(auth, "admin@sonder.com", "Admin123");
        
        if (result.user) {
          // Create admin user document
          await setDoc(doc(db, "users", result.user.uid), {
            email: "admin@sonder.com",
            displayName: "Admin",
            isAdmin: true,
            createdAt: serverTimestamp(),
            followers: [],
            following: [],
          });
          console.log("Admin account created successfully");
        }
      } catch (error: any) {
        // If account already exists, that's fine
        if (error.code === 'auth/email-already-in-use') {
          console.log("Admin account already exists");
        } else {
          console.error("Error creating admin account:", error);
        }
      }
    };

    createAdminAccount();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const userRef = doc(db, "users", result.user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // First time user - create basic profile
          await setDoc(userRef, {
            email: result.user.email?.toLowerCase(),
            displayName: result.user.displayName || 'Anonymous User',
            photoURL: result.user.photoURL,
            createdAt: serverTimestamp(),
            followers: [],
            following: [],
            isProfileComplete: false
          });
          navigate("/complete-profile");
        } else {
          // Existing user - check if profile is complete
          const userData = userSnap.data();
          if (!userData.isProfileComplete) {
            navigate("/complete-profile");
          } else if (userData.isBusinessAccount) {
            navigate("/add-post");
          } else {
            navigate("/");
          }
        }
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      if (isRegistering) {
        // Create new account
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (result.user) {
          const userRef = doc(db, "users", result.user.uid);
          await setDoc(userRef, {
            email: result.user.email?.toLowerCase(),
            displayName: email.split('@')[0],
            createdAt: serverTimestamp(),
            followers: [],
            following: [],
            isProfileComplete: false
          });
          navigate("/complete-profile");
        }
      } else {
        // Sign in to existing account
        const result = await signInWithEmailAndPassword(auth, email, password);
        
        // Check user type and redirect accordingly
        const userDoc = await getDoc(doc(db, "users", result.user.uid));
        const userData = userDoc.data();
        
        if (result.user.email?.toLowerCase() === "admin@sonder.com") {
          navigate("/admin");
        } else if (userData?.isBusinessAccount) {
          navigate("/add-post");
        } else {
          navigate("/");
        }
      }
    } catch (error: any) {
      console.error("Error with email auth:", error);
      if (error.code === 'auth/invalid-credential') {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(error instanceof Error ? error.message : "Authentication failed");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-20 -top-20 -left-20 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-20 -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-md mx-auto px-4 relative z-10">
        {/* Logo */}
        <div className="text-6xl font-bold mb-12 transform hover:scale-105 transition-transform duration-300 cursor-default flex justify-center">
          <span className="text-purple-600">S</span>
          <span style={{ color: '#DC2626' }}>o</span>
          <span className="text-purple-600">nder</span>
        </div>

        {/* Sign In Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-8 w-full max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 min-w-[300px]">
            {isRegistering ? "Create Account" : "Welcome Back"}
          </h2>
          
          <form onSubmit={handleEmailSignIn} className="space-y-4 mb-6">
            <div className="w-full">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full p-3 border border-gray-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                required
              />
            </div>
            <div className="w-full">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full p-3 border border-gray-200 rounded-lg bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <div className="w-full">
              <button
                type="submit"
                className="w-full px-8 py-3 rounded-lg bg-purple-600 text-white font-semibold text-lg
                         transition-all duration-300 
                         shadow-[0_0_20px_rgba(168,85,247,0.3)] 
                         hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]
                         hover:bg-purple-500"
              >
                {isRegistering ? "Register" : "Sign In"}
              </button>
            </div>
            <div className="w-full">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="w-full text-purple-600 text-sm hover:text-purple-500 transition-colors"
              >
                {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center mb-6">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-white text-gray-700 font-semibold py-3 px-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-3 mb-3"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
              className="w-6 h-6"
            />
            Sign in with Google
          </button>

          {/* Apple Sign In Button */}
          <button
            onClick={() => console.log('Apple sign in - to be implemented')}
            className="w-full bg-black text-white font-semibold py-3 px-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.2 0-.83.37-1.54.32-2.44-.06-3.16-1.34-4.95-6.42-2.91-10.41.75-1.45 1.9-2.23 3.33-2.26 1.19-.02 1.96.74 2.93.77 1.02-.23 2-.95 3.08-.84 1.21.13 2.19.63 2.84 1.6-2.41 1.52-1.87 4.67.57 5.77-.55 1.65-1.28 3.28-2.12 5.03zm-3.14-17.01c-.92.11-2.03.89-2.5 2.06 1.04.11 2.07-.73 2.5-2.06z"/>
            </svg>
            Sign in with Apple
          </button>

        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 mt-8 hover:text-gray-900 transition-colors duration-300">
          Experience the moment. Cherish forever.
        </p>
      </div>
    </div>
  );
};

export default SignIn;
