import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

const musicGenres = [
  "Pop", "Rock", "Hip Hop", "R&B", "Jazz", "Classical", "Electronic", 
  "Country", "Folk", "Metal", "Blues", "Reggae", "Other"
];

const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [favoriteGenre, setFavoriteGenre] = useState("");
  const [error, setError] = useState("");

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
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        fullName,
        username,
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
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">Complete Your Profile</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2 border rounded"
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
              className="w-full p-2 border rounded"
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
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Favorite Music Genre
            </label>
            <select
              value={favoriteGenre}
              onChange={(e) => setFavoriteGenre(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select a genre</option>
              {musicGenres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600"
          >
            Complete Profile
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile; 