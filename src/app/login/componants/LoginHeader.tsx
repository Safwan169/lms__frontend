import { Lock } from "lucide-react";

// Header Component
export const LoginHeader: React.FC = () => (
  <div className="text-center mb-8">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
      <Lock className="w-8 h-8 text-white" />
    </div>
    <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
      Welcome Back
    </h2>
    <p className="text-gray-500 mt-2">Sign in to continue your journey</p>
  </div>
);