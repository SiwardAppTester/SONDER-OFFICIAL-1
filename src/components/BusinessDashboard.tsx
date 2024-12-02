import React from 'react';
import { db, auth } from '../firebase';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { Menu, X } from 'lucide-react';
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

// Update the interface for UserProfile to include gender
interface UserProfile {
  email: string;
  gender?: 'male' | 'female' | 'non-binary' | string;
  // ... other fields ...
}

// Add interface for user download details
interface UserDownloadDetails {
  userId: string;
  downloadedAt: any;
  username?: string;
  photoURL?: string;
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  favoriteGenre?: string;
  age?: number;
}

// Add these new interfaces for statistics
interface DemographicStats {
  totalUniqueUsers: number;
  ageStats: {
    average: number;
    ranges: Record<string, number>; // e.g., "18-24": 5
  };
  genderDistribution: Record<string, number>; // e.g., "Male": 10
  genrePreferences: Record<string, number>; // e.g., "House": 8
}

// Add new interfaces for shares
interface Share {
  postId: string;
  mediaIndex?: number;
  sharedAt: any;
  senderId: string;
  receiverId: string;
  festivalId: string;
  categoryId?: string;
}

interface ShareMetrics {
  totalShares: number;
  imageShares: number;
  videoShares: number;
  sharesByFestival: Record<string, {
    total: number;
    images: number;
    videos: number;
  }>;
}

interface DetailedShareMetrics extends ShareMetrics {
  sharesByMedia: Record<string, {
    postId: string;
    mediaType: 'image' | 'video';
    shareCount: number;
    festivalId: string;
    sharedAt: any;
    categoryId?: string;
    categoryName?: string;
    url?: string;
    uniqueShares?: Set<string>;
  }>;
}

// Add this interface for share user details
interface UserShareDetails {
  userId: string;
  sharedAt: any;
  username?: string;
  photoURL?: string;
  displayName?: string;
  dateOfBirth?: string;
  gender?: string;
  favoriteGenre?: string;
  age?: number;
}

const BusinessDashboard: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accessibleFestivalsCount, setAccessibleFestivalsCount] = useState(0);
  const [downloadMetrics, setDownloadMetrics] = useState<DetailedDownloadMetrics>({
    totalDownloads: 0,
    imageDownloads: 0,
    videoDownloads: 0,
    downloadsByFestival: {},
    downloadsByMedia: {}
  });
  const [festivals, setFestivals] = useState<Record<string, string>>({});  // Map of festivalId to festivalName
  const [categories, setCategories] = useState<Record<string, string>>({});  // Map of categoryId to categoryName
  const [selectedMedia, setSelectedMedia] = useState<{
    mediaKey: string;
    item: DetailedDownloadMetrics['downloadsByMedia'][string];
    downloads: UserDownloadDetails[];
  } | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [demographicStats, setDemographicStats] = useState<DemographicStats>({
    totalUniqueUsers: 0,
    ageStats: {
      average: 0,
      ranges: {}
    },
    genderDistribution: {},
    genrePreferences: {}
  });
  const [viewMode, setViewMode] = useState<'downloads' | 'shares'>('downloads');
  const [shareMetrics, setShareMetrics] = useState<DetailedShareMetrics>({
    totalShares: 0,
    imageShares: 0,
    videoShares: 0,
    sharesByFestival: {},
    sharesByMedia: {}
  });
  const [selectedShareMedia, setSelectedShareMedia] = useState<{
    mediaKey: string;
    item: DetailedShareMetrics['sharesByMedia'][string];
    shares: UserShareDetails[];
  } | null>(null);
  const [shareStats, setShareStats] = useState<DemographicStats>({
    totalUniqueUsers: 0,
    ageStats: {
      average: 0,
      ranges: {
        'Under 18': 0,
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45+': 0
      }
    },
    genderDistribution: {},
    genrePreferences: {}
  });

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
          setShareMetrics({
            totalShares: 0,
            imageShares: 0,
            videoShares: 0,
            sharesByFestival: {},
            sharesByMedia: {}
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

        const initialShareMetrics: DetailedShareMetrics = {
          totalShares: 0,
          imageShares: 0,
          videoShares: 0,
          sharesByFestival: {},
          sharesByMedia: {}
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

          // Initialize festival metrics for both downloads and shares
          if (!initialMetrics.downloadsByFestival[post.festivalId]) {
            initialMetrics.downloadsByFestival[post.festivalId] = {
              total: 0,
              images: 0,
              videos: 0
            };
            initialShareMetrics.sharesByFestival[post.festivalId] = {
              total: 0,
              images: 0,
              videos: 0
            };
          }

          // Create entries for each media file
          post.mediaFiles.forEach((media, index) => {
            if (!media.type || !media.url) return;
            
            const mediaKey = `${post.id}-${index}`;
            
            // Initialize media metrics for downloads
            initialMetrics.downloadsByMedia[mediaKey] = {
              postId: post.id,
              mediaType: media.type as 'image' | 'video',
              downloadCount: 0,
              festivalId: post.festivalId,
              downloadedAt: null,
              categoryId: media.categoryId,
              url: media.url
            };

            // Initialize media metrics for shares
            initialShareMetrics.sharesByMedia[mediaKey] = {
              postId: post.id,
              mediaType: media.type as 'image' | 'video',
              shareCount: 0,
              festivalId: post.festivalId,
              sharedAt: null,
              categoryId: media.categoryId,
              url: media.url
            };
          });
        });

        // Set initial empty metrics
        setDownloadMetrics(initialMetrics);
        setShareMetrics(initialShareMetrics);

        // Set up real-time listeners for downloads and shares
        const unsubscribeDownloads = onSnapshot(
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

        // Add real-time listener for shares
        const unsubscribeShares = onSnapshot(
          collection(db, 'messages'),
          (snapshot) => {
            const allShares = snapshot.docs.filter(doc => doc.data().type === 'shared_post');
            
            setShareMetrics(prev => {
              const updated = {
                totalShares: 0,
                imageShares: 0,
                videoShares: 0,
                sharesByFestival: {},
                sharesByMedia: { ...prev.sharesByMedia }
              };

              // Reset all share counts to 0
              Object.values(updated.sharesByMedia).forEach(media => {
                media.shareCount = 0;
                media.uniqueShares = new Set();
              });

              // Process all shares
              allShares.forEach((doc) => {
                const share = doc.data();
                if (!validFestivalIds.has(share.festivalId)) return;

                const mediaKey = `${share.postId}-${share.mediaIndex || 0}`;
                const mediaMetrics = updated.sharesByMedia[mediaKey];
                
                if (!mediaMetrics) return;

                // Initialize festival metrics if needed
                if (!updated.sharesByFestival[mediaMetrics.festivalId]) {
                  updated.sharesByFestival[mediaMetrics.festivalId] = {
                    total: 0,
                    images: 0,
                    videos: 0
                  };
                }

                // Create a unique key using document ID
                const uniqueKey = `${share.senderId}-${share.receiverId}-${doc.id}`;
                
                if (!mediaMetrics.uniqueShares?.has(uniqueKey)) {
                  mediaMetrics.uniqueShares?.add(uniqueKey);
                  mediaMetrics.shareCount += 1;
                  mediaMetrics.sharedAt = share.timestamp;

                  // Update festival metrics
                  const festivalMetrics = updated.sharesByFestival[mediaMetrics.festivalId];
                  festivalMetrics.total += 1;
                  if (mediaMetrics.mediaType === 'image') {
                    festivalMetrics.images += 1;
                    updated.imageShares += 1;
                  } else {
                    festivalMetrics.videos += 1;
                    updated.videoShares += 1;
                  }
                  updated.totalShares += 1;
                }
              });

              return updated;
            });
          }
        );

        return () => {
          unsubscribeDownloads();
          unsubscribeShares();
        };
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

  // Add this useEffect to fetch the user profile and festival count
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!auth.currentUser?.uid) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUserProfile(userData);
          
          // Get festivals count
          const [userIdSnapshot, ownerIdSnapshot] = await Promise.all([
            getDocs(
              query(
                collection(db, "festivals"),
                where("userId", "==", auth.currentUser.uid),
                where("active", "==", true)
              )
            ),
            getDocs(
              query(
                collection(db, "festivals"),
                where("ownerId", "==", auth.currentUser.uid),
                where("active", "==", true)
              )
            )
          ]);
          
          const festivals = [...userIdSnapshot.docs, ...ownerIdSnapshot.docs]
            .filter((doc, index, self) => 
              index === self.findIndex(d => d.id === doc.id)
            );
          
          setAccessibleFestivalsCount(festivals.length);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  // Modify the calculateDemographics function
  const calculateDemographics = async () => {
    try {
      const downloadsSnapshot = await getDocs(collection(db, 'downloads'));
      const uniqueUserIds = new Set<string>();
      const ages: number[] = [];
      const ageRanges: Record<string, number> = {
        "Under 18": 0,
        "18-24": 0,
        "25-34": 0,
        "35-44": 0,
        "45+": 0
      };
      const genders: Record<string, number> = {
        "Male": 0,
        "Female": 0,
        "Non-Binary": 0,
        "Not Specified": 0
      };
      const genres: Record<string, number> = {};

      // Collect all unique user IDs and fetch their data
      const userPromises = Array.from(
        new Set(downloadsSnapshot.docs.map(doc => doc.data().userId))
      ).map(async userId => {
        if (!userId) return;
        
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        
        if (userData) {
          uniqueUserIds.add(userId);

          // Process age
          if (userData.dateOfBirth) {
            const age = calculateAge(userData.dateOfBirth);
            ages.push(age);
            
            if (age < 18) ageRanges["Under 18"]++;
            else if (age <= 24) ageRanges["18-24"]++;
            else if (age <= 34) ageRanges["25-34"]++;
            else if (age <= 44) ageRanges["35-44"]++;
            else ageRanges["45+"]++;
          }

          // Process gender with normalized values
          if (userData.gender) {
            const normalizedGender = userData.gender.toLowerCase().trim();
            switch (normalizedGender) {
              case 'male':
                genders['Male']++;
                break;
              case 'female':
                genders['Female']++;
                break;
              case 'non-binary':
              case 'nonbinary':
                genders['Non-Binary']++;
                break;
              default:
                genders['Not Specified']++;
            }
          } else {
            genders['Not Specified']++;
          }

          // Process favorite genre
          if (userData.favoriteGenre) {
            genres[userData.favoriteGenre] = (genres[userData.favoriteGenre] || 0) + 1;
          }
        }
      });

      await Promise.all(userPromises);

      // Calculate average age
      const averageAge = ages.length > 0 
        ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) 
        : 0;

      // Remove gender categories with zero count
      const cleanedGenders = Object.fromEntries(
        Object.entries(genders).filter(([_, count]) => count > 0)
      );

      setDemographicStats({
        totalUniqueUsers: uniqueUserIds.size,
        ageStats: {
          average: averageAge,
          ranges: ageRanges
        },
        genderDistribution: cleanedGenders,
        genrePreferences: genres
      });
    } catch (error) {
      console.error('Error calculating demographics:', error);
    }
  };

  // Add helper function to calculate age
  const calculateAge = (dateOfBirth: string): number => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Add useEffect to calculate demographics when component mounts
  useEffect(() => {
    calculateDemographics();
  }, []);

  // Sort media items by download count, but include all items even with zero downloads
  const sortedMediaItems = Object.entries(downloadMetrics.downloadsByMedia)
    .sort(([, a], [, b]) => b.downloadCount - a.downloadCount);

  // Add function to fetch user details for downloads
  const fetchUserDownloadDetails = async (mediaKey: string, item: DetailedDownloadMetrics['downloadsByMedia'][string]) => {
    setIsLoadingUsers(true);
    try {
      const downloadsSnapshot = await getDocs(
        query(
          collection(db, 'downloads'),
          where('postId', '==', item.postId),
          where('mediaIndex', '==', parseInt(mediaKey.split('-')[1])),
          orderBy('downloadedAt', 'desc')
        )
      );

      const userDownloads: UserDownloadDetails[] = [];
      const userPromises = downloadsSnapshot.docs.map(async (downloadDoc) => {
        const downloadData = downloadDoc.data();
        if (!downloadData.userId) return null;

        // Fetch user details
        const userDoc = await getDoc(doc(db, 'users', downloadData.userId));
        const userData = userDoc.data();

        // Calculate age if dateOfBirth exists
        let age: number | undefined;
        if (userData?.dateOfBirth) {
          const birthDate = new Date(userData.dateOfBirth);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        return {
          userId: downloadData.userId,
          downloadedAt: downloadData.downloadedAt,
          username: userData?.username,
          photoURL: userData?.photoURL,
          displayName: userData?.displayName,
          dateOfBirth: userData?.dateOfBirth,
          gender: userData?.gender,
          favoriteGenre: userData?.favoriteGenre,
          age
        };
      });

      const resolvedUsers = await Promise.all(userPromises);
      resolvedUsers.forEach(user => {
        if (user) userDownloads.push(user);
      });

      setSelectedMedia({
        mediaKey,
        item,
        downloads: userDownloads
      });
    } catch (error) {
      console.error('Error fetching user download details:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Add this function to calculate percentage
  const calculatePercentage = (count: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  };

  // Add this function to calculate share statistics
  const calculateShareStats = (shares: UserShareDetails[]): DemographicStats => {
    const stats: DemographicStats = {
      totalUniqueUsers: new Set(shares.map(share => share.userId)).size,
      ageStats: {
        average: 0,
        ranges: {
          'Under 18': 0,
          '18-24': 0,
          '25-34': 0,
          '35-44': 0,
          '45+': 0
        }
      },
      genderDistribution: {},
      genrePreferences: {}
    };

    // Calculate age statistics
    const ages = shares.filter(share => share.age).map(share => share.age as number);
    if (ages.length > 0) {
      stats.ageStats.average = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    }

    // Calculate age ranges
    shares.forEach(share => {
      if (share.age) {
        if (share.age < 18) stats.ageStats.ranges['Under 18']++;
        else if (share.age <= 24) stats.ageStats.ranges['18-24']++;
        else if (share.age <= 34) stats.ageStats.ranges['25-34']++;
        else if (share.age <= 44) stats.ageStats.ranges['35-44']++;
        else stats.ageStats.ranges['45+']++;
      }
    });

    // Calculate gender distribution
    shares.forEach(share => {
      if (share.gender) {
        stats.genderDistribution[share.gender] = (stats.genderDistribution[share.gender] || 0) + 1;
      } else {
        stats.genderDistribution['Not Specified'] = (stats.genderDistribution['Not Specified'] || 0) + 1;
      }
    });

    // Calculate genre preferences
    shares.forEach(share => {
      if (share.favoriteGenre) {
        stats.genrePreferences[share.favoriteGenre] = (stats.genrePreferences[share.favoriteGenre] || 0) + 1;
      }
    });

    return stats;
  };

  // Update the fetchShareUserDetails function
  const fetchShareUserDetails = async (mediaKey: string, item: DetailedShareMetrics['sharesByMedia'][string]) => {
    setIsLoadingUsers(true);
    try {
      const sharesQuery = query(
        collection(db, 'messages'),
        where('type', '==', 'shared_post'),
        where('postId', '==', item.postId),
        where('mediaIndex', '==', parseInt(mediaKey.split('-')[1]) || 0)
      );
      const sharesSnapshot = await getDocs(sharesQuery);
      
      const shareDetails = await Promise.all(
        sharesSnapshot.docs.map(async (shareDoc) => {
          const shareData = shareDoc.data();
          if (shareData.senderId === 'instagram') return null;
          
          const userDoc = await getDoc(doc(db, 'users', shareData.senderId));
          const userData = userDoc.data();
          
          if (!userData) return null;

          // Improved age calculation
          let age = null;
          if (userData.dateOfBirth) {
            const dob = new Date(userData.dateOfBirth);
            const today = new Date();
            age = today.getFullYear() - dob.getFullYear();
            // Adjust age if birthday hasn't occurred this year
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
              age--;
            }
          }

          return {
            userId: shareData.senderId,
            sharedAt: shareData.timestamp,
            username: userData.username,
            photoURL: userData.photoURL,
            displayName: userData.displayName,
            dateOfBirth: userData.dateOfBirth,
            gender: userData.gender,
            favoriteGenre: userData.favoriteGenre,
            age
          };
        })
      );

      const validShareDetails = shareDetails.filter((share): share is UserShareDetails => 
        share !== null && share.age !== null
      );

      // Calculate statistics with improved age handling
      const stats: DemographicStats = {
        totalUniqueUsers: new Set(validShareDetails.map(share => share.userId)).size,
        ageStats: {
          average: 0,
          ranges: {
            'Under 18': 0,
            '18-24': 0,
            '25-34': 0,
            '35-44': 0,
            '45+': 0
          }
        },
        genderDistribution: {},
        genrePreferences: {}
      };

      // Calculate age statistics
      const validAges = validShareDetails
        .map(share => share.age!)
        .filter(age => typeof age === 'number' && !isNaN(age));

      if (validAges.length > 0) {
        stats.ageStats.average = Math.round(
          validAges.reduce((sum, age) => sum + age, 0) / validAges.length
        );

        // Update age ranges
        validShareDetails.forEach(share => {
          const age = share.age!;
          if (age < 18) stats.ageStats.ranges['Under 18']++;
          else if (age <= 24) stats.ageStats.ranges['18-24']++;
          else if (age <= 34) stats.ageStats.ranges['25-34']++;
          else if (age <= 44) stats.ageStats.ranges['35-44']++;
          else stats.ageStats.ranges['45+']++;
        });
      }

      // Rest of the statistics calculations...
      setShareStats(stats);
      setSelectedShareMedia({
        mediaKey,
        item,
        shares: validShareDetails
      });
    } catch (error) {
      console.error('Error fetching share details:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Update the useEffect for overall share statistics
  useEffect(() => {
    const calculateOverallShareStats = async () => {
      try {
        const sharesQuery = query(collection(db, 'messages'), where('type', '==', 'shared_post'));
        const sharesSnapshot = await getDocs(sharesQuery);
        
        const userIds = new Set(
          sharesSnapshot.docs
            .map(doc => doc.data().senderId)
            .filter(id => id !== 'instagram')
        );

        const userDetails = await Promise.all(
          Array.from(userIds).map(async (userId) => {
            const userDoc = await getDoc(doc(db, 'users', userId));
            const userData = userDoc.data();
            
            if (!userData) return null;

            // Calculate age with the same improved logic
            let age = null;
            if (userData.dateOfBirth) {
              const dob = new Date(userData.dateOfBirth);
              const today = new Date();
              age = today.getFullYear() - dob.getFullYear();
              const m = today.getMonth() - dob.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                age--;
              }
            }

            return {
              userId,
              age,
              gender: userData.gender,
              favoriteGenre: userData.favoriteGenre
            };
          })
        );

        const validUserDetails = userDetails.filter((user): user is UserShareDetails => 
          user !== null && user.age !== null
        );

        const stats = calculateShareStats(validUserDetails);
        setShareStats(stats);
      } catch (error) {
        console.error('Error calculating overall share stats:', error);
      }
    };

    calculateOverallShareStats();
  }, []);

  // Add click handler for share rows
  const handleShareRowClick = (mediaKey: string, item: DetailedShareMetrics['sharesByMedia'][string]) => {
    fetchShareUserDetails(mediaKey, item);
  };

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

      <BusinessSidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={auth.currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={accessibleFestivalsCount}
      />

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 py-8 relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-64 md:w-96 h-64 md:h-96 bg-white rounded-full blur-3xl opacity-20 -top-20 -left-20 animate-pulse"></div>
          <div className="absolute w-64 md:w-96 h-64 md:h-96 bg-white rounded-full blur-3xl opacity-20 -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Content */}
        <div className="relative">
          {/* View Mode Toggle */}
          <div className="mb-8 flex justify-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-full p-1 inline-flex shadow-sm border border-purple-100">
              <button
                onClick={() => setViewMode('downloads')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === 'downloads'
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-600 hover:text-purple-500'
                }`}
              >
                Downloads
              </button>
              <button
                onClick={() => setViewMode('shares')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  viewMode === 'shares'
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-600 hover:text-purple-500'
                }`}
              >
                Shares
              </button>
            </div>
          </div>

          {viewMode === 'downloads' ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-purple-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Total Downloads</h3>
                  <p className="text-2xl font-bold text-gray-900">{downloadMetrics.totalDownloads}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-purple-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Image Downloads</h3>
                  <p className="text-2xl font-bold text-gray-900">{downloadMetrics.imageDownloads}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-purple-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Video Downloads</h3>
                  <p className="text-2xl font-bold text-gray-900">{downloadMetrics.videoDownloads}</p>
                </div>
              </div>

              {/* New Demographics Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Audience Demographics</h2>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Age & Gender */}
                    <div className="space-y-6">
                      {/* Total Users Card */}
                      <div className="bg-purple-50/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Total Unique Users</h3>
                          <span className="text-2xl font-bold text-purple-600">
                            {demographicStats.totalUniqueUsers}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-purple-100 rounded-full"></div>
                      </div>

                      {/* Age Distribution Card */}
                      <div className="bg-purple-50/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Age Distribution</h3>
                          <span className="text-lg font-medium text-purple-600">
                            Avg: {demographicStats.ageStats.average}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {Object.entries(demographicStats.ageStats.ranges).map(([range, count]) => (
                            <div key={range}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">{range}</span>
                                <span className="text-gray-900 font-medium">
                                  {count} ({calculatePercentage(count, demographicStats.totalUniqueUsers)})
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                  style={{ 
                                    width: calculatePercentage(count, demographicStats.totalUniqueUsers),
                                    opacity: 0.8 
                                  }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Gender & Music Preferences */}
                    <div className="space-y-6">
                      {/* Gender Distribution Card */}
                      <div className="bg-purple-50/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
                        <div className="space-y-3">
                          {Object.entries(demographicStats.genderDistribution)
                            .sort(([,a], [,b]) => b - a)
                            .map(([gender, count]) => (
                              <div key={gender}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-600">{gender}</span>
                                  <span className="text-gray-900 font-medium">
                                    {count} ({calculatePercentage(count, demographicStats.totalUniqueUsers)})
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                    style={{ 
                                      width: calculatePercentage(count, demographicStats.totalUniqueUsers),
                                      opacity: 0.8 
                                    }}
                                  ></div>
                                </div>
                              </div>
                          ))}
                        </div>
                      </div>

                      {/* Music Preferences Card */}
                      <div className="bg-purple-50/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Music Genres</h3>
                        <div className="space-y-3">
                          {Object.entries(demographicStats.genrePreferences)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 5)
                            .map(([genre, count]) => (
                              <div key={genre}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-600">{genre}</span>
                                  <span className="text-gray-900 font-medium">
                                    {count} ({calculatePercentage(count, demographicStats.totalUniqueUsers)})
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                    style={{ 
                                      width: calculatePercentage(count, demographicStats.totalUniqueUsers),
                                      opacity: 0.8 
                                    }}
                                  ></div>
                                </div>
                              </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Downloads Table */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Downloads by Media</h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50/50">
                        {['Preview', 'Media Type', 'Category', 'Festival', 'Downloads', 'Last Downloaded'].map((header) => (
                          <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedMediaItems.map(([key, item]) => (
                        <tr 
                          key={key} 
                          className="hover:bg-purple-50/30 transition-colors duration-200 cursor-pointer" 
                          onClick={() => fetchUserDownloadDetails(key, item)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-purple-100">
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
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {item.mediaType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {categories[item.categoryId || ''] || 'Uncategorized'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {festivals[item.festivalId] || 'Loading...'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {Math.round(item.downloadCount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.downloadedAt?.toDate().toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {sortedMediaItems.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No downloads to display yet</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-purple-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Total Shares</h3>
                  <p className="text-2xl font-bold text-gray-900">{shareMetrics.totalShares}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-purple-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Image Shares</h3>
                  <p className="text-2xl font-bold text-gray-900">{shareMetrics.imageShares}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-purple-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Video Shares</h3>
                  <p className="text-2xl font-bold text-gray-900">{shareMetrics.videoShares}</p>
                </div>
              </div>

              {/* Demographics Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100 overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Audience Demographics</h2>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Age & Gender */}
                    <div className="space-y-6">
                      {/* Total Users Card */}
                      <div className="bg-purple-50/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Total Unique Users</h3>
                          <span className="text-2xl font-bold text-purple-600">
                            {shareStats.totalUniqueUsers}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-purple-100 rounded-full"></div>
                      </div>

                      {/* Age Distribution Card */}
                      <div className="bg-purple-50/50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Age Distribution</h3>
                          <span className="text-lg font-medium text-purple-600">
                            Avg: {shareStats.ageStats.average}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {Object.entries(shareStats.ageStats.ranges).map(([range, count]) => (
                            <div key={range}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">{range}</span>
                                <span className="text-gray-900 font-medium">
                                  {count} ({calculatePercentage(count, shareStats.totalUniqueUsers)})
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                  style={{ 
                                    width: calculatePercentage(count, shareStats.totalUniqueUsers),
                                    opacity: 0.8 
                                  }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Gender & Music Preferences */}
                    <div className="space-y-6">
                      {/* Gender Distribution Card */}
                      <div className="bg-purple-50/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
                        <div className="space-y-3">
                          {Object.entries(shareStats.genderDistribution)
                            .sort(([,a], [,b]) => b - a)
                            .map(([gender, count]) => (
                              <div key={gender}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-600">{gender}</span>
                                  <span className="text-gray-900 font-medium">
                                    {count} ({calculatePercentage(count, shareStats.totalUniqueUsers)})
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                    style={{ 
                                      width: calculatePercentage(count, shareStats.totalUniqueUsers),
                                      opacity: 0.8 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Music Preferences Card */}
                      <div className="bg-purple-50/50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Music Genres</h3>
                        <div className="space-y-3">
                          {Object.entries(shareStats.genrePreferences)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 5)
                            .map(([genre, count]) => (
                              <div key={genre}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-600">{genre}</span>
                                  <span className="text-gray-900 font-medium">
                                    {count} ({calculatePercentage(count, shareStats.totalUniqueUsers)})
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                    style={{ 
                                      width: calculatePercentage(count, shareStats.totalUniqueUsers),
                                      opacity: 0.8 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shares by Media Table */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900">Shares by Media</h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50/50">
                        {['Preview', 'Media Type', 'Category', 'Festival', 'Shares', 'Last Shared'].map((header) => (
                          <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(shareMetrics.sharesByMedia)
                        .sort(([, a], [, b]) => b.shareCount - a.shareCount)
                        .map(([key, item]) => (
                          <tr 
                            key={key} 
                            className="hover:bg-purple-50/30 transition-colors duration-200 cursor-pointer"
                            onClick={() => handleShareRowClick(key, item)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-purple-100">
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
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {item.mediaType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {categories[item.categoryId || ''] || 'Uncategorized'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {festivals[item.festivalId] || 'Loading...'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">
                                {Math.round(item.shareCount)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {item.sharedAt?.toDate().toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>

                  {Object.keys(shareMetrics.sharesByMedia).length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No shares to display yet</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Modal for showing user downloads */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Download Details</h2>
              <button
                onClick={() => setSelectedMedia(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Media Preview */}
              <div className="mb-6 flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border border-purple-100">
                  {selectedMedia.item.mediaType === 'video' ? (
                    <video
                      src={selectedMedia.item.url}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLVideoElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <img
                      src={selectedMedia.item.url}
                      alt="Media preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Festival</p>
                  <p className="font-medium">{festivals[selectedMedia.item.festivalId] || 'Loading...'}</p>
                  <p className="text-sm text-gray-500 mt-1">Category</p>
                  <p className="font-medium">{categories[selectedMedia.item.categoryId || ''] || 'Uncategorized'}</p>
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {isLoadingUsers ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading users...</p>
                  </div>
                ) : selectedMedia.downloads.length > 0 ? (
                  selectedMedia.downloads.map((download, index) => (
                    <div 
                      key={`${download.userId}-${index}`}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      {download.photoURL ? (
                        <img 
                          src={download.photoURL} 
                          alt={download.displayName || 'User'} 
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-medium">
                            {(download.displayName || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-grow">
                        <p className="font-medium">{download.displayName || 'Anonymous User'}</p>
                        {download.username && (
                          <p className="text-sm text-gray-500">@{download.username}</p>
                        )}
                        <div className="mt-1 space-y-1">
                          {download.age && (
                            <p className="text-sm text-gray-500">
                              Age: {download.age}
                            </p>
                          )}
                          {download.gender && (
                            <p className="text-sm text-gray-500">
                              Gender: {download.gender}
                            </p>
                          )}
                          {download.favoriteGenre && (
                            <p className="text-sm text-gray-500">
                              Favorite Genre: {download.favoriteGenre}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {download.downloadedAt?.toDate().toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No download details available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add the share details modal */}
      {selectedShareMedia && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Share Details</h2>
              <button
                onClick={() => setSelectedShareMedia(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Audience Demographics Section */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">Audience Demographics</h3>
                
                {/* Total Unique Users */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
                  <h4 className="text-lg font-semibold mb-2">Total Unique Users</h4>
                  <p className="text-3xl font-bold text-purple-600">{shareStats.totalUniqueUsers}</p>
                </div>

                {/* Age Distribution */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold">Age Distribution</h4>
                    <span className="text-purple-600 font-semibold">
                      Avg: {shareStats.ageStats.average}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(shareStats.ageStats.ranges).map(([range, count]) => (
                      <div key={range} className="flex justify-between items-center">
                        <span>{range}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-purple-500 h-2 rounded-full"
                              style={{
                                width: `${(count / shareStats.totalUniqueUsers) * 100}%`
                              }}
                            />
                          </div>
                          <span>{count} ({calculatePercentage(count, shareStats.totalUniqueUsers)})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gender Distribution */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
                  <h4 className="text-lg font-semibold mb-4">Gender Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(shareStats.genderDistribution).map(([gender, count]) => (
                      <div key={gender} className="flex justify-between items-center">
                        <span>{gender}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-purple-500 h-2 rounded-full"
                              style={{
                                width: `${(count / shareStats.totalUniqueUsers) * 100}%`
                              }}
                            />
                          </div>
                          <span>{count} ({calculatePercentage(count, shareStats.totalUniqueUsers)})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Music Genres */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100">
                  <h4 className="text-lg font-semibold mb-4">Top Music Genres</h4>
                  <div className="space-y-2">
                    {Object.entries(shareStats.genrePreferences)
                      .sort(([,a], [,b]) => b - a)
                      .map(([genre, count]) => (
                        <div key={genre} className="flex justify-between items-center">
                          <span>{genre}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{
                                  width: `${(count / shareStats.totalUniqueUsers) * 100}%`
                                }}
                              />
                            </div>
                            <span>{count} ({calculatePercentage(count, shareStats.totalUniqueUsers)})</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* User List Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Share Details</h3>
                {/* ... existing user list code ... */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDashboard; 