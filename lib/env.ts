const required = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_CENTRALAUTH_APP_URL: process.env.NEXT_PUBLIC_CENTRALAUTH_APP_URL,
  NEXT_PUBLIC_CENTRALAUTH_API_URL: process.env.NEXT_PUBLIC_CENTRALAUTH_API_URL,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
};

for (const [key, value] of Object.entries(required)) {
  if (!value) {
    if (typeof window !== "undefined" || process.env.NODE_ENV !== "production") {
      throw new Error(`Missing required env: ${key}`);
    }
  }
}

export const env = {
  supabaseUrl: required.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: required.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  centralAuthAppUrl: required.NEXT_PUBLIC_CENTRALAUTH_APP_URL!.replace(/\/$/, ""),
  centralAuthApiUrl: required.NEXT_PUBLIC_CENTRALAUTH_API_URL!.replace(/\/$/, ""),
  cloudinaryCloudName: required.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  cloudinaryUploadPreset: required.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!,
};
