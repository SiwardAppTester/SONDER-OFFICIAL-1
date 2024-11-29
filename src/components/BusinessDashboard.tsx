import React from 'react';
import { db, auth } from '../firebase';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { Menu } from 'lucide-react';
import BusinessSidebar from './BusinessSidebar';

interface Download {
  postId: string;
  mediaType: 'image' | 'video';
  mediaIndex?: number;
  downloadedAt: any;
  userId: string;
  festivalId: string;
  categoryId?: string;
}

interface DownloadMetrics {
  totalDownloads: number;
  imageDownloads: number;
  videoDownloads: number;
  downloadsByFestival: Record<string, {
    total: number;
    images: number;
    videos: number;
  }>;
}

interface DetailedDownloadMetrics extends DownloadMetrics {
  downloadsByMedia: Record<string, {
    postId: string;
    mediaType: 'image' | 'video';
    downloadCount: number;
    festivalId: string;
    downloadedAt: any;
    categoryId?: string;
    categoryName?: string;
    url?: string;
    uniqueDownloads?: Set<string>;
  }>;
}

// Add new interface for Festival
interface Festival {
  id: string;
  name: string;
  accessCode: string;
}

interface Post {
  id: string;
  mediaFiles: {
    url: string;
    type: "image" | "video";
    categoryId?: string;
  }[];
  festivalId: string;
}

const BusinessDashboard: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [downloadMetrics, setDownloadMetrics] = useState<DetailedDownloadMetrics>({
    totalDownloads: 0,
    imageDownloads: 0,
    videoDownloads: 0,
    downloadsByFestival: {},
    downloadsByMedia: {}
  });
  const [festivals, setFestivals] = useState<Record<string, string>>({});  // Map of festivalId to festivalName
  const [categories, setCategories] = useState<Record<string, string>>({});  // Map of categoryId to categoryName

  // Modify the useEffect for fetching posts and initializing metrics
  useEffect(() => {
    const fetchPostsAndInitializeMetrics = async () => {
      try {
        // Fetch festivals
        const festivalsSnapshot = await getDocs(collection(db, "festivals"));
        const validFestivalIds = new Set(festivalsSnapshot.docs.map(doc => doc.id));
        
        if (validFestivalIds.size === 0) {
          setDownloadMetrics({
            totalDownloads: 0,
            imageDownloads: 0,
            videoDownloads: 0,
            downloadsByFestival: {},
            downloadsByMedia: {}
          });
          return;
        }

        // Initialize metrics
        const initialMetrics: DetailedDownloadMetrics = {
          totalDownloads: 0,
          imageDownloads: 0,
          videoDownloads: 0,
          downloadsByFestival: {},
          downloadsByMedia: {}
        };

        // First, fetch and process all posts to create media entries
        const postsSnapshot = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
        
        // Process all posts first to create empty entries
        postsSnapshot.docs.forEach((doc) => {
          const postData = doc.data();
          const post = { 
            id: doc.id, 
            ...postData,
            mediaFiles: Array.isArray(postData.mediaFiles) ? postData.mediaFiles : []
          } as Post;
          
          if (!validFestivalIds.has(post.festivalId)) return;

          // Initialize festival metrics
          if (!initialMetrics.downloadsByFestival[post.festivalId]) {
            initialMetrics.downloadsByFestival[post.festivalId] = {
              total: 0,
              images: 0,
              videos: 0
            };
          }

          // Create entries for each media file, even if it has no downloads
          post.mediaFiles.forEach((media, index) => {
            if (!media.type || !media.url) return;
            
            // Create a unique key for each media file
            const mediaKey = `${post.id}-${index}`;
            
            // Initialize media metrics with zero downloads
            initialMetrics.downloadsByMedia[mediaKey] = {
              postId: post.id,
              mediaType: media.type as 'image' | 'video',
              downloadCount: 0,
              festivalId: post.festivalId,
              downloadedAt: null,
              categoryId: media.categoryId,
              url: media.url
            };
          });
        });

        // Set initial empty metrics before setting up the listener
        setDownloadMetrics(initialMetrics);

        // Set up real-time listener for all downloads
        const unsubscribe = onSnapshot(
          collection(db, 'downloads'),
          (snapshot) => {
            // Process all documents, not just changes
            const allDownloads = snapshot.docs;
            
            setDownloadMetrics(prev => {
              const updated = {
                totalDownloads: 0,
                imageDownloads: 0,
                videoDownloads: 0,
                downloadsByFestival: {},
                downloadsByMedia: { ...prev.downloadsByMedia }
              };

              // Reset all download counts to 0
              Object.values(updated.downloadsByMedia).forEach(media => {
                media.downloadCount = 0;
                media.uniqueDownloads = new Set();
              });

              // Process all downloads
              allDownloads.forEach((doc) => {
                const download = doc.data() as Download;
                if (!validFestivalIds.has(download.festivalId)) return;

                const mediaKey = `${download.postId}-${download.mediaIndex}`;
                const mediaMetrics = updated.downloadsByMedia[mediaKey];
                
                if (!mediaMetrics) return;

                // Initialize festival metrics if needed
                if (!updated.downloadsByFestival[mediaMetrics.festivalId]) {
                  updated.downloadsByFestival[mediaMetrics.festivalId] = {
                    total: 0,
                    images: 0,
                    videos: 0
                  };
                }

                // Create a unique key using document ID
                const uniqueKey = `${download.userId}-${doc.id}`;
                
                if (!mediaMetrics.uniqueDownloads?.has(uniqueKey)) {
                  mediaMetrics.uniqueDownloads?.add(uniqueKey);
                  mediaMetrics.downloadCount += 1;
                  mediaMetrics.downloadedAt = download.downloadedAt;

                  // Update festival metrics
                  const festivalMetrics = updated.downloadsByFestival[mediaMetrics.festivalId];
                  festivalMetrics.total += 1;
                  if (mediaMetrics.mediaType === 'image') {
                    festivalMetrics.images += 1;
                    updated.imageDownloads += 1;
                  } else {
                    festivalMetrics.videos += 1;
                    updated.videoDownloads += 1;
                  }
                  updated.totalDownloads += 1;
                }
              });

              return updated;
            });
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching posts and initializing metrics:", error);
      }
    };

    fetchPostsAndInitializeMetrics();
  }, []);

  // Add new useEffect to fetch festival names
  useEffect(() => {
    const fetchFestivals = async () => {
      try {
        const festivalsSnapshot = await getDocs(collection(db, "festivals"));
        const festivalsMap: Record<string, string> = {};
        
        festivalsSnapshot.docs.forEach((doc) => {
          const festivalData = doc.data();
          festivalsMap[doc.id] = festivalData.name || festivalData.festivalName || 'Unnamed Festival';
        });
        
        setFestivals(festivalsMap);
      } catch (error) {
        console.error("Error fetching festivals:", error);
      }
    };

    fetchFestivals();
  }, []);

  // Add new useEffect to fetch category names
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const festivalsSnapshot = await getDocs(collection(db, "festivals"));
        const categoriesMap: Record<string, string> = {};
        
        festivalsSnapshot.docs.forEach((doc) => {
          const festivalData = doc.data();
          if (festivalData.categories) {
            festivalData.categories.forEach((category: { id: string; name: string }) => {
              categoriesMap[category.id] = category.name;
            });
          }
        });
        
        setCategories(categoriesMap);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Sort media items by download count, but include all items even with zero downloads
  const sortedMediaItems = Object.entries(downloadMetrics.downloadsByMedia)
    .sort(([, a], [, b]) => b.downloadCount - a.downloadCount);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100">
      {/* Navigation */}
      <div className="flex justify-between items-center p-4">
        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="text-purple-600 hover:text-purple-700 transition-colors duration-300"
          aria-label="Toggle navigation menu"
        >
          <Menu size={28} />
        </button>
      </div>

      {/* Sidebar */}
      <BusinessSidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={auth.currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={0}
      />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Download Analytics</h1>
        
        {/* Detailed Media Downloads */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Downloads by Media</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Media Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Festival
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Downloaded
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedMediaItems.map(([key, item]) => (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                        {item.mediaType === 'video' ? (
                          <video
                            src={item.url}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLVideoElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <img
                            src={item.url}
                            alt="Media preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.mediaType === 'image' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {item.mediaType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {categories[item.categoryId || ''] || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {festivals[item.festivalId] || 'Loading...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {Math.round(item.downloadCount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.downloadedAt?.toDate().toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard; 