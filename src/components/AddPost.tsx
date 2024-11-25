import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

const AddPost: React.FC = () => {
  const [text, setText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<{ file: File; type: "image" | "video" }[]>([]);
  const navigate = useNavigate();

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        type: file.type.startsWith('image/') ? 'image' : 'video'
      }));
      setMediaFiles(prev => [...prev, ...newFiles]);
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
      const mediaUrls = await Promise.all(
        mediaFiles.map(async ({ file, type }) => {
          const mediaRef = ref(storage, `posts/${user.uid}/${Date.now()}_${type}`);
          await uploadBytes(mediaRef, file);
          const url = await getDownloadURL(mediaRef);
          return { url, type };
        })
      );

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        text,
        mediaFiles: mediaUrls,
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
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Post
      </button>
    </form>
  );
};

export default AddPost;
