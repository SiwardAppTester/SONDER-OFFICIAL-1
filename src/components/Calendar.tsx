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
  time?: string;
  description: string;
  userId: string;
  festivalId?: string;
  genre?: string;
  createdBy?: string;
  isBusinessEvent?: boolean;
  isPublic?: boolean;
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

  const filterEventsByGenre = (events: Event[]) => {
    if (selectedGenres.size === 0) return events;
    return events.filter(event => event.genre && selectedGenres.has(event.genre));
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Navigation Header */}
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

      {/* Sidebar */}
      <Sidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={accessibleFestivals.size}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 w-full">
        <div className="bg-white rounded-lg shadow p-6">
          {/* Genre Filter */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700">Filter by Genre</h3>
              {selectedGenres.size > 0 && (
                <button
                  onClick={() => setSelectedGenres(new Set())}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  Clear Filters
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {danceGenres.map(genre => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedGenres.has(genre)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <h2 className="text-xl font-semibold">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold">
                {day}
              </div>
            ))}
            {getMonthData().map((day, index) => {
              const date = day ? formatDate(
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                day
              ) : '';
              const dayEvents = filterEventsByGenre(events.filter(event => event.date === date));

              return (
                <div
                  key={index}
                  className={`min-h-[100px] border rounded p-2 ${
                    day ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${selectedDate === date ? 'bg-blue-50' : ''}`}
                  onClick={() => day && handleDayClick(date)}
                >
                  {day && (
                    <>
                      <div className="font-semibold">{day}</div>
                      {dayEvents.length > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                            {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Event Modal */}
          {showEventModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    Events for {new Date(selectedDate).toLocaleDateString()}
                    {selectedGenres.size > 0 && (
                      <span className="text-sm font-normal text-gray-600 block mt-1">
                        Filtered by: {Array.from(selectedGenres).join(", ")}
                      </span>
                    )}
                  </h2>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {filterEventsByGenre(events.filter(event => event.date === selectedDate))
                    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                    .map(event => (
                      <div
                        key={event.id}
                        className="border rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          {event.time && (
                            <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                              {event.time}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-600 mb-3">{event.description}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 mb-3">
                          {event.createdBy && (
                            <div>
                              <span className="font-medium">Organizer:</span> {event.createdBy}
                            </div>
                          )}
                          {event.genre && (
                            <div>
                              <span className="font-medium">Genre:</span> {event.genre}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {event.festivalId && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              Festival Event
                            </span>
                          )}
                          {event.isBusinessEvent && (
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                              Business Event
                            </span>
                          )}
                          {event.isPublic !== undefined && (
                            <span className={`${
                              event.isPublic 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                              } text-xs px-2 py-1 rounded`}
                            >
                              {event.isPublic ? 'Public' : 'Private'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  
                  {filterEventsByGenre(events.filter(event => event.date === selectedDate)).length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No events scheduled for this day
                      {selectedGenres.size > 0 && ` matching selected genres (${Array.from(selectedGenres).join(", ")})`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar; 