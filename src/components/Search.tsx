import React, { useState, useEffect } from "react";
import { collection, query, orderBy, startAt, endAt, getDocs, getDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { User as FirebaseUser } from "firebase/auth";

interface UserResult {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
}

const Search: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accessibleFestivals, setAccessibleFestivals] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile(userData as UserProfile);
          setAccessibleFestivals(new Set(userData.accessibleFestivals || []));
        }
      }
    });

    return () => unsubscribe();
  }, []);

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
        if (!userData.isBusinessAccount && 
            userData.email?.toLowerCase() !== "admin@sonder.com") {
          users.push({
            uid: doc.id,
            email: userData.email,
            displayName: userData.displayName || 'Anonymous User',
            photoURL: userData.photoURL,
          });
        }
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
    <div className="flex flex-col h-screen">
      <div className="p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="text-gray-700 hover:text-gray-900"
            aria-label="Toggle navigation menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      <Sidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={user}
        userProfile={userProfile}
        accessibleFestivalsCount={accessibleFestivals.size}
      />

      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto">
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
      </div>
    </div>
  );
};

export default Search; 