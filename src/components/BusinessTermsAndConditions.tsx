import React from 'react'

export default function BusinessTermsAndConditions() {
  return (
    <div>BusinessTermsAndConditions</div>
  )
}


// import React, { Suspense, useState } from 'react';
// import { useAuthState } from 'react-firebase-hooks/auth';
// import { auth, db } from '../firebase';
// import BusinessSidebar from './BusinessSidebar';
// import { Canvas } from '@react-three/fiber';
// import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
// import * as THREE from 'three';
// import { doc, getDoc } from 'firebase/firestore';

// function Loader() {
//   const { progress } = useProgress()
//   return (
//     <Html center>
//       <div className="text-white text-xl">
//         {progress.toFixed(0)}% loaded
//       </div>
//     </Html>
//   )
// }

// function InnerSphere() {
//   return (
//     <>
//       <Environment preset="sunset" />
//       <PerspectiveCamera makeDefault position={[0, 0, 0]} />
//       <ambientLight intensity={0.2} />
//       <pointLight position={[10, 10, 10]} intensity={0.5} />
      
//       <mesh scale={[-15, -15, -15]}>
//         <sphereGeometry args={[1, 64, 64]} />
//         <meshStandardMaterial
//           side={THREE.BackSide}
//           color="#1a1a1a"
//           metalness={0.9}
//           roughness={0.1}
//           envMapIntensity={1}
//         />
//       </mesh>
//     </>
//   )
// }

// // Update the type for BusinessSidebar props to fix the type error
// interface BusinessSidebarProps {
//   isNavOpen: boolean;
//   setIsNavOpen: (isOpen: boolean) => void;
//   user: any; // or the specific User type from your firebase auth
//   accessibleFestivalsCount: number;
// }

// const BusinessTermsAndConditions: React.FC = () => {
//   const [user] = useAuthState(auth);
//   const [isNavOpen, setIsNavOpen] = useState(false);
//   const [userProfile, setUserProfile] = useState<any>(null);
//   const [accessibleFestivalsCount, setAccessibleFestivalsCount] = useState(0);

//   // Fetch user profile data
//   React.useEffect(() => {
//     const fetchUserProfile = async () => {
//       if (user) {
//         const userDoc = await getDoc(doc(db, 'users', user.uid));
//         if (userDoc.exists()) {
//           setUserProfile(userDoc.data());
//           setAccessibleFestivalsCount(userDoc.data().accessibleFestivals?.length || 0);
//         }
//       }
//     };
//     fetchUserProfile();
//   }, [user]);

//   return (
//     <div className="relative h-screen w-full overflow-hidden">
//       {/* Three.js Background */}
//       <div className="absolute inset-0">
//         <Canvas
//           className="w-full h-full"
//           gl={{ antialias: true, alpha: true }}
//         >
//           <Suspense fallback={<Loader />}>
//             <InnerSphere />
//           </Suspense>
//         </Canvas>
//       </div>

//       {/* Main Content */}
//       <div className="relative z-10 flex h-screen">
//         <BusinessSidebar
//           isNavOpen={isNavOpen}
//           setIsNavOpen={setIsNavOpen}
//           user={user as any}
//           accessibleFestivalsCount={accessibleFestivalsCount}
//         />
        
//         <div className="flex-1 overflow-auto">
//           <div className="max-w-4xl mx-auto p-6 pt-36">
//             <div className="bg-white/5 rounded-xl p-6 border border-white/10">
//               <div className="prose prose-invert max-w-none prose-sm">
//                 <h1 className="text-2xl font-bold text-white mb-4">TERMS AND CONDITIONS FOR FESTIVALS USING THE SONDER PLATFORM</h1>
                
//                 <p className="text-white/80 text-sm">Last updated: 10-12-2024</p>

//                 <p className="text-white/80 text-sm">Welcome to Sonder! These Terms and Conditions (the "Agreement") govern your use of Sonder's software platform and services as a festival organizer or business partner. By accessing or using the Sonder platform, you ("the Festival") agree to comply with and be bound by these terms. If you do not agree, please refrain from using our services.</p>

//                 <h2 className="text-lg font-semibold text-white mt-6">1. DEFINITIONS</h2>
//                 <ul className="text-white/80 text-sm list-disc pl-8">
//                   <li>"Sonder": Refers to Sonder, its employees, and its software platform.</li>
//                   <li>"Festival": The organization, company, or entity that enters into an agreement with Sonder to use the platform for creating and distributing content to festival-goers.</li>
//                   <li>"Content": Professionally filmed footage, videos, or other media captured during the festival and made available via Sonder's platform.</li>
//                   <li>"Users": Individual attendees of the festival who access or purchase content through the Sonder platform.</li>
//                   <li>"Services": The software, tools, and technical support provided by Sonder.</li>
//                 </ul>

//                 <h2 className="text-lg font-semibold text-white mt-6">2. SERVICES PROVIDED</h2>
//                 <ul className="text-white/80 text-sm list-disc pl-8">
//                   <li>Sonder provides a software platform that enables festivals to capture, manage, and distribute professional video content of their events.</li>
//                   <li>Sonder will work with the Festival to set up and integrate the platform prior to the event, including technical support for video capture, editing, and distribution.</li>
//                   <li>Content will be made available to Users for download or sharing through Sonder's platform.</li>
//                 </ul>

//                 <h2 className="text-lg font-semibold text-white mt-6">3. OBLIGATIONS OF THE FESTIVAL</h2>
//                 <p className="text-white/80 text-sm">The Festival agrees to:</p>
//                 <ul className="text-white/80 text-sm">
//                   <li>Provide Sonder with access to the festival premises for video capture and operational setup.</li>
//                   <li>Ensure all necessary permissions, including performer and attendee consent for filming, are obtained in compliance with applicable laws.</li>
//                   <li>Use the platform solely for its intended purpose and not for unlawful or unauthorized activities.</li>
//                   <li>Ensure accurate communication of content pricing, licensing, and delivery terms to Users where applicable.</li>
//                 </ul>

//                 <h2 className="text-lg font-semibold text-white mt-6">4. PAYMENT TERMS</h2>
//                 <ul className="text-white/80 text-sm list-disc pl-8">
//                   <li>The Festival agrees to pay Sonder according to the agreed pricing structure detailed in the partnership agreement.</li>
//                   <li>Payments are due within [X] days of receiving an invoice from Sonder.</li>
//                   <li>Sonder reserves the right to suspend services in case of late or non-payment.</li>
//                   <li>Additional charges may apply for services outside the standard scope of the agreement, such as custom integrations or extensive post-event editing.</li>
//                 </ul>

//                 <h2 className="text-lg font-semibold text-white mt-6">5. INTELLECTUAL PROPERTY</h2>
//                 <ul className="text-white/80 text-sm list-disc pl-8">
//                   <li>All intellectual property rights related to the platform, software, and services are and remain the exclusive property of Sonder.</li>
//                   <li>Content created during the festival remains the property of the Festival. Sonder retains the right to use anonymized data or promotional footage for marketing purposes unless otherwise agreed.</li>
//                   <li>The Festival grants Sonder a limited, non-exclusive license to use its logo and branding solely for the purposes of delivering the Services.</li>
//                 </ul>

//                 <h2 className="text-lg font-semibold text-white mt-6">6. DATA PRIVACY AND SECURITY</h2>
//                 <ul className="text-white/80 text-sm list-disc pl-8">
//                   <li>Sonder adheres to strict data privacy laws and will handle all personal data of Users and Festival staff in accordance with its Privacy Policy.</li>
//                   <li>The Festival is responsible for ensuring its own compliance with data privacy laws, including but not limited to obtaining attendee consent for data collection and content capture.</li>
//                 </ul>

//                 <h2 className="text-lg font-semibold text-white mt-6">7. LIABILITY AND INDEMNIFICATION</h2>
//                 <ul className="text-white/80 text-sm list-disc pl-8">
//                   <li>Sonder's Liability: Sonder will not be held liable for any indirect, incidental, or consequential damages arising from the use of the platform. The maximum liability will not exceed the fees paid by the Festival to Sonder for the Services.</li>
//                   <li>Indemnification: The Festival agrees to indemnify and hold Sonder harmless against any claims, damages, or losses arising from:</li>
//                   <ul className="list-disc pl-8">
//                     <li>Failure to obtain proper permissions for content capture or distribution.</li>
//                     <li>Breach of these terms or any applicable law.</li>
//                   </ul>
//                 </ul>

//                 <h2 className="text-lg font-semibold text-white mt-6">8. TERMINATION</h2>
//                 <ul className="text-white/80 text-sm list-disc pl-8">
//                   <li>This Agreement may be terminated:</li>
//                   <ul className="list-disc pl-8">
//                     <li>By either party with [X] days' written notice.</li>
//                     <li>By Sonder immediately if the Festival breaches any terms of this Agreement.</li>
//                     <li>By mutual agreement between Sonder and the Festival.</li>
//                   </ul>
//                   <li>Upon termination, the Festival will lose access to the Sonder platform, and all pending fees will become due immediately.</li>
//                 </ul>

//                 <h2 className="text-lg font-semibold text-white mt-6">9. FORCE MAJEURE</h2>
//                 <p className="text-white/80 text-sm">
//                   Sonder will not be held responsible for delays or failures in performance caused by events beyond its reasonable control, including but not limited to natural disasters, government actions, or technical failures outside of its platform.
//                 </p>

//                 <h2 className="text-lg font-semibold text-white mt-6">10. DISPUTE RESOLUTION</h2>
//                 <ul className="text-white/80 text-sm list-disc pl-8">
//                   <li>Any disputes arising from this Agreement will be resolved through negotiation between the parties.</li>
//                   <li>If unresolved, disputes will be submitted to binding arbitration in [jurisdiction].</li>
//                   <li>The governing law for this Agreement is [Applicable Country/State Law].</li>
//                 </ul>

//                 <h2 className="text-lg font-semibold text-white mt-6">11. MODIFICATIONS</h2>
//                 <ul className="text-white/80 text-sm list-disc pl-8">
//                   <li>Sonder reserves the right to modify these Terms and Conditions at any time. Any changes will be communicated to the Festival, and continued use of the platform signifies acceptance of the updated terms.</li>
//                 </ul>

//                 <h2 className="text-lg font-semibold text-white mt-6">12. CONTACT INFORMATION</h2>
//                 <p className="text-white/80 text-sm">For questions or concerns regarding this Agreement, please contact Sonder at:</p>
//                 <p className="text-white/80 text-sm">
//                   Email: info@sonder-official.com<br />
//                   Phone: +316 21 31 26 77<br />
//                   Address: Ceintuurbaan 209/3, 1074 CV Amsterdam, The Netherlands
//                 </p>

//                 <p className="text-white/80 text-sm mt-6">By using Sonder's platform, you acknowledge that you have read, understood, and agree to these Terms and Conditions.</p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BusinessTermsAndConditions; 