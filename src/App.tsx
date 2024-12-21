import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { auth } from "./firebase";
import Home from "./components/Home";
import SignIn from "./components/SignIn";
import { User as FirebaseUser } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import NewWelcomeScreen from "./components/NewWelcomeScreen";
import {
  Loader,
  InnerSphere,
  ThreeBackground,
} from "./components/ThreeBackground";
import AboutUs from "./components/AboutUs";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import { applyActionCode } from "firebase/auth";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import ReadMore from "./pages/ReadMore";

const EmailVerified: React.FC = () => {
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<
    "verifying" | "success" | "error"
  >("verifying");

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the action code from the URL
        const actionCode = new URLSearchParams(window.location.search).get(
          "oobCode"
        );

        if (actionCode) {
          // Apply the action code
          await applyActionCode(auth, actionCode);
          setVerificationStatus("success");

          // Redirect to signin after a short delay
          setTimeout(() => {
            navigate("/signin", {
              state: {
                verificationSuccess: true,
                message: "Email verified successfully! Please sign in.",
              },
            });
          }, 3000);
        }
      } catch (error) {
        console.error("Error verifying email:", error);
        setVerificationStatus("error");
      }
    };

    verifyEmail();
  }, [navigate]);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Three.js Background */}
      <div className="absolute inset-0">
        <Canvas className="w-full h-full" gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={<Loader />}>
            <InnerSphere />
          </Suspense>
        </Canvas>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center items-center">
        <div className="w-full max-w-md mx-auto px-4 text-center">
          <div
            className="text-[50px] md:text-[100px] font-[500] mb-8 tracking-[0.12em]
                        text-white/95 font-['Outfit']
                        drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]"
          >
            SONDER
          </div>

          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20">
            {verificationStatus === "verifying" && (
              <p className="text-white/90 text-xl font-['Space_Grotesk']">
                Verifying your email...
              </p>
            )}
            {verificationStatus === "success" && (
              <>
                <h2 className="text-2xl font-['Space_Grotesk'] text-white/90 mb-4">
                  Email Verified Successfully!
                </h2>
                <p className="text-white/70 font-['Space_Grotesk']">
                  Redirecting you to sign in...
                </p>
              </>
            )}
            {verificationStatus === "error" && (
              <p className="text-red-400 font-['Space_Grotesk']">
                Error verifying email. Please try again or contact support.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const location = useLocation();

  const isAdmin = (user: FirebaseUser | null) => {
    return user?.email?.toLowerCase() === "admin@sonder.com";
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsBusinessAccount(!!userData?.isBusinessAccount);
        setUser(user);
      } else {
        setIsBusinessAccount(false);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-black">
        <ThreeBackground />
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      <ThreeBackground />
      <div className="app flex flex-col min-h-screen relative z-10">
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<NewWelcomeScreen />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/read-more" element={<ReadMore />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// Wrap the App with BrowserRouter
const AppWrapper: React.FC = () => {
  return (
    <Router>
      <UserProfileProvider>
        <App />
      </UserProfileProvider>
    </Router>
  );
};

export default AppWrapper;
