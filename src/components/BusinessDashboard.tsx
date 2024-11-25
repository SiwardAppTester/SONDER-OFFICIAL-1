import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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
    if (festivals.length > 0) {
      fetchDashboardStats();
    }
  }, [festivals, selectedTimeRange]);

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

  const fetchDashboardStats = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
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

      // Fetch posts
      const postsQuery = query(
        collection(db, "posts"),
        where("userId", "==", user.uid),
        where("createdAt", ">=", startDate)
      );
      const postsSnapshot = await getDocs(postsQuery);
      const posts = postsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch downloads
      const downloadsQuery = query(
        collection(db, "downloads"),
        where("downloadedAt", ">=", startDate)
      );
      const downloadsSnapshot = await getDocs(downloadsQuery);
      const downloads = downloadsSnapshot.docs.map(doc => doc.data());

      // Calculate statistics
      const stats: DashboardStats = {
        totalPosts: posts.length,
        totalImages: posts.reduce((acc, post) => acc + post.mediaFiles.filter(m => m.type === 'image').length, 0),
        totalVideos: posts.reduce((acc, post) => acc + post.mediaFiles.filter(m => m.type === 'video').length, 0),
        totalDownloads: downloads.length,
        imageDownloads: downloads.filter(d => d.mediaType === 'image').length,
        videoDownloads: downloads.filter(d => d.mediaType === 'video').length,
        downloadsByFestival: {},
        downloadsByCategory: {},
        postsTimeline: [],
        mediaTypeDistribution: []
      };

      // Calculate downloads by festival and category
      downloads.forEach(download => {
        const post = posts.find(p => p.id === download.postId);
        if (post) {
          stats.downloadsByFestival[post.festivalId] = (stats.downloadsByFestival[post.festivalId] || 0) + 1;
          if (post.categoryId) {
            stats.downloadsByCategory[post.categoryId] = (stats.downloadsByCategory[post.categoryId] || 0) + 1;
          }
        }
      });

      // Calculate posts timeline
      const timeline = new Map();
      posts.forEach(post => {
        const date = new Date(post.createdAt.toDate()).toLocaleDateString();
        timeline.set(date, (timeline.get(date) || 0) + 1);
      });
      stats.postsTimeline = Array.from(timeline.entries()).map(([date, count]) => ({
        date,
        count
      }));

      // Calculate media type distribution
      stats.mediaTypeDistribution = [
        { name: 'Images', value: stats.totalImages },
        { name: 'Videos', value: stats.totalVideos }
      ];

      setStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="text-gray-700 hover:text-gray-900"
          aria-label="Toggle navigation menu"
        >
          <Menu size={24} />
        </button>
      </div>

      <BusinessSidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={auth.currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={festivals.length}
      />

      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Business Dashboard</h1>
          <div className="mt-4 flex gap-4">
            {['week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range as 'week' | 'month' | 'year')}
                className={`px-4 py-2 rounded-lg ${
                  selectedTimeRange === range
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Posts', value: stats.totalPosts },
            { label: 'Total Downloads', value: stats.totalDownloads },
            { label: 'Image Downloads', value: stats.imageDownloads },
            { label: 'Video Downloads', value: stats.videoDownloads }
          ].map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
              <p className="mt-2 text-3xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Posts Timeline */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Posts Timeline</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.postsTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Media Type Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Media Type Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.mediaTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.mediaTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard; 