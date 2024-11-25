import React, { useState, useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");

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
          await setDoc(userRef, {
            email: result.user.email?.toLowerCase(),
            displayName: result.user.displayName || 'Anonymous User',
            photoURL: result.user.photoURL,
            createdAt: serverTimestamp(),
            followers: [],
            following: [],
          });
          navigate("/");
        } else {
          // Check if business account and redirect accordingly
          const userData = userSnap.data();
          if (userData.isBusinessAccount) {
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
          });
          navigate("/");
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
    <div className="sign-in p-4 flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4">Sign In</h2>
      
      {/* Email/Password Form */}
      <form onSubmit={handleEmailSignIn} className="w-full max-w-sm mb-4">
        <div className="mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-2 border rounded"
            required
            minLength={6}
          />
        </div>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded mb-2"
        >
          {isRegistering ? "Register" : "Sign In"}
        </button>
        <button
          type="button"
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full text-blue-500 text-sm"
        >
          {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center w-full max-w-sm mb-4">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="px-4 text-gray-500 text-sm">OR</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      {/* Existing Google Sign In Button */}
      <button
        onClick={handleGoogleSignIn}
        className="bg-white text-gray-700 font-semibold py-2 px-4 border border-gray-300 rounded shadow flex items-center"
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google logo"
          className="w-6 h-6 mr-2"
        />
        Sign in with Google
      </button>
    </div>
  );
};

export default SignIn;
