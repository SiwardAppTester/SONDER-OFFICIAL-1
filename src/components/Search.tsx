import React, { useState } from "react";
import { collection, query, orderBy, startAt, endAt, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";

interface UserResult {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

const Search: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const searchTermLower = searchTerm.toLowerCase();
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        orderBy("email"),
        startAt(searchTermLower),
        endAt(searchTermLower + '\uf8ff')
      );

      const querySnapshot = await getDocs(q);
      const users: UserResult[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          uid: doc.id,
          email: userData.email,
          displayName: userData.displayName || 'Anonymous User',
          photoURL: userData.photoURL,
        });
      });

      setResults(users);
    } catch (err) {
      console.error("Error searching users:", err);
      setError("Failed to search users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Search Users</h2>
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by email"
            className="flex-grow p-2 border rounded"
            minLength={2}
          />
          <button
            type="submit"
            disabled={loading || searchTerm.length < 2}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}

      <div className="results">
        {results.length > 0 ? (
          <div className="space-y-4">
            {results.map((user) => (
              <Link
                to={`/profile/${user.uid}`}
                key={user.uid}
                className="block bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {user.displayName[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-gray-600 text-sm">{user.email}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            {loading ? "Searching..." : searchTerm ? "No users found" : "Enter an email to search"}
          </p>
        )}
      </div>
    </div>
  );
};

export default Search; 