import React from 'react'

export default function SinglePostView() {
  return (
    <div>SinglePostView</div>
  )
}


// import React, { useState, useEffect } from 'react';
// import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
// import { db, auth } from '../firebase';
// import { Post } from '../types';
// import { Heart, MessageCircle, Send } from 'lucide-react';

// interface SinglePostViewProps {
//   postId: string;
// }

// const SinglePostView: React.FC<SinglePostViewProps> = ({ postId }) => {
//   const [post, setPost] = useState<Post | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [commentText, setCommentText] = useState('');
//   const [showComments, setShowComments] = useState(false);
//   const user = auth.currentUser;

//   useEffect(() => {
//     const fetchPost = async () => {
//       try {
//         const postDoc = await getDoc(doc(db, "discover_posts", postId));
//         if (postDoc.exists()) {
//           setPost({ id: postDoc.id, ...postDoc.data() } as Post);
//         }
//       } catch (error) {
//         console.error("Error fetching post:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchPost();
//   }, [postId]);

//   const handleLike = async () => {
//     if (!user || !post) return;

//     const postRef = doc(db, "discover_posts", postId);
//     const likes = post.likes || [];

//     if (likes.includes(user.uid)) {
//       await updateDoc(postRef, {
//         likes: arrayRemove(user.uid)
//       });
//       setPost(prev => prev ? { ...prev, likes: likes.filter(id => id !== user.uid) } : null);
//     } else {
//       await updateDoc(postRef, {
//         likes: arrayUnion(user.uid)
//       });
//       setPost(prev => prev ? { ...prev, likes: [...likes, user.uid] } : null);
//     }
//   };

//   const handleComment = async () => {
//     if (!user || !post || !commentText.trim()) return;

//     try {
//       const postRef = doc(db, "discover_posts", postId);
//       const newComment = {
//         id: Math.random().toString(36).substr(2, 9),
//         text: commentText.trim(),
//         userId: user.uid,
//         userDisplayName: user.displayName || 'Anonymous',
//         userPhotoURL: user.photoURL,
//         createdAt: new Date().toISOString(),
//         likes: []
//       };

//       const currentComments = post.comments || [];
//       await updateDoc(postRef, {
//         comments: [...currentComments, newComment]
//       });

//       setPost(prev => prev ? {
//         ...prev,
//         comments: [...prev.comments, newComment]
//       } : null);
//       setCommentText('');
//     } catch (error) {
//       console.error("Error adding comment:", error);
//     }
//   };

//   const handleCommentLike = async (commentId: string) => {
//     if (!user || !post) return;

//     try {
//       const comments = [...post.comments];
//       const commentIndex = comments.findIndex(c => c.id === commentId);
//       if (commentIndex === -1) return;

//       const comment = comments[commentIndex];
//       const likes = comment.likes || [];
      
//       if (likes.includes(user.uid)) {
//         likes.splice(likes.indexOf(user.uid), 1);
//       } else {
//         likes.push(user.uid);
//       }

//       comments[commentIndex] = { ...comment, likes };

//       await updateDoc(doc(db, "discover_posts", postId), { comments });
//       setPost(prev => prev ? { ...prev, comments } : null);
//     } catch (error) {
//       console.error("Error liking comment:", error);
//     }
//   };

//   if (loading || !post) {
//     return <div className="p-4 text-center">Loading...</div>;
//   }

//   return (
//     <div className="max-w-lg mx-auto p-4 max-h-[80vh] overflow-y-auto">
//       {/* Post Header */}
//       <div className="flex items-center gap-3 mb-4">
//         {post.userPhotoURL ? (
//           <img
//             src={post.userPhotoURL}
//             alt={post.userDisplayName}
//             className="w-8 h-8 rounded-full"
//           />
//         ) : (
//           <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
//             <span className="text-purple-600 text-sm font-medium">
//               {post.userDisplayName[0].toUpperCase()}
//             </span>
//           </div>
//         )}
//         <span className="font-medium">{post.userDisplayName}</span>
//       </div>

//       {/* Post Content */}
//       <p className="text-gray-800 text-sm mb-3">{post.text}</p>

//       {/* Media Content */}
//       {post.mediaFiles && post.mediaFiles.length > 0 && (
//         <div className="mb-3">
//           {post.mediaFiles.map((media, index) => (
//             <div key={index} className="relative rounded-lg overflow-hidden">
//               {media.type === 'image' ? (
//                 <img
//                   src={media.url}
//                   alt="Post content"
//                   className="w-full max-h-[300px] object-cover"
//                 />
//               ) : (
//                 <video
//                   src={media.url}
//                   controls
//                   className="w-full max-h-[300px] object-cover"
//                 />
//               )}
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Post Actions */}
//       <div className="flex items-center gap-4 mb-3 border-t border-b py-2">
//         <button
//           onClick={handleLike}
//           className="flex items-center gap-1 text-gray-500 hover:text-purple-600"
//         >
//           <Heart
//             size={18}
//             className={user && post.likes.includes(user.uid) ? "fill-purple-600 text-purple-600" : ""}
//           />
//           <span className="text-sm">{post.likes.length}</span>
//         </button>
//         <button
//           onClick={() => setShowComments(!showComments)}
//           className="flex items-center gap-1 text-gray-500 hover:text-purple-600"
//         >
//           <MessageCircle size={18} />
//           <span className="text-sm">{post.comments.length}</span>
//         </button>
//       </div>

//       {/* Comments Section */}
//       <div className="space-y-2 max-h-[200px] overflow-y-auto">
//         {post.comments.map((comment) => (
//           <div key={comment.id} className="flex items-start gap-2 bg-gray-50 p-2 rounded-lg text-sm">
//             <div className="flex-shrink-0">
//               {comment.userPhotoURL ? (
//                 <img
//                   src={comment.userPhotoURL}
//                   alt={comment.userDisplayName}
//                   className="w-6 h-6 rounded-full"
//                 />
//               ) : (
//                 <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
//                   <span className="text-purple-600 text-xs font-medium">
//                     {comment.userDisplayName[0].toUpperCase()}
//                   </span>
//                 </div>
//               )}
//             </div>
//             <div className="flex-grow min-w-0">
//               <div className="flex justify-between items-start gap-2">
//                 <div className="truncate">
//                   <span className="font-medium text-xs">{comment.userDisplayName}</span>
//                   <p className="text-gray-800">{comment.text}</p>
//                 </div>
//                 <button
//                   onClick={() => handleCommentLike(comment.id)}
//                   className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 
//                             transition-colors flex-shrink-0"
//                 >
//                   <Heart
//                     size={12}
//                     className={user && comment.likes?.includes(user.uid) 
//                       ? "fill-purple-600 text-purple-600" 
//                       : ""
//                     }
//                   />
//                   <span>{comment.likes?.length || 0}</span>
//                 </button>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Add Comment */}
//       <div className="flex gap-2 mt-3 sticky bottom-0 bg-white py-2">
//         <input
//           type="text"
//           value={commentText}
//           onChange={(e) => setCommentText(e.target.value)}
//           placeholder="Add a comment..."
//           className="flex-grow p-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
//           onKeyPress={(e) => {
//             if (e.key === 'Enter' && !e.shiftKey) {
//               e.preventDefault();
//               handleComment();
//             }
//           }}
//         />
//         <button
//           onClick={handleComment}
//           disabled={!commentText.trim()}
//           className="p-2 text-purple-600 hover:text-purple-700 disabled:opacity-50"
//         >
//           <Send size={18} />
//         </button>
//       </div>
//     </div>
//   );
// };

// export default SinglePostView; 