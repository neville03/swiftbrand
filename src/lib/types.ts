export interface BrandFoundation {
  user_id: string;
  full_name: string | null;
  role: string | null;
  industry: string | null;
  target_audience: string | null;
  brand_voice: string | null;
  key_topics: string[] | null;
  self_description: string | null;
  updated_at?: string;
}

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: string;
  platform_user_id: string | null;
  platform_user_name: string | null;
  platform_user_picture: string | null;
  access_token: string;
  expires_at: string | null;
}

export type PostStatus = "draft" | "publishing" | "published" | "failed";

export interface Post {
  id: string;
  user_id: string;
  caption: string;
  flyer_path: string | null;
  status: PostStatus;
  ayrshare_post_id: string | null;
  linkedin_url: string | null;
  error_message: string | null;
  published_at: string | null;
  created_at: string;
}

export interface PostMetrics {
  id: string;
  post_id: string;
  likes: number;
  comments: number;
  impressions: number;
  shares: number;
  fetched_at: string;
}

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  created_at: string;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

export interface BrandKit {
  user_id: string;
  primary_color: string;
  accent_color: string;
  success_color: string;
  bg_color: string;
  heading_font: string;
  body_font: string;
  updated_at?: string;
}

export interface BrandKitAsset {
  id: string;
  user_id: string;
  kind: "logo" | "video";
  name: string;
  path: string;
  tag: string | null;
  created_at: string;
}