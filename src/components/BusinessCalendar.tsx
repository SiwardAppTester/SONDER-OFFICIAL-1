import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, getDocs, deleteDoc, doc, updateDoc, getDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User } from 'firebase/auth';
import { Menu, Plus } from "lucide-react";
import BusinessSidebar from "./BusinessSidebar";

interface Event {
  id: string;
  title: string;
  date: string;
  description: string;
  userId: string;
  createdBy: string; // business name
  isBusinessEvent: boolean;
  isPublic: boolean; // determines if event shows on regular calendar
}

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  isBusinessAccount?: boolean;
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
    isPublic: true
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
        fetchBusinessEvents();
      }
    });

    return () => unsubscribe();
  }, []);

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

    try {
      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        date: selectedDate,
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
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      await deleteDoc(doc(db, 'events', eventId));
      setEvents(prev => prev.filter(event => event.id !== eventId));
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

      <div className="max-w-6xl mx-auto p-4 w-full">
        <div className="bg-white rounded-lg shadow p-6">
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
              const dayEvents = events.filter(event => event.date === date);

              return (
                <div
                  key={index}
                  className={`min-h-[100px] border rounded p-2 ${
                    day ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${selectedDate === date ? 'bg-blue-50' : ''}`}
                  onClick={() => day && setSelectedDate(date)}
                >
                  {day && (
                    <>
                      <div className="font-semibold">{day}</div>
                      <div className="text-xs space-y-1">
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            className="bg-blue-100 p-1 rounded truncate"
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Event Button */}
          <div className="mb-4">
            <button
              onClick={() => setShowAddEvent(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Plus size={20} />
              Add Event
            </button>
          </div>

          {/* Add Event Form */}
          {showAddEvent && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <form onSubmit={handleAddEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newEvent.isPublic}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Show on public calendar
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Add Event
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddEvent(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Event List for Selected Date */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">
              Events for {selectedDate}
            </h3>
            <div className="space-y-4">
              {events
                .filter(event => event.date === selectedDate)
                .map(event => (
                  <div
                    key={event.id}
                    className="bg-white border rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{event.title}</h4>
                        <p className="text-gray-600">{event.description}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {event.isPublic ? 'Public Event' : 'Private Event'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessCalendar; 