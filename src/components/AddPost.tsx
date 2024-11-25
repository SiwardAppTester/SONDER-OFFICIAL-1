import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "../firebase";

interface MediaFile {
  file: File;
  type: "image" | "video";
  progress: number;
  url?: string;
}

interface Festival {
  id: string;
  name: string;
  accessCode: string;
}

const AddPost: React.FC = () => {
  const [text, setText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [selectedFestival, setSelectedFestival] = useState<string>("");
  const [newFestivalName, setNewFestivalName] = useState("");
  const [newFestivalAccessCode, setNewFestivalAccessCode] = useState("");
  const [showAddFestival, setShowAddFestival] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFestivals();
  }, []);

  const fetchFestivals = async () => {
    try {
      const festivalsSnapshot = await getDocs(collection(db, "festivals"));
      const festivalsData = festivalsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        accessCode: doc.data().accessCode,
      }));
      setFestivals(festivalsData);
    } catch (error) {
      console.error("Error fetching festivals:", error);
    }
  };

  const handleAddFestival = async () => {
    if (!newFestivalName.trim()) {
      alert("Please enter a festival name");
      return;
    }
    if (!newFestivalAccessCode.trim()) {
      alert("Please enter an access code");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "festivals"), {
        name: newFestivalName.trim(),
        accessCode: newFestivalAccessCode.trim(),
        createdAt: serverTimestamp(),
      });
      
      const newFestival = { 
        id: docRef.id, 
        name: newFestivalName.trim(),
        accessCode: newFestivalAccessCode.trim()
      };
      
      setFestivals(prev => [...prev, newFestival]);
      setSelectedFestival(docRef.id);
      setNewFestivalName("");
      setNewFestivalAccessCode("");
      setShowAddFestival(false);

      const festivalDoc = await getDoc(doc(db, "festivals", docRef.id));
      if (!festivalDoc.exists()) {
        throw new Error("Festival was not saved properly");
      }

    } catch (error) {
      console.error("Error adding festival:", error);
      alert("Failed to create festival. Please try again.");
    }
  };

  const handleDeleteFestival = async (festivalId: string) => {
    if (!window.confirm("Are you sure you want to delete this festival?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "festivals", festivalId));
      setFestivals(prev => prev.filter(festival => festival.id !== festivalId));
      if (selectedFestival === festivalId) {
        setSelectedFestival("");
      }
    } catch (error) {
      console.error("Error deleting festival:", error);
      alert("Failed to delete festival. Please try again.");
    }
  };

  const uploadFile = async (file: File, type: "image" | "video", index: number) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const mediaRef = ref(storage, `posts/${user.uid}/${Date.now()}_${type}`);
    const uploadTask = uploadBytesResumable(mediaRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setMediaFiles(prev => prev.map((item, i) => 
          i === index ? { ...item, progress } : item
        ));
      },
      (error) => {
        console.error("Error uploading file:", error);
      },
      async () => {
        const url = await getDownloadURL(mediaRef);
        setMediaFiles(prev => prev.map((item, i) => 
          i === index ? { ...item, url } : item
        ));
        
        // Check if all files are uploaded
        setMediaFiles(prev => {
          const allUploaded = prev.every(file => file.url);
          if (allUploaded) {
            setIsUploading(false);
          }
          return prev;
        });
      }
    );
  };

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setIsUploading(true);
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        type: file.type.startsWith('image/') ? 'image' : 'video' as "image" | "video",
        progress: 0
      }));

      // Get current length before updating state
      const currentLength = mediaFiles.length;
      
      setMediaFiles(prev => [...prev, ...newFiles]);

      // Start uploading each file immediately using currentLength
      newFiles.forEach((file, index) => {
        uploadFile(file.file, file.type, currentLength + index);
      });
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;

    // Check if a festival is selected
    if (!selectedFestival) {
      alert("Please select a festival before posting");
      return;
    }

    // Check if user exists
    if (!user) {
      alert("You must be logged in to post");
      return;
    }

    // Check if there's either text or media content
    if (!text.trim() && mediaFiles.length === 0) {
      alert("Please add some content to your post");
      return;
    }

    try {
      const uploadedFiles = mediaFiles
        .filter(file => file.url)
        .map(file => ({
          url: file.url!,
          type: file.type
        }));

      // Add the post with festival reference
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        festivalId: selectedFestival,
        text,
        mediaFiles: uploadedFiles,
        createdAt: serverTimestamp(),
      });

      setText("");
      setMediaFiles([]);
      setSelectedFestival(""); // Reset festival selection after posting
      navigate("/");
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-post p-4 mx-auto max-w-2xl">
      <h2 className="text-2xl font-bold mb-4 text-center">Create a New Post</h2>

      {/* Festival Selection */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <select
            value={selectedFestival}
            onChange={(e) => setSelectedFestival(e.target.value)}
            className="w-3/4 p-2 border rounded"
            required
          >
            <option value="">Select a Festival</option>
            {festivals.map((festival) => (
              <option key={festival.id} value={festival.id}>
                {festival.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAddFestival(!showAddFestival)}
            className="text-blue-500 hover:text-blue-700"
          >
            {showAddFestival ? '- Hide' : '+ New Festival'}
          </button>
        </div>

        {showAddFestival && (
          <div className="mt-2 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <input
                type="text"
                value={newFestivalName}
                onChange={(e) => setNewFestivalName(e.target.value)}
                placeholder="Enter festival name"
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                value={newFestivalAccessCode}
                onChange={(e) => setNewFestivalAccessCode(e.target.value)}
                placeholder="Enter access code"
                className="w-full p-2 border rounded"
              />
              <button
                type="button"
                onClick={handleAddFestival}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Festival
              </button>
            </div>
            
            {/* Display existing festivals with delete option */}
            <div className="mt-4 space-y-2">
              {festivals.map((festival) => (
                <div
                  key={festival.id}
                  className="flex justify-between items-center p-2 bg-white rounded shadow"
                >
                  <div>
                    <span className="block">{festival.name}</span>
                    <span className="text-sm text-gray-500">
                      Access Code: {festival.accessCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteFestival(festival.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's on your mind?"
        className="w-full p-2 mb-4 border rounded"
      />
      <input
        type="file"
        onChange={handleMediaChange}
        accept="image/*,video/*"
        className="mb-4"
        multiple
      />
      <div className="media-preview grid grid-cols-2 gap-4 mb-4">
        {mediaFiles.map((media, index) => (
          <div key={index} className="relative">
            {media.type === 'video' ? (
              <video
                src={URL.createObjectURL(media.file)}
                className="w-full h-48 object-cover rounded-lg"
                controls
              />
            ) : (
              <img
                src={URL.createObjectURL(media.file)}
                alt={`Preview ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
              {media.url ? (
                "Upload complete"
              ) : (
                `Uploading: ${media.progress.toFixed(0)}%`
              )}
            </div>
            <button
              type="button"
              onClick={() => handleRemoveMedia(index)}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={isUploading}
        className={`w-full px-4 py-2 rounded ${
          isUploading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isUploading ? 'Uploading...' : 'Post'}
      </button>
    </form>
  );
};

export default AddPost;
