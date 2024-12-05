import React, { useState, useEffect, Suspense } from 'react';
import { collection, addDoc, query, getDocs, deleteDoc, doc, updateDoc, getDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User } from 'firebase/auth';
import { Menu, Plus, X } from "lucide-react";
import BusinessSidebar from "./BusinessSidebar";
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  genre: string;
  userId: string;
  createdBy: string;
  isBusinessEvent: boolean;
  isPublic: boolean;
  city: string;
  country: string;
  artists: string[];
}

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  isBusinessAccount?: boolean;
}

const danceGenres = [
  "House", "Techno", "Trance", "Drum & Bass", "Dubstep", "EDM", 
  "Garage", "Breakbeat", "Hardstyle", "Ambient", "Other"
];

const euCapitals = [
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Athens", country: "Greece" },
  { city: "Berlin", country: "Germany" },
  { city: "Bratislava", country: "Slovakia" },
  { city: "Brussels", country: "Belgium" },
  { city: "Bucharest", country: "Romania" },
  { city: "Budapest", country: "Hungary" },
  { city: "Copenhagen", country: "Denmark" },
  { city: "Dublin", country: "Ireland" },
  { city: "Helsinki", country: "Finland" },
  { city: "Lisbon", country: "Portugal" },
  { city: "Ljubljana", country: "Slovenia" },
  { city: "Luxembourg City", country: "Luxembourg" },
  { city: "Madrid", country: "Spain" },
  { city: "Paris", country: "France" },
  { city: "Prague", country: "Czech Republic" },
  { city: "Riga", country: "Latvia" },
  { city: "Rome", country: "Italy" },
  { city: "Stockholm", country: "Sweden" },
  { city: "Tallinn", country: "Estonia" },
  { city: "Valletta", country: "Malta" },
  { city: "Vienna", country: "Austria" },
  { city: "Vilnius", country: "Lithuania" },
  { city: "Warsaw", country: "Poland" },
  { city: "Zagreb", country: "Croatia" }
];

const topDanceArtists = [
  "David Guetta",
  "Calvin Harris",
  "Martin Garrix",
  "Tiësto",
  "Skrillex",
  "Diplo",
  "Marshmello",
  "The Chainsmokers",
  "Kygo",
  "Zedd",
  "Avicii",
  "Swedish House Mafia",
  "Daft Punk",
  "Deadmau5",
  "Disclosure",
  "Flume",
  "Odesza",
  "Above & Beyond",
  "Illenium",
  "Carl Cox"
];

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

const BusinessCalendar: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: selectedDate,
    startTime: '',
    endTime: '',
    genre: '',
    isPublic: true,
    city: '',
    country: '',
    artists: [] as string[]
  });
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [isArtistOpen, setIsArtistOpen] = useState(false);
  const [artistSearch, setArtistSearch] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchBusinessEvents();
    }
  }, [currentUser]);

  const fetchBusinessEvents = async () => {
    if (!currentUser) return;

    try {
      const eventsQuery = query(
        collection(db, 'events'),
        where('userId', '==', currentUser.uid),
        where('isBusinessEvent', '==', true)
      );
      
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventsList = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Event));
      
      setEvents(eventsList);
    } catch (error) {
      console.error('Error fetching business events:', error);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;

    if (!newEvent.title.trim() || !newEvent.description.trim() || 
        !newEvent.startTime || !newEvent.endTime || !newEvent.genre || 
        !newEvent.date || !newEvent.city || !newEvent.country) {
      alert('Please fill in all required fields');
      return;
    }

    if (newEvent.endTime <= newEvent.startTime) {
      alert('End time must be after start time');
      return;
    }

    try {
      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        genre: newEvent.genre,
        userId: currentUser.uid,
        createdBy: userProfile.displayName || userProfile.email,
        isBusinessEvent: true,
        isPublic: newEvent.isPublic,
        createdAt: new Date(),
        city: newEvent.city,
        country: newEvent.country,
        artists: newEvent.artists,
      };

      await addDoc(collection(db, 'events'), eventData);
      
      setNewEvent({
        title: '',
        description: '',
        date: selectedDate,
        startTime: '',
        endTime: '',
        genre: '',
        isPublic: true,
        city: '',
        country: '',
        artists: []
      });
      setShowAddEvent(false);
      await fetchBusinessEvents();
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setEventToDelete(eventId);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'events', eventToDelete));
      setEvents(prev => prev.filter(event => event.id !== eventToDelete));
      setEventToDelete(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const getMonthData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const filteredLocations = locationSearch
    ? euCapitals.filter(
        location => 
          location.city.toLowerCase().includes(locationSearch.toLowerCase()) ||
          location.country.toLowerCase().includes(locationSearch.toLowerCase())
      )
    : euCapitals;

  const filteredArtists = artistSearch
    ? topDanceArtists.filter(artist => 
        artist.toLowerCase().includes(artistSearch.toLowerCase()))
    : topDanceArtists;

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
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
      <div className="relative z-10 min-h-screen">
        <div className="p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="text-white/90 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        <BusinessSidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={currentUser}
          userProfile={userProfile}
          accessibleFestivalsCount={0}
        />

        <div className="max-w-[1200px] mx-auto px-4 mt-1 flex gap-6">
          {/* Calendar Section */}
          <div className="flex-1">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                         p-6 border border-white/20">
              {/* Month Navigation */}
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={handlePreviousMonth}
                  className="px-6 py-2 border-2 border-white/30 rounded-full
                           text-white font-['Space_Grotesk'] tracking-wider
                           transition-all duration-300 
                           hover:border-white/60 hover:scale-105
                           hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  Previous
                </button>
                <h2 className="text-2xl font-['Space_Grotesk'] tracking-wider text-white/90">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' }).toLowerCase()}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="px-6 py-2 border-2 border-white/30 rounded-full
                           text-white font-['Space_Grotesk'] tracking-wider
                           transition-all duration-300 
                           hover:border-white/60 hover:scale-105
                           hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  Next
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} className="text-center font-['Space_Grotesk'] tracking-wider text-white/70 py-1">
                    {day}
                  </div>
                ))}
                {getMonthData().map((day, index) => {
                  const date = day ? formatDate(
                    currentMonth.getFullYear(),
                    currentMonth.getMonth(),
                    day
                  ) : '';
                  const dayEvents = events.filter(event => event.date === date);

                  return (
                    <div
                      key={index}
                      className={`min-h-[90px] border rounded-xl p-3 transition-all duration-300 
                        ${day ? 'cursor-pointer hover:scale-[1.02]' : ''}
                        ${selectedDate === date ? 'bg-white/20 border-white/40' : 'border-white/20'}
                        ${!day ? 'bg-transparent border-transparent' : 'bg-white/10'}
                        hover:bg-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]`}
                      onClick={() => day && setSelectedDate(date)}
                    >
                      {day && (
                        <>
                          <div className="font-['Space_Grotesk'] tracking-wider text-white/90">{day}</div>
                          {dayEvents.length > 0 && (
                            <div className="mt-1">
                              <span className="inline-flex items-center justify-center 
                                             bg-white/10 text-white/90 text-xs font-medium 
                                             px-2 py-0.5 rounded-full">
                                {dayEvents.length}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Event Button */}
              <div className="mt-6">
                <button
                  onClick={() => setShowAddEvent(true)}
                  className="px-6 py-2 border-2 border-white/30 rounded-full
                           text-white font-['Space_Grotesk'] tracking-wider
                           transition-all duration-300 flex items-center gap-2
                           hover:border-white/60 hover:scale-105
                           hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  <Plus size={18} />
                  Add Event
                </button>
              </div>
            </div>
          </div>

          {/* Events Display Section */}
          <div className="w-72 space-y-3">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                          border border-white/20 overflow-hidden sticky top-4">
              <div className="p-4 border-b border-white/20">
                <h3 className="text-lg font-['Space_Grotesk'] tracking-wider text-white/90">
                  Events for {new Date(selectedDate).toLocaleDateString('default', { 
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </h3>
              </div>

              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-4 space-y-4">
                {events
                  .filter(event => event.date === selectedDate)
                  .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                  .map(event => (
                    <div
                      key={event.id}
                      className="backdrop-blur-xl bg-white/5 rounded-xl p-4 
                               border border-white/10 hover:border-white/20 
                               transition-all duration-300 hover:scale-[1.02]
                               hover:bg-white/10"
                    >
                      {/* Event Time */}
                      {(event.startTime || event.endTime) && (
                        <div className="mb-2">
                          <span className="text-white/80 text-sm font-['Space_Grotesk'] tracking-wider">
                            {event.startTime} - {event.endTime}
                          </span>
                        </div>
                      )}

                      {/* Event Title */}
                      <h4 className="text-white/90 text-lg font-['Space_Grotesk'] tracking-wider mb-2">
                        {event.title}
                      </h4>

                      {/* Event Description */}
                      <p className="text-white/70 text-sm mb-3 font-['Space_Grotesk']">
                        {event.description}
                      </p>

                      {/* Event Details */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {/* Location */}
                        {event.city && (
                          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full
                                        border border-white/10">
                            <span className="text-xs text-white/80 font-['Space_Grotesk'] tracking-wide">
                              📍 {event.city}, {event.country}
                            </span>
                          </div>
                        )}

                        {/* Genre */}
                        {event.genre && (
                          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full
                                        border border-white/10">
                            <span className="text-xs text-white/80 font-['Space_Grotesk'] tracking-wide">
                              🎵 {event.genre}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Artists */}
                      {event.artists && event.artists.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {event.artists.map(artist => (
                            <span
                              key={artist}
                              className="bg-white/5 text-white/80 px-2.5 py-1 rounded-full text-xs
                                       border border-white/10 font-['Space_Grotesk'] tracking-wide"
                            >
                              👤 {artist}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Event Type & Actions */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-['Space_Grotesk'] tracking-wide
                                      ${event.isPublic 
                                        ? 'bg-white/10 text-white/90' 
                                        : 'bg-white/5 text-white/70'}`}>
                          {event.isPublic ? 'Public' : 'Private'}
                        </span>
                        
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-white/60 hover:text-white/90 transition-colors text-sm
                                    font-['Space_Grotesk'] tracking-wider"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                {events.filter(event => event.date === selectedDate).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-white/60 text-sm font-['Space_Grotesk'] tracking-wider">
                      No events scheduled for this day
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Event Modal */}
        {showAddEvent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl w-full max-w-lg
                           shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/20
                           max-h-[70vh] flex flex-col">
              <div className="p-4 border-b border-white/20">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-['Space_Grotesk'] tracking-wider text-white/90">Add New Event</h2>
                  <button
                    onClick={() => setShowAddEvent(false)}
                    className="text-white/60 hover:text-white/90 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto">
                <form id="addEventForm" onSubmit={handleAddEvent} className="space-y-3">
                  {/* Title Input */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-['Space_Grotesk'] tracking-wider text-white/90">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                                text-white placeholder-white/50 font-['Space_Grotesk']
                                focus:outline-none focus:ring-2 focus:ring-white/30"
                      placeholder="Enter event title"
                      required
                    />
                  </div>

                  {/* Date and Time Section */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-['Space_Grotesk'] tracking-wider text-white/90">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                                  text-white font-['Space_Grotesk']
                                  focus:outline-none focus:ring-2 focus:ring-white/30"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-['Space_Grotesk'] tracking-wider text-white/90">
                        Time *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={newEvent.startTime}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                          className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded-lg 
                                    text-white font-['Space_Grotesk']
                                    focus:outline-none focus:ring-2 focus:ring-white/30"
                          required
                        />
                        <span className="text-white/60 flex items-center">-</span>
                        <input
                          type="time"
                          value={newEvent.endTime}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                          className="w-full px-2 py-2 bg-white/10 border border-white/20 rounded-lg 
                                    text-white font-['Space_Grotesk']
                                    focus:outline-none focus:ring-2 focus:ring-white/30"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Genre Selector */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-['Space_Grotesk'] tracking-wider text-white/90">
                      Genre *
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsGenreOpen(!isGenreOpen)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg
                                 text-white font-['Space_Grotesk'] flex justify-between items-center
                                 focus:outline-none focus:ring-2 focus:ring-white/30"
                      >
                        <span className={newEvent.genre ? "text-white" : "text-white/50"}>
                          {newEvent.genre || "Select a genre"}
                        </span>
                        <svg 
                          className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
                            isGenreOpen ? 'transform rotate-180' : ''
                          }`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      {isGenreOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white/10 border border-white/20 
                                      rounded-lg shadow-lg max-h-48 overflow-auto backdrop-blur-xl">
                          {danceGenres.map((genre) => (
                            <button
                              key={genre}
                              type="button"
                              onClick={() => {
                                setNewEvent(prev => ({ ...prev, genre }));
                                setIsGenreOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-white/20 
                                       transition-colors text-white/90 font-['Space_Grotesk']"
                            >
                              {genre}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location Selector */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-['Space_Grotesk'] tracking-wider text-white/90">
                      Location *
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsLocationOpen(!isLocationOpen)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg
                                 text-white font-['Space_Grotesk'] flex justify-between items-center
                                 focus:outline-none focus:ring-2 focus:ring-white/30"
                      >
                        <span className={newEvent.city ? "text-white" : "text-white/50"}>
                          {newEvent.city ? `${newEvent.city}, ${newEvent.country}` : "Select a location"}
                        </span>
                        <svg 
                          className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
                            isLocationOpen ? 'transform rotate-180' : ''
                          }`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      {isLocationOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white/10 border border-white/20 
                                      rounded-lg shadow-lg max-h-48 overflow-auto backdrop-blur-xl">
                          <div className="sticky top-0 p-2 bg-white/10 backdrop-blur-xl border-b border-white/20">
                            <input
                              type="text"
                              placeholder="Search locations..."
                              value={locationSearch}
                              onChange={(e) => setLocationSearch(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg
                                       text-white placeholder-white/50 font-['Space_Grotesk']
                                       focus:outline-none focus:ring-2 focus:ring-white/30"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          {filteredLocations.map((location) => (
                            <button
                              key={`${location.city}-${location.country}`}
                              type="button"
                              onClick={() => {
                                setNewEvent(prev => ({ 
                                  ...prev, 
                                  city: location.city,
                                  country: location.country 
                                }));
                                setIsLocationOpen(false);
                                setLocationSearch('');
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-white/20 
                                       transition-colors text-white/90 font-['Space_Grotesk']"
                            >
                              {location.city}, {location.country}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Artists Selector */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-['Space_Grotesk'] tracking-wider text-white/90">
                      Artists
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsArtistOpen(!isArtistOpen)}
                        className="w-full min-h-[40px] px-3 py-2 bg-white/10 border border-white/20 rounded-lg
                                 text-white font-['Space_Grotesk'] flex justify-between items-center
                                 focus:outline-none focus:ring-2 focus:ring-white/30"
                      >
                        <div className="flex flex-wrap gap-1.5 pr-6">
                          {newEvent.artists.length > 0 ? (
                            newEvent.artists.map((artist) => (
                              <span
                                key={artist}
                                className="inline-flex items-center px-2 py-0.5 bg-white/20 
                                         text-white rounded-full text-xs font-medium"
                              >
                                {artist}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNewEvent(prev => ({
                                      ...prev,
                                      artists: prev.artists.filter(a => a !== artist)
                                    }));
                                  }}
                                  className="ml-1 hover:text-white/60"
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-white/50">Select artists</span>
                          )}
                        </div>
                        <svg 
                          className={`w-4 h-4 text-white/60 transition-transform duration-200 absolute right-3 ${
                            isArtistOpen ? 'transform rotate-180' : ''
                          }`}
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      {isArtistOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white/10 border border-white/20 
                                      rounded-lg shadow-lg max-h-48 overflow-auto backdrop-blur-xl">
                          <div className="sticky top-0 p-2 bg-white/10 backdrop-blur-xl border-b border-white/20">
                            <input
                              type="text"
                              placeholder="Search artists..."
                              value={artistSearch}
                              onChange={(e) => setArtistSearch(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg
                                       text-white placeholder-white/50 font-['Space_Grotesk']
                                       focus:outline-none focus:ring-2 focus:ring-white/30"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          {filteredArtists.map((artist) => (
                            <button
                              key={artist}
                              type="button"
                              onClick={() => {
                                if (!newEvent.artists.includes(artist)) {
                                  setNewEvent(prev => ({
                                    ...prev,
                                    artists: [...prev.artists, artist]
                                  }));
                                }
                                setArtistSearch('');
                              }}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-white/20 
                                       transition-colors text-white/90 font-['Space_Grotesk'] ${
                                         newEvent.artists.includes(artist) ? 'bg-white/20' : ''
                                       }`}
                            >
                              {artist}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-['Space_Grotesk'] tracking-wider text-white/90">
                      Description *
                    </label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                                text-white placeholder-white/50 font-['Space_Grotesk']
                                focus:outline-none focus:ring-2 focus:ring-white/30"
                      rows={3}
                      placeholder="Enter event description"
                      required
                    />
                  </div>

                  {/* Public/Private Toggle */}
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      checked={newEvent.isPublic}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="w-4 h-4 bg-white/10 border-white/30 text-white/90 
                                rounded focus:ring-white/30 cursor-pointer"
                    />
                    <label className="text-sm text-white/80 font-['Space_Grotesk'] tracking-wider cursor-pointer">
                      Show on public calendar
                    </label>
                  </div>
                </form>
              </div>

              <div className="p-4 border-t border-white/20 mt-auto">
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddEvent(false)}
                    className="px-3 py-1.5 bg-white/10 text-white/80 rounded-lg 
                              hover:bg-white/20 transition-colors text-sm 
                              font-['Space_Grotesk'] tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    form="addEventForm"
                    type="submit"
                    className="px-3 py-1.5 bg-white/20 text-white rounded-lg 
                              hover:bg-white/30 transition-colors text-sm 
                              font-['Space_Grotesk'] tracking-wider"
                  >
                    Add Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {eventToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 max-w-[280px] w-full
                           shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/20">
              <h3 className="text-lg font-['Space_Grotesk'] tracking-wider text-white/90 mb-4">
                Delete Event
              </h3>
              
              <p className="text-white/70 text-sm font-['Space_Grotesk'] tracking-wide mb-6">
                Are you sure you want to delete this event? This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEventToDelete(null)}
                  className="px-4 py-2 bg-white/10 text-white/80 rounded-lg 
                            hover:bg-white/20 transition-colors text-sm 
                            font-['Space_Grotesk'] tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg 
                            hover:bg-white/30 transition-colors text-sm 
                            font-['Space_Grotesk'] tracking-wider"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessCalendar; 