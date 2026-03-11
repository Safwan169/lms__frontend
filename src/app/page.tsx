// src/app/page.tsx

import ClientProfile from "@/components/client/ClientProfile";
import DialogExample from "@/components/DialogExample";
import Link from "next/link";

export default function HomePage() {



  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Next.js Boilerplate</h1>
      <section className="mt-6">
        <h2 className="text-xl">RTK Query - Profile</h2>

      </section>
      <ClientProfile />
      <section className="mt-6">
        <h2 className="text-xl">TanStack Query - Stats</h2>
       < DialogExample />
       <Link className="bg-red-500 " href={'/login'}>login </Link>
      </section>
    </main>
  );
}
