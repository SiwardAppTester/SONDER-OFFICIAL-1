import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Menu } from 'lucide-react';
import BusinessSidebar from './BusinessSidebar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardStats {
  totalPosts: number;
  totalImages: number;
  totalVideos: number;
  totalDownloads: number;
  imageDownloads: number;
  videoDownloads: number;
  downloadsByFestival: Record<string, number>;
  downloadsByCategory: Record<string, number>;
  postsTimeline: {
    date: string;
    count: number;
  }[];
  mediaTypeDistribution: {
    name: string;
    value: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const BusinessDashboard: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    totalImages: 0,
    totalVideos: 0,
    totalDownloads: 0,
    imageDownloads: 0,
    videoDownloads: 0,
    downloadsByFestival: {},
    downloadsByCategory: {},
    postsTimeline: [],
    mediaTypeDistribution: []
  });
  const [festivals, setFestivals] = useState<any[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    fetchUserProfile();
    fetchFestivals();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Get date range
    const now = new Date();
    let startDate = new Date();
    switch (selectedTimeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Create posts query - Remove the timestamp filter initially to debug
    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", auth.currentUser.uid)
      // Temporarily remove the timestamp filter to see if that's the issue
      // where("createdAt", ">=", startDate)
    );

    // Set up real-time listener for posts
    const unsubscribe = onSnapshot(postsQuery, async (postsSnapshot) => {
      try {
        const posts = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log('Found posts:', posts.length); // Debug log
        console.log('Posts data:', posts); // Debug log to see the actual post data

        // Calculate statistics
        let totalImages = 0;
        let totalVideos = 0;

        posts.forEach(post => {
          console.log('Processing post:', post.id); // Debug log
          console.log('Post mediaFiles:', post.mediaFiles); // Debug log
          
          if (post.mediaFiles && Array.isArray(post.mediaFiles)) {
            post.mediaFiles.forEach(file => {
              console.log('Processing file:', file); // Debug log
              if (file.type === 'image') totalImages++;
              if (file.type === 'video') totalVideos++;
            });
          }
        });

        console.log('Total Images:', totalImages); // Debug log
        console.log('Total Videos:', totalVideos); // Debug log

        const newStats: DashboardStats = {
          totalPosts: posts.length,
          totalImages: totalImages,
          totalVideos: totalVideos,
          totalDownloads: 0, // We'll update these after fetching downloads
          imageDownloads: 0,
          videoDownloads: 0,
          downloadsByFestival: {},
          downloadsByCategory: {},
          postsTimeline: [],
          mediaTypeDistribution: []
        };

        // Fetch downloads
        const downloadsQuery = query(
          collection(db, "downloads"),
          where("downloadedAt", ">=", startDate)
        );
        const downloadsSnapshot = await getDocs(downloadsQuery);
        const downloads = downloadsSnapshot.docs.map(doc => doc.data());

        // Update download statistics
        newStats.totalDownloads = downloads.length;
        newStats.imageDownloads = downloads.filter(d => d.mediaType === 'image').length;
        newStats.videoDownloads = downloads.filter(d => d.mediaType === 'video').length;

        // Calculate downloads by festival and category
        downloads.forEach(download => {
          const post = posts.find(p => p.id === download.postId);
          if (post) {
            newStats.downloadsByFestival[post.festivalId] = (newStats.downloadsByFestival[post.festivalId] || 0) + 1;
            if (post.categoryId) {
              newStats.downloadsByCategory[post.categoryId] = (newStats.downloadsByCategory[post.categoryId] || 0) + 1;
            }
          }
        });

        // Calculate posts timeline
        const timeline = new Map();
        posts.forEach(post => {
          if (post.createdAt) {
            const date = post.createdAt.toDate ? 
              post.createdAt.toDate().toLocaleDateString() : 
              new Date(post.createdAt).toLocaleDateString();
            timeline.set(date, (timeline.get(date) || 0) + 1);
          }
        });
        
        newStats.postsTimeline = Array.from(timeline.entries()).map(([date, count]) => ({
          date,
          count
        }));

        // Update media type distribution
        newStats.mediaTypeDistribution = [
          { name: 'Images', value: totalImages },
          { name: 'Videos', value: totalVideos }
        ];

        setStats(newStats);
      } catch (error) {
        console.error('Error processing dashboard stats:', error);
        console.error('Error details:', error);
      }
    });

    return () => unsubscribe();
  }, [selectedTimeRange]);

  const fetchUserProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      setUserProfile(userDoc.data());
    }
  };

  const fetchFestivals = async () => {
    const festivalsSnapshot = await getDocs(collection(db, "festivals"));
    const festivalsData = festivalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setFestivals(festivalsData);
  };

  return (
    <div className="min-h-screen bg-pink-50">
      {/* Header - Adjusted padding for mobile */}
      <div className="flex items-center gap-4 p-3 md:p-4">
        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="text-purple-600 hover:text-purple-700 transition-colors duration-300"
          aria-label="Toggle navigation menu"
        >
          <Menu size={24} className="md:w-7 md:h-7" />
        </button>
      </div>

      <BusinessSidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={auth.currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={festivals.length}
      />

      {/* Adjusted padding for mobile */}
      <div className="px-3 md:px-6 pb-4 md:pb-6 max-w-7xl mx-auto">
        {/* Main Content Card - Adjusted padding for mobile */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg p-4 md:p-8 mb-4 md:mb-8">
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">Business Dashboard</h1>
            
            {/* Time Range Selector - Made scrollable on mobile */}
            <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 -mb-2 md:pb-0 md:mb-0 hide-scrollbar">
              {['week', 'month', 'year'].map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedTimeRange(range as 'week' | 'month' | 'year')}
                  className={`px-4 md:px-6 py-2 rounded-full transition-all whitespace-nowrap flex-shrink-0 ${
                    selectedTimeRange === range
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Overview - Adjusted grid for mobile */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
            {[
              { label: 'Total Posts', value: stats.totalPosts },
              { label: 'Total Downloads', value: stats.totalDownloads },
              { label: 'Image Downloads', value: stats.imageDownloads },
              { label: 'Video Downloads', value: stats.videoDownloads }
            ].map((stat, index) => (
              <div key={index} className="bg-gray-50 p-3 md:p-6 rounded-xl md:rounded-2xl">
                <h3 className="text-gray-500 text-xs md:text-sm font-medium">{stat.label}</h3>
                <p className="mt-1 md:mt-2 text-xl md:text-3xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Section - Stack on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Posts Timeline */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-xl md:rounded-2xl">
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Posts Timeline</h3>
              <div className="h-60 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.postsTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#9333EA" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Media Type Distribution */}
            <div className="bg-gray-50 p-4 md:p-6 rounded-xl md:rounded-2xl">
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-3 md:mb-4">Media Type Distribution</h3>
              <div className="h-60 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.mediaTypeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={window.innerWidth < 768 ? 60 : 80}
                      fill="#9333EA"
                      dataKey="value"
                    >
                      {stats.mediaTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#9333EA', '#A855F7'][index % 2]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: window.innerWidth < 768 ? '12px' : '14px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard; 