import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, getDocs, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User } from 'firebase/auth';
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";

interface Event {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  description: string;
  userId: string;
  festivalId?: string;
  genre?: string;
  createdBy?: string;
  isBusinessEvent?: boolean;
  isPublic?: boolean;
  artists?: string[];
  city?: string;
  country?: string;
}

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  accessibleFestivals?: string[];
}

const danceGenres = [
  "House", "Techno", "Trance", "Drum & Bass", "Dubstep", "EDM", 
  "Garage", "Breakbeat", "Hardstyle", "Ambient", "Other"
];

const topDanceArtists = [
  "David Guetta", "Calvin Harris", "Martin Garrix", "Tiësto", "Skrillex",
  "Diplo", "Marshmello", "The Chainsmokers", "Kygo", "Zedd",
  "Avicii", "Swedish House Mafia", "Daft Punk", "Deadmau5", "Disclosure",
  "Flume", "Odesza", "Above & Beyond", "Illenium", "Carl Cox"
];

const euCapitals = [
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Berlin", country: "Germany" },
  { city: "London", country: "United Kingdom" },
  { city: "Paris", country: "France" },
  { city: "Barcelona", country: "Spain" },
  { city: "Rome", country: "Italy" },
  { city: "Vienna", country: "Austria" },
  { city: "Prague", country: "Czech Republic" },
  { city: "Stockholm", country: "Sweden" },
  { city: "Dublin", country: "Ireland" }
];

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accessibleFestivals, setAccessibleFestivals] = useState<Set<string>>(new Set());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [selectedArtists, setSelectedArtists] = useState<Set<string>>(new Set());
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [isGenreFilterOpen, setIsGenreFilterOpen] = useState(false);
  const [isArtistFilterOpen, setIsArtistFilterOpen] = useState(false);
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch user profile data
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUserProfile(userData);
          setAccessibleFestivals(new Set(userData.accessibleFestivals || []));
        }
        fetchEvents();
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchEvents = async () => {
    try {
      const eventsRef = collection(db, 'events');
      const eventsSnapshot = await getDocs(eventsRef);
      const eventsList = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Event));
      setEvents(eventsList);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() + 1);
      return newDate;
    });
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

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setShowEventModal(true);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      const newGenres = new Set(prev);
      if (newGenres.has(genre)) {
        newGenres.delete(genre);
      } else {
        newGenres.add(genre);
      }
      return newGenres;
    });
  };

  const toggleArtist = (artist: string) => {
    setSelectedArtists(prev => {
      const newArtists = new Set(prev);
      if (newArtists.has(artist)) {
        newArtists.delete(artist);
      } else {
        newArtists.add(artist);
      }
      return newArtists;
    });
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations(prev => {
      const newLocations = new Set(prev);
      if (newLocations.has(location)) {
        newLocations.delete(location);
      } else {
        newLocations.add(location);
      }
      return newLocations;
    });
  };

  const filterEvents = (events: Event[]) => {
    return events.filter(event => {
      const matchesGenre = selectedGenres.size === 0 || (event.genre && selectedGenres.has(event.genre));
      const matchesArtist = selectedArtists.size === 0 || (event.artists && event.artists.some(artist => selectedArtists.has(artist)));
      const matchesLocation = selectedLocations.size === 0 || (event.city && selectedLocations.has(event.city));
      return matchesGenre && matchesArtist && matchesLocation;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100">
      {/* Navigation - adjusted for mobile */}
      <div className="flex justify-between items-center p-2 md:p-4">
        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="text-purple-600 hover:text-purple-700 transition-colors duration-300"
          aria-label="Toggle navigation menu"
        >
          <Menu size={28} />
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={accessibleFestivals.size}
      />

      {/* Main Content - adjusted for intermediate desktop size */}
      <div className="max-w-4xl lg:max-w-6xl mx-auto px-2 md:px-4 lg:px-6 mt-2">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-3 md:p-4 lg:p-5 mb-6">
          {/* Filters Section */}
          <div className="space-y-2 mb-4">
            {/* Genre Filter */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsGenreFilterOpen(!isGenreFilterOpen)}
                className="w-full px-3 py-2 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-700">Filter by Genre</h3>
                  {selectedGenres.size > 0 && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-1.5 py-0.5 rounded-full">
                      {selectedGenres.size}
                    </span>
                  )}
                </div>
                <svg 
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    isGenreFilterOpen ? 'transform rotate-180' : ''
                  }`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isGenreFilterOpen && (
                <div className="p-2">
                  <div className="flex justify-end mb-1">
                    {selectedGenres.size > 0 && (
                      <button
                        onClick={() => setSelectedGenres(new Set())}
                        className="text-purple-600 hover:text-purple-700 text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {danceGenres.map(genre => (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`px-2 py-1 rounded-full text-xs transition-all transform hover:scale-105 ${
                          selectedGenres.has(genre)
                            ? "bg-purple-600 text-white shadow-sm shadow-purple-200"
                            : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Artist Filter */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsArtistFilterOpen(!isArtistFilterOpen)}
                className="w-full px-3 py-2 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-700">Filter by Artist</h3>
                  {selectedArtists.size > 0 && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-1.5 py-0.5 rounded-full">
                      {selectedArtists.size}
                    </span>
                  )}
                </div>
                <svg 
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    isArtistFilterOpen ? 'transform rotate-180' : ''
                  }`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isArtistFilterOpen && (
                <div className="p-2">
                  <div className="flex justify-end mb-1">
                    {selectedArtists.size > 0 && (
                      <button
                        onClick={() => setSelectedArtists(new Set())}
                        className="text-purple-600 hover:text-purple-700 text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {topDanceArtists.map(artist => (
                      <button
                        key={artist}
                        onClick={() => toggleArtist(artist)}
                        className={`px-2 py-1 rounded-full text-xs transition-all transform hover:scale-105 ${
                          selectedArtists.has(artist)
                            ? "bg-purple-600 text-white shadow-sm shadow-purple-200"
                            : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {artist}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Location Filter */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setIsLocationFilterOpen(!isLocationFilterOpen)}
                className="w-full px-3 py-2 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-700">Filter by Location</h3>
                  {selectedLocations.size > 0 && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-1.5 py-0.5 rounded-full">
                      {selectedLocations.size}
                    </span>
                  )}
                </div>
                <svg 
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                    isLocationFilterOpen ? 'transform rotate-180' : ''
                  }`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isLocationFilterOpen && (
                <div className="p-2">
                  <div className="flex justify-end mb-1">
                    {selectedLocations.size > 0 && (
                      <button
                        onClick={() => setSelectedLocations(new Set())}
                        className="text-purple-600 hover:text-purple-700 text-xs"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {euCapitals.map(({ city }) => (
                      <button
                        key={city}
                        onClick={() => toggleLocation(city)}
                        className={`px-2 py-1 rounded-full text-xs transition-all transform hover:scale-105 ${
                          selectedLocations.has(city)
                            ? "bg-purple-600 text-white shadow-sm shadow-purple-200"
                            : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Month Navigation - slightly reduced from previous */}
          <div className="flex justify-between items-center mb-4 lg:mb-5">
            <button
              onClick={handlePreviousMonth}
              className="bg-purple-600 text-white px-3 md:px-6 py-1.5 md:py-2 lg:py-2.5 text-sm md:text-base lg:text-lg rounded-full hover:bg-purple-700 transition-colors"
            >
              Previous
            </button>
            <h2 className="text-lg md:text-2xl lg:text-2xl font-bold text-gray-900">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={handleNextMonth}
              className="bg-purple-600 text-white px-3 md:px-6 py-1.5 md:py-2 lg:py-2.5 text-sm md:text-base lg:text-lg rounded-full hover:bg-purple-700 transition-colors"
            >
              Next
            </button>
          </div>

          {/* Calendar Grid - adjusted cell size */}
          <div className="grid grid-cols-7 gap-1 lg:gap-1.5">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-700 py-1 lg:py-1.5 text-xs md:text-sm lg:text-base">
                {day}
              </div>
            ))}
            {getMonthData().map((day, index) => {
              const date = day ? formatDate(
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                day
              ) : '';
              const dayEvents = filterEvents(events.filter(event => event.date === date));

              return (
                <div
                  key={index}
                  className={`min-h-[60px] md:min-h-[80px] lg:min-h-[100px] border rounded-xl p-1.5 md:p-2 lg:p-2.5 transition-all duration-300 
                    ${day ? 'cursor-pointer hover:shadow-lg transform hover:scale-[1.02]' : ''}
                    ${selectedDate === date ? 'bg-purple-50 border-purple-200' : 'bg-white/60'}
                    ${!day ? 'bg-gray-50/30' : ''}`}
                  onClick={() => day && handleDayClick(date)}
                >
                  {day && (
                    <>
                      <div className="font-semibold text-gray-900 text-xs md:text-sm lg:text-base">{day}</div>
                      {dayEvents.length > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center justify-center bg-purple-100 text-purple-800 text-[10px] md:text-xs lg:text-sm font-medium px-1.5 md:px-2 lg:px-2.5 py-0.5 rounded-full">
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
        </div>
      </div>

      {/* Event Modal - adjusted for mobile */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-0">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 md:p-6 w-full max-w-lg mx-2 md:mx-4 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">
                Events for {new Date(selectedDate).toLocaleDateString('default', { 
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
                {selectedGenres.size > 0 && (
                  <span className="text-xs md:text-sm font-normal text-gray-600 block mt-1">
                    Filtered by: {Array.from(selectedGenres).join(", ")}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-purple-600 hover:text-purple-700 transition-colors"
              >
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] md:max-h-[70vh] overflow-y-auto pr-2">
              {filterEvents(events.filter(event => event.date === selectedDate))
                .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                .map(event => (
                  <div
                    key={event.id}
                    className="bg-white rounded-2xl p-3 md:p-4 shadow-lg hover:shadow-xl 
                             transform hover:scale-[1.02] transition-all duration-300
                             border border-gray-100"
                  >
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{event.title}</h3>
                      {(event.startTime || event.endTime) && (
                        <span className="bg-purple-100 text-purple-800 px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-medium">
                          {event.startTime && event.endTime 
                            ? `${event.startTime} - ${event.endTime}`
                            : event.startTime || event.endTime}
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 text-base md:text-lg mb-3">{event.description}</p>

                    {/* Event Details Section */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {/* Location */}
                      {event.city && (
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-xs text-gray-600">
                            {event.city}{event.country ? `, ${event.country}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Artists */}
                      {event.artists && event.artists.length > 0 && (
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-xs text-gray-600">
                            {event.artists.join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Genre */}
                      {event.genre && (
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          <span className="text-xs text-gray-600">{event.genre}</span>
                        </div>
                      )}

                      {/* Organizer */}
                      {event.createdBy && (
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-xs text-gray-600">{event.createdBy}</span>
                        </div>
                      )}
                    </div>

                    {/* Event Type Tags */}
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {event.festivalId && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                          Festival Event
                        </span>
                      )}
                      {event.isBusinessEvent && (
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                          Business Event
                        </span>
                      )}
                      {event.isPublic !== undefined && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.isPublic 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {event.isPublic ? 'Public' : 'Private'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

              {filterEvents(events.filter(event => event.date === selectedDate)).length === 0 && (
                <div className="text-center py-6 md:py-8">
                  <p className="text-gray-500 text-base md:text-lg">
                    No events scheduled for this day
                    {selectedGenres.size > 0 && (
                      <span className="block mt-2 text-xs md:text-sm">
                        Filtered by: {Array.from(selectedGenres).join(", ")}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar; 