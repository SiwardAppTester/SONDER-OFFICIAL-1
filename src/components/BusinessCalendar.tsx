import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, getDocs, deleteDoc, doc, updateDoc, getDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User } from 'firebase/auth';
import { Menu, Plus, X } from "lucide-react";
import BusinessSidebar from "./BusinessSidebar";

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
      fetchBusinessEvents();
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

      <BusinessSidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={0}
      />

      <div className="max-w-6xl mx-auto p-2 md:p-4 w-full">
        <div className="bg-white rounded-lg shadow-lg p-3 md:p-6">
          {/* Month Navigation - make buttons and text smaller on mobile */}
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <button
              onClick={handlePreviousMonth}
              className="px-3 md:px-6 py-1.5 md:py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 text-sm md:text-base"
            >
              Previous
            </button>
            <h2 className="text-lg md:text-xl font-medium">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' }).toLowerCase()}
            </h2>
            <button
              onClick={handleNextMonth}
              className="px-3 md:px-6 py-1.5 md:py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 text-sm md:text-base"
            >
              Next
            </button>
          </div>

          {/* Calendar Grid - adjust spacing and text sizes */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-medium p-1 md:p-2 text-xs md:text-base">
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
                  className={`min-h-[60px] md:min-h-[100px] border rounded-lg p-1 md:p-2 ${
                    day ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${selectedDate === date ? 'bg-purple-50' : ''}`}
                  onClick={() => day && setSelectedDate(date)}
                >
                  {day && (
                    <>
                      <div className="font-medium text-sm md:text-base">{day}</div>
                      {dayEvents.length > 0 && (
                        <div className="mt-0.5 md:mt-1">
                          <span className="text-xs md:text-sm text-purple-600">
                            {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Event Button - adjust spacing */}
          <div className="mt-4 md:mt-6 mb-2 md:mb-4">
            <button
              onClick={() => setShowAddEvent(true)}
              className="flex items-center gap-2 px-4 md:px-6 py-1.5 md:py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 text-xs md:text-sm transition-colors"
            >
              <Plus size={14} className="md:w-4 md:h-4" />
              Add Event
            </button>
          </div>

          {/* Event List - adjust spacing and text sizes */}
          <div className="mt-4 md:mt-6">
            <h3 className="text-lg md:text-xl font-medium mb-3 md:mb-4">
              Events for {selectedDate}
            </h3>
            <div className="space-y-2 md:space-y-3">
              {events
                .filter(event => event.date === selectedDate)
                .map(event => (
                  <div
                    key={event.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base md:text-lg font-medium">{event.title}</h4>
                        <p className="text-gray-600 mt-1 text-sm md:text-base">{event.description}</p>
                        <div className="mt-2 space-y-0.5 md:space-y-1 text-gray-500 text-xs md:text-sm">
                          <p>Time: {event.startTime || '-'}</p>
                          <p>Genre: {event.genre}</p>
                          <p>Location: {event.city}, {event.country}</p>
                          {event.artists && event.artists.length > 0 && (
                            <p>Artists: {event.artists.join(', ')}</p>
                          )}
                          <p className="text-gray-400">{event.isPublic ? 'Public Event' : 'Private Event'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-red-500 hover:text-red-600 text-xs md:text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Add Event Modal - adjust for mobile */}
          {showAddEvent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-5 w-full max-w-lg mx-auto max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h2 className="text-lg font-semibold text-gray-800">Add New Event</h2>
                  <button
                    onClick={() => setShowAddEvent(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddEvent} className="space-y-4">
                  {/* Title Input */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                      placeholder="Enter event title"
                      required
                    />
                  </div>

                  {/* Date and Time Section */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Date *
                      </label>
                      <input
                        type="date"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Time *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={newEvent.startTime}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                          required
                        />
                        <span className="text-gray-400 flex items-center">-</span>
                        <input
                          type="time"
                          value={newEvent.endTime}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Genre Selector */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Genre *
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsGenreOpen(!isGenreOpen)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white 
                                 focus:ring-1 focus:ring-purple-500 focus:border-transparent
                                 flex justify-between items-center text-sm"
                      >
                        <span className={newEvent.genre ? "text-gray-900" : "text-gray-400"}>
                          {newEvent.genre || "Select a genre"}
                        </span>
                        <svg 
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                            isGenreOpen ? 'transform rotate-180' : ''
                          }`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      {isGenreOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 
                                      rounded-lg shadow-lg max-h-48 overflow-auto">
                          {danceGenres.map((genre) => (
                            <button
                              key={genre}
                              type="button"
                              onClick={() => {
                                setNewEvent(prev => ({ ...prev, genre }));
                                setIsGenreOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 
                                       transition-colors duration-150 ease-in-out
                                       text-gray-700 hover:text-purple-700"
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
                    <label className="text-sm font-medium text-gray-700">
                      Location *
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsLocationOpen(!isLocationOpen)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white 
                                 focus:ring-1 focus:ring-purple-500 focus:border-transparent
                                 flex justify-between items-center text-sm"
                      >
                        <span className={newEvent.city ? "text-gray-900" : "text-gray-400"}>
                          {newEvent.city ? `${newEvent.city}, ${newEvent.country}` : "Select a location"}
                        </span>
                        <svg 
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                            isLocationOpen ? 'transform rotate-180' : ''
                          }`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      {isLocationOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 
                                      rounded-lg shadow-lg max-h-48 overflow-auto">
                          <div className="sticky top-0 bg-white border-b p-2">
                            <input
                              type="text"
                              placeholder="Search locations..."
                              value={locationSearch}
                              onChange={(e) => setLocationSearch(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm
                                       focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                              className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 
                                       transition-colors duration-150 ease-in-out
                                       text-gray-700 hover:text-purple-700"
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
                    <label className="text-sm font-medium text-gray-700">
                      Artists
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsArtistOpen(!isArtistOpen)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white 
                                 focus:ring-1 focus:ring-purple-500 focus:border-transparent
                                 flex justify-between items-center text-sm min-h-[40px]"
                      >
                        <div className="flex flex-wrap gap-1.5 pr-6">
                          {newEvent.artists.length > 0 ? (
                            newEvent.artists.map((artist) => (
                              <span
                                key={artist}
                                className="inline-flex items-center px-2 py-0.5 bg-purple-50 
                                         text-purple-700 rounded-full text-xs font-medium"
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
                                  className="ml-1 hover:text-purple-900"
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">Select artists</span>
                          )}
                        </div>
                        <svg 
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 absolute right-3 ${
                            isArtistOpen ? 'transform rotate-180' : ''
                          }`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                      </button>
                      {isArtistOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 
                                      rounded-lg shadow-lg max-h-48 overflow-auto">
                          <div className="sticky top-0 bg-white border-b p-2">
                            <input
                              type="text"
                              placeholder="Search artists..."
                              value={artistSearch}
                              onChange={(e) => setArtistSearch(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm
                                       focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-purple-50 
                                       transition-colors duration-150 ease-in-out
                                       text-gray-700 hover:text-purple-700 ${
                                         newEvent.artists.includes(artist) ? 'bg-purple-50' : ''
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
                    <label className="text-sm font-medium text-gray-700">
                      Description *
                    </label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                               focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 
                               focus:ring-purple-500 cursor-pointer"
                    />
                    <label className="text-sm text-gray-600 cursor-pointer">
                      Show on public calendar
                    </label>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowAddEvent(false)}
                      className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 
                               transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                               transition-colors text-sm font-medium"
                    >
                      Add Event
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal - adjust for mobile */}
          {eventToDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-4 md:p-6 max-w-[280px] w-full mx-2 md:mx-4">
                <p className="text-lg mb-6">
                  Are you sure you want to delete this event?
                </p>
                
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEventToDelete(null)}
                    className="px-6 py-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessCalendar; 