import React, { useState, useEffect, Suspense, useRef } from "react";
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
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
  const [isSigningIn, setIsSigningIn] = useState(false);
  const isTransitioning = location.state?.transitioning;
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);

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

  useEffect(() => {
    if (location.state?.verificationSuccess) {
      setSuccessMessage(location.state.message);
      // Clear the state
      window.history.replaceState({}, document.title);
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
          // Existing user - check account type
          const userData = userSnap.data();
          if (userData.isBusinessAccount) {
            navigate("/add-post");
          } else if (!userData.isProfileComplete) {
            navigate("/complete-profile");
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
    setSuccessMessage(null);
    
    try {
      if (isRegistering) {
        // Create new account without email verification
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (result.user) {
          // Create user document
          const userRef = doc(db, "users", result.user.uid);
          await setDoc(userRef, {
            email: result.user.email?.toLowerCase(),
            displayName: email.split('@')[0],
            createdAt: serverTimestamp(),
            followers: [],
            following: [],
            isProfileComplete: false
          });

          // Redirect to complete profile
          navigate("/complete-profile");
        }
      } else {
        // Sign in to existing account
        try {
          const result = await signInWithEmailAndPassword(auth, email, password);
          
          // Get user data to check account type
          const userRef = doc(db, "users", result.user.uid);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.data();
          
          // Redirect based on account type
          if (result.user.email?.toLowerCase() === "admin@sonder.com") {
            navigate("/admin");
          } else if (userData?.isBusinessAccount) {
            // Business accounts go directly to add-post
            navigate("/add-post");
          } else if (!userData?.isProfileComplete) {
            // Only regular users need to complete profile
            navigate("/complete-profile");
          } else {
            navigate("/", { state: { canUpdateProfile: true } });
          }
        } catch (signInError: any) {
          console.error("Error with email auth:", signInError);
          
          // Enhanced error handling
          switch (signInError.code) {
            case 'auth/too-many-requests':
              setError("Too many sign-in attempts. Please wait a few minutes before trying again, or reset your password.");
              setShowResetPassword(true);
              break;
            case 'auth/invalid-credential':
              setError("Invalid email or password. Please try again.");
              break;
            case 'auth/user-disabled':
              setError("This account has been disabled. Please contact support.");
              break;
            case 'auth/user-not-found':
              setError("No account found with this email. Please check your email or register.");
              break;
            case 'auth/invalid-email':
              setError("Please enter a valid email address.");
              break;
            case 'auth/missing-password':
              setError("Please enter your password.");
              break;
            default:
              setError("Unable to sign in at this time. Please try again later.");
          }
        }
      }
    } catch (error: any) {
      console.error("Outer error:", error);
      setError("An unexpected error occurred. Please try again later.");
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setSuccessMessage(null);
    
    if (!email) {
      setError("Please enter your email address to reset your password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage("Password reset email sent. Please check your inbox.");
      setShowResetPassword(false);
      // Clear the password field after requesting reset
      setPassword("");
    } catch (error: any) {
      console.error("Error sending reset email:", error);
      switch (error.code) {
        case 'auth/invalid-email':
          setError("Please enter a valid email address.");
          break;
        case 'auth/user-not-found':
          setError("No account found with this email address.");
          break;
        case 'auth/too-many-requests':
          setError("Too many requests. Please try again later.");
          break;
        default:
          setError("Failed to send reset email. Please try again later.");
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

          {/* Sign In Form */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                        p-8 w-full max-w-md mx-auto border border-white/20">
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
              {error && <p className="text-red-400 text-sm text-center font-['Space_Grotesk']">{error}</p>}
              {successMessage && (
                <p className="text-green-400 text-sm text-center font-['Space_Grotesk']">
                  {successMessage}
                </p>
              )}
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
              {!isRegistering && (
                <div className="w-full text-center">
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="text-white/60 text-sm hover:text-white/90 
                             transition-colors font-['Space_Grotesk'] tracking-wider"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
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

            {/* Social Sign-in Section - now always visible */}
            <>
              {/* Divider */}
              <div className="flex items-center mb-6">
                <div className="flex-grow border-t border-white/20"></div>
                <span className="px-4 text-white/50 text-sm font-['Space_Grotesk']">OR</span>
                <div className="flex-grow border-t border-white/20"></div>
              </div>

              {/* Google and Apple Sign In Buttons remain the same */}
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
          </div>

          <p className="text-center text-white/60 mt-8 font-['Space_Grotesk'] tracking-wider
                      hover:text-white/90 transition-colors duration-300">
            Experience the moment. Cherish forever.
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white/10 p-8 rounded-2xl border border-white/20 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl text-white/90 font-['Space_Grotesk']">
                Reset Password
              </h3>
              <button
                onClick={() => setShowResetPassword(false)}
                className="text-white/60 hover:text-white/90 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <p className="text-white/70 mb-6 font-['Space_Grotesk']">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                       text-white placeholder-white/50 font-['Space_Grotesk']
                       focus:outline-none focus:ring-2 focus:ring-white/30 mb-6"
            />
            
            <div className="flex gap-3">
              <button
                onClick={handleResetPassword}
                className="flex-1 px-6 py-3 bg-white/10 text-white rounded-lg
                         hover:bg-white/20 transition-all font-['Space_Grotesk']
                         border border-white/20"
              >
                Send Reset Link
              </button>
              <button
                onClick={() => setShowResetPassword(false)}
                className="px-6 py-3 bg-white/5 text-white/70 rounded-lg
                         hover:bg-white/10 transition-all font-['Space_Grotesk']
                         border border-white/20"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignIn;
