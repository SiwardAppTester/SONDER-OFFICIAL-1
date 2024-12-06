import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense } from 'react';

const musicGenres = [
  "House", "Techno", "Trance", "Drum & Bass", "Dubstep", "EDM", 
  "Garage", "Breakbeat", "Hardstyle", "Ambient", "Other"
];

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
      
      <mesh scale={[-15, -15, -15]}>
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

const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [favoriteGenre, setFavoriteGenre] = useState("");
  const [error, setError] = useState("");
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [gender, setGender] = useState("");
  const [isGenderOpen, setIsGenderOpen] = useState(false);

  const genderOptions = [
    "Male",
    "Female",
    "Non-binary",
    "Prefer not to say"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName || !username || !dateOfBirth || !favoriteGenre || !gender) {
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
        gender,
        isProfileComplete: true
      });

      navigate("/");
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile. Please try again.");
    }
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto relative">
      {/* Three.js Background */}
      <div className="fixed inset-0">
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
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Profile Form */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                         p-6 border border-white/20">
            <h2 className="text-2xl text-white/90 mb-6 text-center tracking-[0.2em]">
              Complete Your Profile
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Full Name Input */}
              <div>
                <label className="block text-sm text-white/60 mb-1 tracking-[0.15em]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white/5 border border-white/20
                           text-sm text-white placeholder-white/40 tracking-[0.15em]
                           focus:outline-none focus:ring-2 focus:ring-white/20
                           focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-sm text-white/60 mb-1 tracking-[0.15em]">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white/5 border border-white/20
                           text-sm text-white placeholder-white/40 tracking-[0.15em]
                           focus:outline-none focus:ring-2 focus:ring-white/20
                           focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Date of Birth Input */}
              <div>
                <label className="block text-sm text-white/60 mb-1 tracking-[0.15em]">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white/5 border border-white/20
                           text-sm text-white placeholder-white/40 tracking-[0.15em]
                           focus:outline-none focus:ring-2 focus:ring-white/20
                           focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Favorite Genre Dropdown */}
              <div>
                <label className="block text-sm text-white/60 mb-1 tracking-[0.15em]">
                  Favorite Music Genre
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsGenreOpen(!isGenreOpen)}
                    className="w-full p-2.5 rounded-lg bg-white/5 border border-white/20
                             text-sm text-white flex justify-between items-center tracking-[0.15em]
                             focus:outline-none focus:ring-2 focus:ring-white/20
                             hover:bg-white/10 transition-all duration-200"
                  >
                    <span className={favoriteGenre ? "text-white" : "text-white/40"}>
                      {favoriteGenre || "Select a genre"}
                    </span>
                    <ChevronDownIcon className={`w-4 h-4 text-white/60 transition-transform duration-200 
                                             ${isGenreOpen ? 'transform rotate-180' : ''}`}
                    />
                  </button>

                  {isGenreOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white/10 backdrop-blur-xl
                                  border border-white/20 rounded-lg shadow-lg max-h-40 overflow-auto">
                      {musicGenres.map((genre) => (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => {
                            setFavoriteGenre(genre);
                            setIsGenreOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-white/90 hover:bg-white/10
                                   text-sm transition-colors duration-200 tracking-[0.15em]"
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Gender Dropdown */}
              <div>
                <label className="block text-sm text-white/60 mb-1 tracking-[0.15em]">
                  Gender
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsGenderOpen(!isGenderOpen)}
                    className="w-full p-2.5 rounded-lg bg-white/5 border border-white/20
                             text-sm text-white flex justify-between items-center tracking-[0.15em]
                             focus:outline-none focus:ring-2 focus:ring-white/20
                             hover:bg-white/10 transition-all duration-200"
                  >
                    <span className={gender ? "text-white" : "text-white/40"}>
                      {gender || "Select gender"}
                    </span>
                    <ChevronDownIcon className={`w-4 h-4 text-white/60 transition-transform duration-200 
                                             ${isGenderOpen ? 'transform rotate-180' : ''}`}
                    />
                  </button>

                  {isGenderOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white/10 backdrop-blur-xl
                                  border border-white/20 rounded-lg shadow-lg">
                      {genderOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setGender(option);
                            setIsGenderOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-white/90 hover:bg-white/10
                                   text-sm transition-colors duration-200 tracking-[0.15em]"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-2.5 bg-white/5 border border-white/20 rounded-lg">
                  <p className="text-white/90 text-xs tracking-[0.1em]">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full mt-4 px-6 py-3 rounded-full bg-white/10 text-white
                         border border-white/20 hover:bg-white/20
                         transition-all duration-300 text-base tracking-[0.2em]
                         hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                Complete Profile
              </button>
            </form>
          </div>

          {/* Footer */}
          <footer className="text-center text-white/60 mt-6 text-sm tracking-[0.15em]">
            <p className="hover:text-white/90 transition-colors duration-300 cursor-default">
              Experience the moment. Cherish forever.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile; 