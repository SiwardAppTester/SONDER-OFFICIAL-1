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
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100">
      {/* Navigation - reduced top padding */}
      <div className="flex justify-between items-center p-2">
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

      {/* Main Content - adjusted max width and padding */}
      <div className="max-w-4xl mx-auto px-4 mt-2">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-4 mb-6">
          {/* Genre Filter - reduced margin */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-700">Filter by Genre</h3>
              {selectedGenres.size > 0 && (
                <button
                  onClick={() => setSelectedGenres(new Set())}
                  className="text-purple-600 hover:text-purple-700 text-sm"
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
                  className={`px-6 py-2.5 rounded-full transition-all transform hover:scale-105 ${
                    selectedGenres.has(genre)
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                      : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Month Navigation - reduced margin */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePreviousMonth}
              className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition-colors"
            >
              Previous
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              onClick={handleNextMonth}
              className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition-colors"
            >
              Next
            </button>
          </div>

          {/* Calendar Grid - adjusted cell height */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-semibold text-gray-700 py-1 text-sm">
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
                  className={`min-h-[80px] border rounded-xl p-2 transition-all duration-300 
                    ${day ? 'cursor-pointer hover:shadow-lg transform hover:scale-[1.02]' : ''}
                    ${selectedDate === date ? 'bg-purple-50 border-purple-200' : 'bg-white/60'}
                    ${!day ? 'bg-gray-50/30' : ''}`}
                  onClick={() => day && handleDayClick(date)}
                >
                  {day && (
                    <>
                      <div className="font-semibold text-gray-900 text-sm">{day}</div>
                      {dayEvents.length > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center justify-center bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full">
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
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Events for {new Date(selectedDate).toLocaleDateString('default', { 
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
                {selectedGenres.size > 0 && (
                  <span className="text-sm font-normal text-gray-600 block mt-1">
                    Filtered by: {Array.from(selectedGenres).join(", ")}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-purple-600 hover:text-purple-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {filterEventsByGenre(events.filter(event => event.date === selectedDate))
                .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                .map(event => (
                  <div
                    key={event.id}
                    className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl 
                             transform hover:scale-[1.02] transition-all duration-300
                             border border-gray-100"
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h3>
                      {(event.startTime || event.endTime) && (
                        <span className="bg-purple-100 text-purple-800 px-4 py-1 rounded-full text-sm font-medium">
                          {event.startTime && event.endTime 
                            ? `${event.startTime} - ${event.endTime}`
                            : event.startTime || event.endTime}
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 text-lg mb-3">{event.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-3">
                      {event.createdBy && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Organizer:</span>
                          <span className="text-purple-600">{event.createdBy}</span>
                        </div>
                      )}
                      {event.genre && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Genre:</span>
                          <span className="text-purple-600">{event.genre}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {event.festivalId && (
                        <span className="bg-purple-100 text-purple-800 px-4 py-1.5 rounded-full text-sm font-medium">
                          Festival Event
                        </span>
                      )}
                      {event.isBusinessEvent && (
                        <span className="bg-indigo-100 text-indigo-800 px-4 py-1.5 rounded-full text-sm font-medium">
                          Business Event
                        </span>
                      )}
                      {event.isPublic !== undefined && (
                        <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
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

              {filterEventsByGenre(events.filter(event => event.date === selectedDate)).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg">
                    No events scheduled for this day
                    {selectedGenres.size > 0 && (
                      <span className="block mt-2 text-sm">
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