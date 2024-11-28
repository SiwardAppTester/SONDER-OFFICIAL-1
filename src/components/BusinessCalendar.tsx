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
    startTime: '',
    endTime: '',
    genre: '',
    isPublic: true
  });
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

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
        !newEvent.startTime || !newEvent.endTime || !newEvent.genre) {
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
        date: selectedDate,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        genre: newEvent.genre,
        userId: currentUser.uid,
        createdBy: userProfile.displayName || userProfile.email,
        isBusinessEvent: true,
        isPublic: newEvent.isPublic,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'events'), eventData);
      
      setNewEvent({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        genre: '',
        isPublic: true
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
              <div className="bg-white rounded-2xl p-4 md:p-6 max-w-md w-full mx-2 md:mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-medium">Add New Event</h2>
                  <button
                    onClick={() => setShowAddEvent(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        End Time *
                      </label>
                      <input
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Dance Genre *
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsGenreOpen(!isGenreOpen)}
                        className="w-full p-2.5 border border-gray-200 rounded-lg bg-white 
                                 focus:ring-2 focus:ring-purple-500 focus:border-transparent
                                 flex justify-between items-center text-left"
                      >
                        <span className={newEvent.genre ? "text-gray-900" : "text-gray-500"}>
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
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth="2" 
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {isGenreOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 
                                      rounded-lg shadow-lg max-h-60 overflow-auto">
                          {danceGenres.map((genre) => (
                            <button
                              key={genre}
                              type="button"
                              onClick={() => {
                                setNewEvent(prev => ({ ...prev, genre }));
                                setIsGenreOpen(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-purple-50 
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

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description *
                    </label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newEvent.isPublic}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label className="ml-2 text-sm text-gray-600">
                      Show on public calendar
                    </label>
                  </div>

                  <div className="flex gap-3 justify-end mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddEvent(false)}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
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