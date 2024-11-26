import React, { useState, useEffect } from "react";
import { collection, query, orderBy, startAt, endAt, getDocs, getDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link } from "react-router-dom";
import { Menu, CheckCircle, Search as SearchIcon } from "lucide-react";
import Sidebar from "./Sidebar";
import { User as FirebaseUser } from "firebase/auth";

interface UserResult {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isBusinessAccount?: boolean;
  username: string;
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
          const festivals = userData.accessibleFestivals || [];
          setAccessibleFestivals(new Set(festivals));
        }
      } else {
        setUserProfile(null);
        setAccessibleFestivals(new Set());
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim() || searchTerm.length < 2) {
        setResults([]);
        return;
      }

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
          if (userData.email?.toLowerCase() !== "admin@sonder.com") {
            users.push({
              uid: doc.id,
              email: userData.email,
              displayName: userData.displayName || 'Anonymous User',
              photoURL: userData.photoURL,
              isBusinessAccount: userData.isBusinessAccount || false,
              username: userData.username || userData.email.split('@')[0],
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

    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100 flex flex-col">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-20 -top-20 -left-20 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-20 -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="text-purple-600 hover:text-purple-700 transition-colors duration-300"
            aria-label="Toggle navigation menu"
          >
            <Menu size={28} />
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

      <div className="flex-1 p-4 relative z-10">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 transform hover:scale-105 transition-all duration-300">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Explore"
                className="w-full px-6 py-4 rounded-full bg-white text-gray-800 
                         shadow-[0_0_20px_rgba(168,85,247,0.15)]
                         hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]
                         transition-all duration-300
                         text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                minLength={2}
              />
              <SearchIcon className="absolute right-6 top-1/2 transform -translate-y-1/2 text-purple-600" size={24} />
            </div>
          </div>

          {error && (
            <div className="text-red-500 mb-4 text-center bg-white/80 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {results.length > 0 ? (
              results.map((user) => (
                <Link
                  to={`/profile/${user.uid}`}
                  key={user.uid}
                  className="block bg-white/90 backdrop-blur-sm p-6 rounded-2xl
                           shadow-[0_0_20px_rgba(168,85,247,0.1)]
                           hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]
                           transform hover:scale-105 transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-16 h-16 rounded-full ring-2 ring-purple-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 
                                    flex items-center justify-center text-white text-xl font-semibold">
                        {user.displayName[0]}
                      </div>
                    )}
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-xl text-gray-900">
                          {user.displayName}
                        </p>
                        {user.isBusinessAccount && (
                          <CheckCircle 
                            size={20} 
                            className="text-purple-600" 
                            fill="currentColor"
                            aria-label="Verified Business Account"
                          />
                        )}
                      </div>
                      <p className="text-purple-600 text-md">@{user.username}</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center text-gray-600 text-lg py-8 bg-white/80 rounded-2xl">
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                ) : (
                  searchTerm ? "No users found" : ""
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search; 