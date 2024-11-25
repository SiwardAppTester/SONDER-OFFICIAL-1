import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

const AddPost: React.FC = () => {
  const [text, setText] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const navigate = useNavigate();

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      setMediaType(type);
      setMedia(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    try {
      let mediaUrl = "";
      if (media) {
        const mediaRef = ref(storage, `posts/${user.uid}/${Date.now()}_${mediaType}`);
        await uploadBytes(mediaRef, media);
        mediaUrl = await getDownloadURL(mediaRef);
      }

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        text,
        mediaUrl,
        mediaType,
        createdAt: serverTimestamp(),
      });

      setText("");
      setMedia(null);
      setMediaType(null);
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
      />
      {media && mediaType === 'video' && (
        <video
          src={URL.createObjectURL(media)}
          className="w-full max-h-96 object-contain rounded-lg mb-4"
          controls
        />
      )}
      {media && mediaType === 'image' && (
        <img
          src={URL.createObjectURL(media)}
          alt="Preview"
          className="w-full max-h-96 object-contain rounded-lg mb-4"
        />
      )}
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Post
      </button>
    </form>
  );
};

export default AddPost;
