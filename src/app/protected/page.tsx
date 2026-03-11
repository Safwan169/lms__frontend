// src/app/protected/page.tsx
import Protected from "@/components/auth/Protected";

export default function ProtectedPage() {
  return (
    <Protected>
      <div className="p-6">
        <h1>Protected content</h1>
      </div>
    </Protected>
  );
}
