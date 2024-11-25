import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "../firebase";

interface MediaFile {
  file: File;
  type: "image" | "video";
  progress: number;
  url?: string;
}

const AddPost: React.FC = () => {
  const [text, setText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

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
    if (!user) return;

    try {
      // Only include successfully uploaded files
      const uploadedFiles = mediaFiles
        .filter(file => file.url)
        .map(file => ({
          url: file.url!,
          type: file.type
        }));

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        text,
        mediaFiles: uploadedFiles,
        createdAt: serverTimestamp(),
      });

      setText("");
      setMediaFiles([]);
      navigate("/");
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-post p-4 mx-auto max-w-2xl">
      <h2 className="text-2xl font-bold mb-4 text-center">Create a New Post</h2>
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
