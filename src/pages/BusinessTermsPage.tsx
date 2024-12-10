import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BusinessTermsAndConditions from '../components/BusinessTermsAndConditions';
import BusinessSidebar from '../components/BusinessSidebar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ThreeBackground } from '../components/ThreeBackground';

const BusinessTermsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [accessibleFestivalsCount, setAccessibleFestivalsCount] = useState(0);

  // Fetch user profile data
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
          setAccessibleFestivalsCount(userDoc.data().accessibleFestivals?.length || 0);
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  return (
    <>
      <ThreeBackground />
      <div className="flex h-screen bg-transparent relative z-10">
        <BusinessSidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={user || null}
          userProfile={userProfile}
          accessibleFestivalsCount={accessibleFestivalsCount}
        />
        
        <div className="flex-1 overflow-auto">
          {/* Header */}
          <div className="sticky top-0 bg-black/50 backdrop-blur-sm z-10">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-white/80 hover:text-white 
                         transition-colors duration-300"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-4xl mx-auto px-6 py-8">
            <BusinessTermsAndConditions />
          </div>
        </div>
      </div>
    </>
  );
};

export default BusinessTermsPage; 