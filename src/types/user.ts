interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  accessibleFestivals?: {
    festivalId: string;
    categoryIds: string[];
  }[];
} 