import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import Home from "./components/Home";
import AddPost from "./components/AddPost";
import SignIn from "./components/SignIn";
import { User as FirebaseUser } from "firebase/auth";
import WelcomeScreen from "./components/WelcomeScreen";
import Search from "./components/Search";
import AdminPage from "./components/AdminPage";
import Chat from "./components/Chat";
import Profile from "./components/Profile";
import Calendar from "./components/Calendar";
import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);

  const isAdmin = (user: FirebaseUser | null) => {
    return user?.email?.toLowerCase() === "admin@sonder.com";
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Check if business account before setting user state
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
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <div className="app flex flex-col min-h-screen">
        <main className="flex-grow">
          {user ? (
            <>
              <Routes>
                {isBusinessAccount ? (
                  // Business accounts can only access AddPost
                  <>
                    <Route path="/add-post" element={<AddPost />} />
                    <Route path="/" element={<Navigate to="/add-post" replace />} />
                    <Route path="*" element={<Navigate to="/add-post" replace />} />
                  </>
                ) : (
                  // Regular users can access all routes except admin
                  <>
                    <Route path="/" element={<Home />} />
                    <Route path="/add-post" element={<AddPost />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/chat/:userId" element={<Chat />} />
                    <Route path="/profile/:userId" element={<Profile />} />
                    <Route path="/calendar" element={<Calendar />} />
                    {isAdmin(user) && <Route path="/admin" element={<AdminPage />} />}
                  </>
                )}
              </Routes>
            </>
          ) : (
            <Routes>
              <Route path="/" element={<WelcomeScreen />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </Router>
  );
};

export default App;
