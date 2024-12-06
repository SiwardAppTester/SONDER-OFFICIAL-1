import React, { useState, useEffect, Suspense, useRef } from "react";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

// Add the Loader component
function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="text-white text-xl">
        {progress.toFixed(0)}% loaded
      </div>
    </Html>
  )
}

// Add the InnerSphere component
function InnerSphere() {
  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={[0, 0, 0]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      <mesh scale={[-15, -15, -15]}> {/* Negative scale to see inside */}
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          side={THREE.BackSide}
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={1}
        />
      </mesh>
    </>
  )
}

interface SignInProps {
  initialFestivalCode?: string;
}

const SignIn: React.FC<SignInProps> = ({ initialFestivalCode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [festivalCode] = useState(initialFestivalCode || "");
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const isTransitioning = location.state?.transitioning;

  useEffect(() => {
    // Clear the transition state from history
    if (isTransitioning) {
      window.history.replaceState({}, document.title);
    }
  }, [isTransitioning]);

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

  // Add entrance animation
  useEffect(() => {
    if (location.state?.animateFrom === 'welcome' && contentRef.current) {
      gsap.set(contentRef.current, {
        opacity: 0,
        scale: 0.95
      });

      gsap.to(contentRef.current, {
        opacity: 1,
        scale: 1,
        duration: 1,
        delay: 0.3,
        ease: "power3.out",
      });
    }
  }, [location]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
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
    } finally {
      setIsSigningIn(false);
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
            isProfileComplete: false,
            isBusinessAccount: isBusinessAccount
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
    <div className={`relative h-screen w-full overflow-hidden ${isTransitioning ? 'fade-in' : ''}`}>
      {/* Three.js Background */}
      <div className="absolute inset-0">
        <Canvas
          className="w-full h-full"
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={<Loader />}>
            <InnerSphere />
          </Suspense>
        </Canvas>
      </div>

      {/* Content */}
      <div ref={contentRef} className="relative z-10 min-h-screen flex flex-col justify-center items-center">
        <div className="w-full max-w-md mx-auto px-4">
          {/* Logo */}
          <div className="text-[50px] md:text-[100px] font-[500] mb-2 tracking-[0.12em]
                        text-white/95 font-['Outfit']
                        drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]
                        transform -translate-y-4
                        transition-all duration-700 ease-out
                        hover:tracking-[0.2em] hover:drop-shadow-[0_0_40px_rgba(255,255,255,0.35)]
                        flex justify-center">
            SONDER
          </div>

          {/* Sign In Form - no translation needed */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                        p-8 w-full max-w-md mx-auto border border-white/20">
            {/* Account Type Toggle */}
            <div className="flex justify-center items-center mb-8 space-x-4">
              <span className={`text-sm font-['Space_Grotesk'] tracking-wider transition-colors duration-300 ${!isBusinessAccount ? 'text-white' : 'text-white/50'}`}>
                Personal
              </span>
              <button
                onClick={() => setIsBusinessAccount(!isBusinessAccount)}
                className="relative w-14 h-7 rounded-full bg-white/10 border border-white/20 transition-colors duration-300"
              >
                <div
                  className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-transform duration-300 ease-in-out
                            ${isBusinessAccount ? 'translate-x-7 bg-[#EA4335]/90' : 'translate-x-0 bg-white/90'}`}
                ></div>
              </button>
              <span className={`text-sm font-['Space_Grotesk'] tracking-wider transition-colors duration-300 ${isBusinessAccount ? 'text-white' : 'text-white/50'}`}>
                Business
              </span>
            </div>

            <h2 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] mb-6 text-center text-white/90 min-w-[300px]">
              {isRegistering ? "Create Account" : "Welcome Back"}
            </h2>
            
            <form onSubmit={handleEmailSignIn} className="space-y-4 mb-6">
              <div className="w-full">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                           text-white placeholder-white/50 font-['Space_Grotesk']
                           focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                  required
                />
              </div>
              <div className="w-full">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                           text-white placeholder-white/50 font-['Space_Grotesk']
                           focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-white/80 text-sm text-center font-['Space_Grotesk']">{error}</p>}
              <div className="w-full">
                <button
                  type="submit"
                  className="relative px-16 py-4 border-2 border-white/30 rounded-full
                          text-white text-lg font-['Space_Grotesk'] tracking-[0.2em]
                          transition-all duration-300 
                          hover:border-white/60 hover:scale-105
                          hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                          active:scale-95
                          w-full"
                >
                  {isRegistering ? "REGISTER" : "SIGN IN"}
                </button>
              </div>
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="w-full text-white/60 text-sm hover:text-white/90 
                           transition-colors font-['Space_Grotesk'] tracking-wider"
                >
                  {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
                </button>
              </div>
            </form>

            {/* Only show social sign-in options for personal accounts */}
            {!isBusinessAccount && (
              <>
                {/* Divider */}
                <div className="flex items-center mb-6">
                  <div className="flex-grow border-t border-white/20"></div>
                  <span className="px-4 text-white/50 text-sm font-['Space_Grotesk']">OR</span>
                  <div className="flex-grow border-t border-white/20"></div>
                </div>

                {/* Google Sign In Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="w-full bg-white/10 text-white font-['Space_Grotesk'] tracking-wider
                           py-3 px-4 border border-white/20 rounded-lg 
                           shadow-[0_0_20px_rgba(255,255,255,0.1)]
                           hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                           hover:bg-white/20
                           transition-all duration-300 
                           flex items-center justify-center gap-3 mb-3
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningIn ? (
                    <>
                      <div className="w-5 h-5 border-t-2 border-r-2 border-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google logo"
                        className="w-6 h-6"
                      />
                      <span>Sign in with Google</span>
                    </>
                  )}
                </button>

                {/* Apple Sign In Button */}
                <button
                  onClick={() => console.log('Apple sign in - to be implemented')}
                  className="w-full bg-black/40 text-white font-['Space_Grotesk'] tracking-wider
                           py-3 px-4 border border-white/20 rounded-lg
                           shadow-[0_0_20px_rgba(255,255,255,0.1)]
                           hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                           hover:bg-black/60
                           transition-all duration-300 
                           flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.2 0-.83.37-1.54.32-2.44-.06-3.16-1.34-4.95-6.42-2.91-10.41.75-1.45 1.9-2.23 3.33-2.26 1.19-.02 1.96.74 2.93.77 1.02-.23 2-.95 3.08-.84 1.21.13 2.19.63 2.84 1.6-2.41 1.52-1.87 4.67.57 5.77-.55 1.65-1.28 3.28-2.12 5.03zm-3.14-17.01c-.92.11-2.03.89-2.5 2.06 1.04.11 2.07-.73 2.5-2.06z"/>
                  </svg>
                  Sign in with Apple
                </button>
              </>
            )}
          </div>

          <p className="text-center text-white/60 mt-8 font-['Space_Grotesk'] tracking-wider
                      hover:text-white/90 transition-colors duration-300">
            Experience the moment. Cherish forever.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
