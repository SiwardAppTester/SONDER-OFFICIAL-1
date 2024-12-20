import React from 'react'

export default function Calendar() {
  return (
    <div>Calendar</div>
  )
}



// import React, { useState, useEffect, Suspense } from 'react';
// import { collection, addDoc, query, getDocs, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
// import { db, auth } from '../firebase';
// import { User } from 'firebase/auth';
// import { Menu, X } from "lucide-react";
// import Sidebar from "./Sidebar";
// import { Canvas } from '@react-three/fiber';
// import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
// import * as THREE from 'three';

// interface Event {
//   id: string;
//   title: string;
//   date: string;
//   startTime?: string;
//   endTime?: string;
//   description: string;
//   userId: string;
//   festivalId?: string;
//   genre?: string;
//   createdBy?: string;
//   isBusinessEvent?: boolean;
//   isPublic?: boolean;
//   artists?: string[];
//   city?: string;
//   country?: string;
// }

// interface UserProfile {
//   email: string;
//   displayName?: string;
//   photoURL?: string;
//   followers?: string[];
//   following?: string[];
//   accessibleFestivals?: string[];
// }

// const danceGenres = [
//   "House", "Techno", "Trance", "Drum & Bass", "Dubstep", "EDM", 
//   "Garage", "Breakbeat", "Hardstyle", "Ambient", "Other"
// ];

// const topDanceArtists = [
//   "David Guetta", "Calvin Harris", "Martin Garrix", "Tiësto", "Skrillex",
//   "Diplo", "Marshmello", "The Chainsmokers", "Kygo", "Zedd",
//   "Avicii", "Swedish House Mafia", "Daft Punk", "Deadmau5", "Disclosure",
//   "Flume", "Odesza", "Above & Beyond", "Illenium", "Carl Cox"
// ];

// const euCapitals = [
//   { city: "Amsterdam", country: "Netherlands" },
//   { city: "Berlin", country: "Germany" },
//   { city: "London", country: "United Kingdom" },
//   { city: "Paris", country: "France" },
//   { city: "Barcelona", country: "Spain" },
//   { city: "Rome", country: "Italy" },
//   { city: "Vienna", country: "Austria" },
//   { city: "Prague", country: "Czech Republic" },
//   { city: "Stockholm", country: "Sweden" },
//   { city: "Dublin", country: "Ireland" }
// ];

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

// const Calendar: React.FC = () => {
//   const [events, setEvents] = useState<Event[]>([]);
//   const [selectedDate, setSelectedDate] = useState<string>(
//     new Date().toISOString().split('T')[0]
//   );
//   const [currentUser, setCurrentUser] = useState<User | null>(null);
//   const [currentMonth, setCurrentMonth] = useState(new Date());
//   const [isNavOpen, setIsNavOpen] = useState(false);
//   const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
//   const [accessibleFestivals, setAccessibleFestivals] = useState<Set<string>>(new Set());
//   const [showEventModal, setShowEventModal] = useState(false);
//   const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
//   const [selectedArtists, setSelectedArtists] = useState<Set<string>>(new Set());
//   const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
//   const [isGenreFilterOpen, setIsGenreFilterOpen] = useState(false);
//   const [isArtistFilterOpen, setIsArtistFilterOpen] = useState(false);
//   const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
//   const [genreSearch, setGenreSearch] = useState('');
//   const [artistSearch, setArtistSearch] = useState('');
//   const [locationSearch, setLocationSearch] = useState('');

//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged(async (user) => {
//       setCurrentUser(user);
//       if (user) {
//         // Fetch user profile data
//         const userDoc = await getDoc(doc(db, "users", user.uid));
//         if (userDoc.exists()) {
//           const userData = userDoc.data() as UserProfile;
//           setUserProfile(userData);
//           setAccessibleFestivals(new Set(userData.accessibleFestivals || []));
//         }
//         fetchEvents();
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   const fetchEvents = async () => {
//     try {
//       const eventsRef = collection(db, 'events');
//       const eventsSnapshot = await getDocs(eventsRef);
//       const eventsList = eventsSnapshot.docs.map(doc => ({
//         id: doc.id,
//         ...doc.data()
//       } as Event));
//       setEvents(eventsList);
//     } catch (error) {
//       console.error('Error fetching events:', error);
//     }
//   };

//   const getDaysInMonth = (year: number, month: number) => {
//     return new Date(year, month + 1, 0).getDate();
//   };

//   const handlePreviousMonth = () => {
//     setCurrentMonth(prev => {
//       const newDate = new Date(prev.getFullYear(), prev.getMonth() - 1);
//       return newDate;
//     });
//   };

//   const handleNextMonth = () => {
//     setCurrentMonth(prev => {
//       const newDate = new Date(prev.getFullYear(), prev.getMonth() + 1);
//       return newDate;
//     });
//   };

//   const getMonthData = () => {
//     const year = currentMonth.getFullYear();
//     const month = currentMonth.getMonth();
//     const daysInMonth = getDaysInMonth(year, month);
//     const firstDayOfMonth = new Date(year, month, 1).getDay();
    
//     const days = [];
//     for (let i = 0; i < firstDayOfMonth; i++) {
//       days.push(null);
//     }
//     for (let i = 1; i <= daysInMonth; i++) {
//       days.push(i);
//     }
    
//     return days;
//   };

//   const formatDate = (year: number, month: number, day: number) => {
//     return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
//   };

//   const handleDayClick = (date: string) => {
//     setSelectedDate(date);
//     setShowEventModal(true);
//   };

//   const toggleGenre = (genre: string) => {
//     setSelectedGenres(prev => {
//       const newGenres = new Set(prev);
//       if (newGenres.has(genre)) {
//         newGenres.delete(genre);
//       } else {
//         newGenres.add(genre);
//       }
//       return newGenres;
//     });
//   };

//   const toggleArtist = (artist: string) => {
//     setSelectedArtists(prev => {
//       const newArtists = new Set(prev);
//       if (newArtists.has(artist)) {
//         newArtists.delete(artist);
//       } else {
//         newArtists.add(artist);
//       }
//       return newArtists;
//     });
//   };

//   const toggleLocation = (location: string) => {
//     setSelectedLocations(prev => {
//       const newLocations = new Set(prev);
//       if (newLocations.has(location)) {
//         newLocations.delete(location);
//       } else {
//         newLocations.add(location);
//       }
//       return newLocations;
//     });
//   };

//   const filterEvents = (events: Event[]) => {
//     return events.filter(event => {
//       const matchesGenre = selectedGenres.size === 0 || (event.genre && selectedGenres.has(event.genre));
//       const matchesArtist = selectedArtists.size === 0 || (event.artists && event.artists.some(artist => selectedArtists.has(artist)));
//       const matchesLocation = selectedLocations.size === 0 || (event.city && selectedLocations.has(event.city));
//       return matchesGenre && matchesArtist && matchesLocation;
//     });
//   };

//   const filteredGenres = danceGenres.filter(genre => 
//     genre.toLowerCase().includes(genreSearch.toLowerCase())
//   );

//   const filteredArtists = topDanceArtists.filter(artist => 
//     artist.toLowerCase().includes(artistSearch.toLowerCase())
//   );

//   const filteredLocations = euCapitals.filter(({ city, country }) => 
//     city.toLowerCase().includes(locationSearch.toLowerCase()) || 
//     country.toLowerCase().includes(locationSearch.toLowerCase())
//   );

//   return (
//     <div className="relative min-h-screen w-full overflow-hidden">
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
//       <div className="relative z-10 min-h-screen">
//         {/* Navigation */}
//         <div className="flex justify-center items-center pt-16 pb-1">
//           {/* Removing the SONDER logo div entirely */}
//         </div>

//         {/* Sidebar */}
//         <Sidebar
//           isNavOpen={isNavOpen}
//           setIsNavOpen={setIsNavOpen}
//           user={currentUser}
//           userProfile={userProfile}
//         />

//         {/* Main Calendar Content */}
//         <div className="max-w-[1200px] mx-auto px-4 mt-1 flex gap-6">
//           {/* Calendar Section */}
//           <div className="flex-1">
//             <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
//                          p-6 border border-white/20">
//               {/* Month Navigation */}
//               <div className="flex justify-between items-center mb-6">
//                 <button
//                   onClick={handlePreviousMonth}
//                   className="px-6 py-2 border-2 border-white/30 rounded-full
//                            text-white font-['Space_Grotesk'] tracking-wider
//                            transition-all duration-300 
//                            hover:border-white/60 hover:scale-105
//                            hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
//                 >
//                   Previous
//                 </button>
//                 <h2 className="text-2xl font-['Space_Grotesk'] tracking-wider text-white/90">
//                   {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
//                 </h2>
//                 <button
//                   onClick={handleNextMonth}
//                   className="px-6 py-2 border-2 border-white/30 rounded-full
//                            text-white font-['Space_Grotesk'] tracking-wider
//                            transition-all duration-300 
//                            hover:border-white/60 hover:scale-105
//                            hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
//                 >
//                   Next
//                 </button>
//               </div>

//               {/* Calendar Grid */}
//               <div className="grid grid-cols-7 gap-2">
//                 {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
//                   <div key={day} className="text-center font-['Space_Grotesk'] tracking-wider text-white/70 py-1">
//                     {day}
//                   </div>
//                 ))}
//                 {getMonthData().map((day, index) => {
//                   const date = day ? formatDate(
//                     currentMonth.getFullYear(),
//                     currentMonth.getMonth(),
//                     day
//                   ) : '';
//                   const dayEvents = filterEvents(events.filter(event => event.date === date));

//                   return (
//                     <div
//                       key={index}
//                       className={`min-h-[90px] border rounded-xl p-3 transition-all duration-300 
//                         ${day ? 'cursor-pointer hover:scale-[1.02]' : ''}
//                         ${selectedDate === date ? 'bg-white/20 border-white/40' : 'border-white/20'}
//                         ${!day ? 'bg-transparent border-transparent' : 'bg-white/10'}
//                         hover:bg-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]`}
//                       onClick={() => day && handleDayClick(date)}
//                     >
//                       {day && (
//                         <>
//                           <div className="font-['Space_Grotesk'] tracking-wider text-white/90">{day}</div>
//                           {dayEvents.length > 0 && (
//                             <div className="mt-1">
//                               <span className="inline-flex items-center justify-center 
//                                              bg-white/10 text-white/90 text-xs font-medium 
//                                              px-2 py-0.5 rounded-full">
//                                 {dayEvents.length}
//                               </span>
//                             </div>
//                           )}
//                         </>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           {/* Filters Section - moved to right side */}
//           <div className="w-72 space-y-3">
//             {/* Genre Filter */}
//             <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
//                       border border-white/20 overflow-hidden sticky top-4">
//               <div className="max-h-[calc(100vh-2rem)] overflow-y-auto">
//                 <div className="border-b border-white/10">
//                   <button
//                     onClick={() => setIsGenreFilterOpen(!isGenreFilterOpen)}
//                     className="w-full px-4 py-3 flex justify-between items-center 
//                             hover:bg-white/10 transition-colors"
//                   >
//                     <div className="flex items-center gap-2">
//                       <h3 className="text-white/90 font-['Space_Grotesk'] tracking-wider">Filter by Genre</h3>
//                       {selectedGenres.size > 0 && (
//                         <span className="bg-white/10 text-white/90 px-2 py-0.5 rounded-full text-sm">
//                           {selectedGenres.size}
//                         </span>
//                       )}
//                     </div>
//                     <svg 
//                       className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
//                         isGenreFilterOpen ? 'transform rotate-180' : ''
//                       }`}
//                       fill="none" 
//                       viewBox="0 0 24 24" 
//                       stroke="currentColor"
//                     >
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                     </svg>
//                   </button>
                  
//                   {isGenreFilterOpen && (
//                     <div className="p-4">
//                       <div className="flex items-center justify-between gap-2 mb-3">
//                         <div className="relative flex-1">
//                           <input
//                             type="text"
//                             value={genreSearch}
//                             onChange={(e) => setGenreSearch(e.target.value)}
//                             placeholder="Search genres..."
//                             className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 
//                                    text-white placeholder-white/50 font-['Space_Grotesk']
//                                    focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
//                           />
//                           {genreSearch && (
//                             <button
//                               onClick={() => setGenreSearch('')}
//                               className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
//                             >
//                               <X size={16} />
//                             </button>
//                           )}
//                         </div>
//                         {selectedGenres.size > 0 && (
//                           <button
//                             onClick={() => setSelectedGenres(new Set())}
//                             className="text-white/60 hover:text-white/90 text-sm font-['Space_Grotesk'] tracking-wider"
//                           >
//                             Clear
//                           </button>
//                         )}
//                       </div>
//                       <div className="flex flex-wrap gap-2">
//                         {filteredGenres.map(genre => (
//                           <button
//                             key={genre}
//                             onClick={() => toggleGenre(genre)}
//                             className={`px-3 py-1.5 rounded-full text-sm transition-all transform hover:scale-105
//                                        font-['Space_Grotesk'] tracking-wider ${
//                               selectedGenres.has(genre)
//                                 ? "bg-white/20 text-white border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
//                                 : "bg-white/5 text-white/80 border border-white/10 hover:bg-white/10"
//                             }`}
//                           >
//                             {genre}
//                           </button>
//                         ))}
//                         {filteredGenres.length === 0 && (
//                           <p className="text-white/50 text-sm font-['Space_Grotesk'] py-1">No matching genres found</p>
//                         )}
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 {/* Artist Filter */}
//                 <div className="border-b border-white/10">
//                   <button
//                     onClick={() => setIsArtistFilterOpen(!isArtistFilterOpen)}
//                     className="w-full px-4 py-3 flex justify-between items-center 
//                             hover:bg-white/10 transition-colors"
//                   >
//                     <div className="flex items-center gap-2">
//                       <h3 className="text-white/90 font-['Space_Grotesk'] tracking-wider">Filter by Artist</h3>
//                       {selectedArtists.size > 0 && (
//                         <span className="bg-white/10 text-white/90 px-2 py-0.5 rounded-full text-sm">
//                           {selectedArtists.size}
//                         </span>
//                       )}
//                     </div>
//                     <svg 
//                       className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
//                         isArtistFilterOpen ? 'transform rotate-180' : ''
//                       }`}
//                       fill="none" 
//                       viewBox="0 0 24 24" 
//                       stroke="currentColor"
//                     >
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                     </svg>
//                   </button>

//                   {isArtistFilterOpen && (
//                     <div className="p-4">
//                       <div className="flex items-center justify-between gap-2 mb-3">
//                         <div className="relative flex-1">
//                           <input
//                             type="text"
//                             value={artistSearch}
//                             onChange={(e) => setArtistSearch(e.target.value)}
//                             placeholder="Search artists..."
//                             className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 
//                                    text-white placeholder-white/50 font-['Space_Grotesk']
//                                    focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
//                           />
//                           {artistSearch && (
//                             <button
//                               onClick={() => setArtistSearch('')}
//                               className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
//                             >
//                               <X size={16} />
//                             </button>
//                           )}
//                         </div>
//                         {selectedArtists.size > 0 && (
//                           <button
//                             onClick={() => setSelectedArtists(new Set())}
//                             className="text-white/60 hover:text-white/90 text-sm font-['Space_Grotesk'] tracking-wider"
//                           >
//                             Clear
//                           </button>
//                         )}
//                       </div>
//                       <div className="flex flex-wrap gap-2">
//                         {filteredArtists.map(artist => (
//                           <button
//                             key={artist}
//                             onClick={() => toggleArtist(artist)}
//                             className={`px-3 py-1.5 rounded-full text-sm transition-all transform hover:scale-105
//                                        font-['Space_Grotesk'] tracking-wider ${
//                               selectedArtists.has(artist)
//                                 ? "bg-white/20 text-white border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
//                                 : "bg-white/5 text-white/80 border border-white/10 hover:bg-white/10"
//                             }`}
//                           >
//                             {artist}
//                           </button>
//                         ))}
//                         {filteredArtists.length === 0 && (
//                           <p className="text-white/50 text-sm font-['Space_Grotesk'] py-1">No matching artists found</p>
//                         )}
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 {/* Location Filter */}
//                 <div>
//                   <button
//                     onClick={() => setIsLocationFilterOpen(!isLocationFilterOpen)}
//                     className="w-full px-4 py-3 flex justify-between items-center 
//                             hover:bg-white/10 transition-colors"
//                   >
//                     <div className="flex items-center gap-2">
//                       <h3 className="text-white/90 font-['Space_Grotesk'] tracking-wider">Filter by Location</h3>
//                       {selectedLocations.size > 0 && (
//                         <span className="bg-white/10 text-white/90 px-2 py-0.5 rounded-full text-sm">
//                           {selectedLocations.size}
//                         </span>
//                       )}
//                     </div>
//                     <svg 
//                       className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
//                         isLocationFilterOpen ? 'transform rotate-180' : ''
//                       }`}
//                       fill="none" 
//                       viewBox="0 0 24 24" 
//                       stroke="currentColor"
//                     >
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                     </svg>
//                   </button>

//                   {isLocationFilterOpen && (
//                     <div className="p-4">
//                       <div className="flex items-center justify-between gap-2 mb-3">
//                         <div className="relative flex-1">
//                           <input
//                             type="text"
//                             value={locationSearch}
//                             onChange={(e) => setLocationSearch(e.target.value)}
//                             placeholder="Search locations..."
//                             className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 
//                                    text-white placeholder-white/50 font-['Space_Grotesk']
//                                    focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
//                           />
//                           {locationSearch && (
//                             <button
//                               onClick={() => setLocationSearch('')}
//                               className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
//                             >
//                               <X size={16} />
//                             </button>
//                           )}
//                         </div>
//                         {selectedLocations.size > 0 && (
//                           <button
//                             onClick={() => setSelectedLocations(new Set())}
//                             className="text-white/60 hover:text-white/90 text-sm font-['Space_Grotesk'] tracking-wider"
//                           >
//                             Clear
//                           </button>
//                         )}
//                       </div>
//                       <div className="flex flex-wrap gap-2">
//                         {filteredLocations.map(({ city }) => (
//                           <button
//                             key={city}
//                             onClick={() => toggleLocation(city)}
//                             className={`px-3 py-1.5 rounded-full text-sm transition-all transform hover:scale-105
//                                        font-['Space_Grotesk'] tracking-wider ${
//                               selectedLocations.has(city)
//                                 ? "bg-white/20 text-white border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
//                                 : "bg-white/5 text-white/80 border border-white/10 hover:bg-white/10"
//                             }`}
//                           >
//                             {city}
//                           </button>
//                         ))}
//                         {filteredLocations.length === 0 && (
//                           <p className="text-white/50 text-sm font-['Space_Grotesk'] py-1">No matching locations found</p>
//                         )}
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Event Modal */}
//         {showEventModal && (
//           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//             <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 w-full max-w-lg
//                            shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/20">
//               <div className="flex justify-between items-center mb-6">
//                 <h2 className="text-xl font-['Space_Grotesk'] tracking-wider text-white/90">
//                   Events for {new Date(selectedDate).toLocaleDateString('default', { 
//                     day: 'numeric',
//                     month: 'long',
//                     year: 'numeric'
//                   })}
//                   {selectedGenres.size > 0 && (
//                     <span className="text-sm font-normal text-white/60 block mt-1">
//                       Filtered by: {Array.from(selectedGenres).join(", ")}
//                     </span>
//                   )}
//                 </h2>
//                 <button
//                   onClick={() => setShowEventModal(false)}
//                   className="text-white/70 hover:text-white/90 transition-colors"
//                 >
//                   <X size={24} />
//                 </button>
//               </div>

//               <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
//                 {filterEvents(events.filter(event => event.date === selectedDate))
//                   .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
//                   .map(event => (
//                     <div
//                       key={event.id}
//                       className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 
//                                shadow-[0_0_30px_rgba(255,255,255,0.05)] border border-white/10
//                                hover:bg-white/10 hover:border-white/20 
//                                transform hover:scale-[1.02] transition-all duration-300"
//                     >
//                       <div className="flex justify-between items-start gap-3">
//                         <h3 className="text-xl font-['Space_Grotesk'] tracking-wide text-white/90">
//                           {event.title}
//                         </h3>
//                         {(event.startTime || event.endTime) && (
//                           <span className="bg-white/10 text-white/90 px-3 py-1 rounded-full 
//                                          text-sm font-['Space_Grotesk'] tracking-wider">
//                             {event.startTime && event.endTime 
//                               ? `${event.startTime} - ${event.endTime}`
//                               : event.startTime || event.endTime}
//                           </span>
//                         )}
//                       </div>

//                       <p className="text-white/70 text-base mt-2 mb-4 font-['Space_Grotesk']">
//                         {event.description}
//                       </p>

//                       {/* Event Details Section */}
//                       <div className="flex flex-wrap gap-2 mb-3">
//                         {/* Location */}
//                         {event.city && (
//                           <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full
//                                         border border-white/10">
//                             <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
//                                 d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
//                             </svg>
//                             <span className="text-sm text-white/80 font-['Space_Grotesk'] tracking-wide">
//                               {event.city}{event.country ? `, ${event.country}` : ''}
//                             </span>
//                           </div>
//                         )}

//                         {/* Artists */}
//                         {event.artists && event.artists.length > 0 && (
//                           <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full
//                                         border border-white/10">
//                             <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
//                                 d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                             </svg>
//                             <span className="text-sm text-white/80 font-['Space_Grotesk'] tracking-wide">
//                               {event.artists.join(', ')}
//                             </span>
//                           </div>
//                         )}

//                         {/* Genre */}
//                         {event.genre && (
//                           <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full
//                                         border border-white/10">
//                             <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
//                                 d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
//                             </svg>
//                             <span className="text-sm text-white/80 font-['Space_Grotesk'] tracking-wide">
//                               {event.genre}
//                             </span>
//                           </div>
//                         )}

//                         {/* Organizer */}
//                         {event.createdBy && (
//                           <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full
//                                         border border-white/10">
//                             <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
//                                 d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                             </svg>
//                             <span className="text-sm text-white/80 font-['Space_Grotesk'] tracking-wide">
//                               {event.createdBy}
//                             </span>
//                           </div>
//                         )}
//                       </div>

//                       {/* Event Type Tags */}
//                       <div className="flex flex-wrap gap-2">
//                         {event.festivalId && (
//                           <span className="bg-white/10 text-white/90 px-3 py-1.5 rounded-full 
//                                          text-sm font-['Space_Grotesk'] tracking-wider border border-white/20">
//                             Festival Event
//                           </span>
//                         )}
//                         {event.isBusinessEvent && (
//                           <span className="bg-white/10 text-white/90 px-3 py-1.5 rounded-full 
//                                          text-sm font-['Space_Grotesk'] tracking-wider border border-white/20">
//                             Business Event
//                           </span>
//                         )}
//                         {event.isPublic !== undefined && (
//                           <span className={`px-3 py-1.5 rounded-full text-sm font-['Space_Grotesk'] tracking-wider 
//                                           border border-white/20 ${
//                             event.isPublic 
//                               ? 'bg-white/10 text-white/90' 
//                               : 'bg-white/5 text-white/80'
//                           }`}>
//                             {event.isPublic ? 'Public' : 'Private'}
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                   ))}

//                 {filterEvents(events.filter(event => event.date === selectedDate)).length === 0 && (
//                   <div className="text-center py-8">
//                     <p className="text-white/70 text-lg font-['Space_Grotesk'] tracking-wide">
//                       No events scheduled for this day
//                       {selectedGenres.size > 0 && (
//                         <span className="block mt-2 text-sm text-white/50">
//                           Filtered by: {Array.from(selectedGenres).join(", ")}
//                         </span>
//                       )}
//                     </p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Calendar; 