import React, { Suspense, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import Sidebar from './Sidebar';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

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

const TermsAndConditions: React.FC = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile data
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Three.js Background */}
      <div className="absolute inset-0">
        <Canvas
          className="w-full h-full"
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={<Loader />}>
            <InnerSphere />
          </Suspense>
        </Canvas>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex h-screen">
        <Sidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={user || null}
          userProfile={userProfile}
        />
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 pt-36">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center px-4 py-2 bg-white/5 hover:bg-white/10 
                       rounded-lg border border-white/10 text-white/80 hover:text-white 
                       transition-all duration-300 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>

            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="prose prose-invert max-w-none">
                <h1 className="text-3xl font-bold text-white mb-4">TERMS AND CONDITIONS FOR USERS OF THE SONDER PLATFORM</h1>
                
                <p className="text-white/80">Last updated: 10-12-2024</p>

                <p className="text-white/80">Welcome to Sonder! These Terms and Conditions ("Terms") govern your use of the Sonder platform, website, and services. By accessing or using the platform, you ("the User") agree to comply with and be bound by these Terms. If you do not agree, please do not use the platform.</p>

                <h2 className="text-xl font-semibold text-white mt-6">1. DEFINITIONS</h2>
                <ul className="text-white/80 list-disc pl-12">
                  <li>"Sonder": Refers to Sonder, its employees, and its software platform.</li>
                  <li>"User": Any individual who accesses the Sonder platform, whether to browse, purchase, or download content.</li>
                  <li>"Content": Professionally filmed videos, photos, or other media captured at festivals and made available through Sonder.</li>
                  <li>"Festival": The event or organizer responsible for hosting the event where Content is captured.</li>
                  <li>"Services": The functionality provided through the Sonder platform, including access to Content, account management, and related support.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-6">2. SERVICES PROVIDED</h2>
                <ul className="text-white/80 list-disc pl-12">
                  <li>Sonder allows Users to access, view, and download professional media content captured during festivals.</li>
                  <li>Users may be required to purchase specific content or subscriptions to access premium features.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-6">3. USER ELIGIBILITY</h2>
                <ul className="text-white/80 list-disc pl-12">
                  <li>By using the platform, you confirm that you are at least 18 years old or have parental/guardian consent to use the platform.</li>
                  <li>You must create a valid account to purchase or access Content. Users are responsible for maintaining the confidentiality of their account credentials.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-6">4. USER RESPONSIBILITIES</h2>
                <ul className="text-white/80 list-disc pl-12">
                  <li>Accurate Information: You agree to provide accurate and up-to-date information during account registration and usage.</li>
                  <li>Prohibited Activities: You agree not to:</li>
                  <ul className="list-disc pl-12">
                    <li>Share, distribute, or sell Content without prior authorization.</li>
                    <li>Misuse the platform for illegal or unauthorized purposes.</li>
                    <li>Interfere with the functionality of the platform or violate the rights of other users.</li>
                  </ul>
                  <li>Compliance: Users are responsible for ensuring compliance with all applicable laws while using the platform.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-6">5. PAYMENTS AND REFUNDS</h2>
                <ul className="text-white/80 list-disc pl-12">
                  <li>Purchases: Users may purchase access to exclusive Content, which is subject to the pricing displayed at the time of purchase.</li>
                  <li>Refunds: All purchases are final, and refunds will only be provided at Sonder's discretion (e.g., in cases of technical issues).</li>
                  <li>Sonder uses secure third-party payment processors. Sonder does not store your payment details.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-6">6. INTELLECTUAL PROPERTY</h2>
                <ul className="text-white/80 list-disc pl-12">
                  <li>All Content available on Sonder is owned by the Festival or Sonder and is protected by copyright and other intellectual property laws.</li>
                  <li>Users are granted a non-exclusive, non-transferable license to view and download purchased Content for personal use only.</li>
                  <li>Any unauthorized reproduction, distribution, or modification of Content is strictly prohibited.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-6">7. DATA PRIVACY</h2>
                <ul className="text-white/80 list-disc pl-12">
                  <li>By using Sonder, you consent to the collection and use of your personal data as outlined in our [Privacy Policy].</li>
                  <li>Sonder will take appropriate steps to secure your personal information but cannot guarantee absolute protection.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-6">8. LIMITATION OF LIABILITY</h2>
                <ul className="text-white/80 list-disc pl-12">
                  <li>Sonder provides its platform and services on an "as is" basis without warranties of any kind.</li>
                  <li>Sonder will not be liable for:</li>
                  <ul className="list-disc pl-12">
                    <li>Any errors, interruptions, or delays in service.</li>
                    <li>Losses or damages arising from the use or inability to use the platform or Content.</li>
                    <li>Unauthorized access to or alteration of your data.</li>
                  </ul>
                  <li>The maximum liability of Sonder is limited to the amount paid by the User for the specific Service or Content in question.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-6">9. TERMINATION</h2>
                <ul className="text-white/80 list-disc pl-12">
                  <li>Sonder reserves the right to suspend or terminate your account at any time, with or without notice, for violating these Terms.</li>
                  <li>Users may delete their accounts at any time through their profile settings.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-6">10. MODIFICATIONS TO THE TERMS</h2>
                <ul className="text-white/80 list-disc pl-12">
                  <li>Sonder reserves the right to update or modify these Terms at any time. Changes will be communicated to Users, and continued use of the platform signifies acceptance of the updated Terms.</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-6">11. GOVERNING LAW AND DISPUTES</h2>
                <ul className="text-white/80 list-disc pl-12">
                  <li>These Terms are governed by the laws of [Applicable Country/State Law].</li>
                  <li>Any disputes arising from the use of the platform will be resolved through negotiation. If unresolved, disputes will be submitted to binding arbitration in [jurisdiction].</li>
                </ul>

                <h2 className="text-xl font-semibold text-white mt-6">12. CONTACT INFORMATION</h2>
                <p className="text-white/80">For questions or concerns regarding these Terms, please contact us:</p>
                <p className="text-white/80">
                  Email: info@sonder-official.com<br />
                  Phone: +316 21 31 26 77<br />
                  Address: Ceintuurbaan 209/3, 1074CV Amsterdam, The Netherlands
                </p>

                <p className="text-white/80 mt-6">By accessing or using the Sonder platform, you acknowledge that you have read, understood, and agree to these Terms and Conditions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions; 