import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { ChevronDownIcon } from '@heroicons/react/24/solid';

const musicGenres = [
  "House", "Techno", "Trance", "Drum & Bass", "Dubstep", "EDM", 
  "Garage", "Breakbeat", "Hardstyle", "Ambient", "Other"
];

const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [favoriteGenre, setFavoriteGenre] = useState("");
  const [error, setError] = useState("");
  const [isGenreOpen, setIsGenreOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName || !username || !dateOfBirth || !favoriteGenre) {
      setError("Please fill in all fields");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError("No user found");
      return;
    }

    try {
      // Add this validation before the username existence check
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        setError("Username must be 3-20 characters long and can only contain letters, numbers, and underscores");
        return;
      }

      // Check if username already exists
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", username.toLowerCase())
      );
      const querySnapshot = await getDocs(usernameQuery);
      
      if (!querySnapshot.empty) {
        setError("Username already taken. Please choose another one.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        fullName,
        username: username.toLowerCase(), // Store username in lowercase for consistent querying
        dateOfBirth,
        favoriteGenre,
        isProfileComplete: true
      });

      navigate("/");
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile. Please try again.");
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

        {/* Profile Form */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
            Complete Your Profile
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Favorite Music Genre
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsGenreOpen(!isGenreOpen)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white/50 backdrop-blur-sm 
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200
                           flex justify-between items-center text-left"
                >
                  <span className={favoriteGenre ? "text-gray-900" : "text-gray-500"}>
                    {favoriteGenre || "Select a genre"}
                  </span>
                  <ChevronDownIcon 
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                      isGenreOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>

                {isGenreOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white/95 backdrop-blur-sm border 
                                border-gray-200 rounded-lg shadow-lg max-h-40 overflow-auto">
                    {musicGenres.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => {
                          setFavoriteGenre(genre);
                          setIsGenreOpen(false);
                        }}
                        className="w-full px-4 py-1.5 text-left hover:bg-purple-50 transition-colors
                                 duration-150 ease-in-out focus:outline-none focus:bg-purple-50
                                 text-gray-700 hover:text-purple-700"
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full px-8 py-4 rounded-full bg-purple-600 text-white font-semibold text-xl 
                       transition-all duration-300 
                       shadow-[0_0_20px_rgba(168,85,247,0.5)] 
                       hover:shadow-[0_0_30px_rgba(168,85,247,0.8)]
                       relative overflow-hidden"
            >
              <span className="relative z-10">Complete Profile</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-500 transition-opacity duration-300"/>
            </button>
          </form>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-600 mt-8">
          <p className="text-xl hover:text-gray-900 transition-colors duration-300 cursor-default">
            Experience the moment. Cherish forever.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default CompleteProfile; 