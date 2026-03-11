"use client";
import { useGetProfileQuery } from "@/features/user/userApi";

export default function ClientProfile() {
  const { data: profile, isLoading } = useGetProfileQuery();

  if (isLoading) return <p>Loading...</p>;
  if (!profile) return <p>No profile found</p>;

  return (
    <div>
      <h1>Welcome, {profile.name}</h1>
      <p>Email: {profile.email}</p>
    </div>
  );
}
