import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { auth } from "./firebase";
import Profile from "./components/Profile";
import Home from "./components/Home";
import AddPost from "./components/AddPost";
import SignIn from "./components/SignIn";
import { User as FirebaseUser } from "firebase/auth";
import WelcomeScreen from "./components/WelcomeScreen";
import BottomTabBar from "./components/BottomTabBar";
import Search from "./components/Search";

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
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
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/add-post" element={<AddPost />} />
              <Route path="/search" element={<Search />} />
              <Route path="/profile/:userId" element={<Profile />} />
            </Routes>
          ) : (
            <Routes>
              <Route path="/" element={<WelcomeScreen />} />
              <Route path="/signin" element={<SignIn />} />
            </Routes>
          )}
        </main>
        {user && <BottomTabBar />}
      </div>
    </Router>
  );
};

export default App;
