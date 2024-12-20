import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';  // Make sure this import path is correct

export const trackDownload = async (
  postId: string,
  mediaType: 'image' | 'video',
  mediaIndex: number,
  festivalId: string,
  categoryId?: string
) => {
  try {
    // Get user's location (you might want to use a geolocation service)
    const locationResponse = await fetch('https://ipapi.co/json/');
    const locationData = await locationResponse.json();

    const downloadData = {
      postId,
      mediaType,
      mediaIndex,
      downloadedAt: serverTimestamp(),
      userId: auth.currentUser?.uid,
      festivalId,
      categoryId,
      location: {
        country: locationData.country_name,
        city: locationData.city
      }
    };

    await addDoc(collection(db, 'downloads'), downloadData);
  } catch (error) {
    console.error('Error tracking download:', error);
  }
}; 