import React, { createContext, useContext, useState, useEffect } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  accessibleFestivals?: string[];
  isBusinessAccount?: boolean;
}

interface UserProfileContextType {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  loading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(
  undefined
);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const unsubscribe = auth.onAuthStateChanged(async (user) => {
  //     if (user) {
  //       try {
  //         const userDoc = await getDoc(doc(db, "users", user.uid));
  //         if (userDoc.exists()) {
  //           setUserProfile(userDoc.data() as UserProfile);
  //         }
  //       } catch (error) {
  //         console.error("Error fetching user profile:", error);
  //       }
  //     } else {
  //       setUserProfile(null);
  //     }
  //     setLoading(false);
  //   });

  //   return () => unsubscribe();
  // }, []);

  // return (
  //   <UserProfileContext.Provider value={{ userProfile, setUserProfile, loading }}>
  //     {children}
  //   </UserProfileContext.Provider>
  // );
  return <>{children}</>;
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return context;
};
