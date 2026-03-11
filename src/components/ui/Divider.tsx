// Divider Component
export const Divider: React.FC<{ text: string }> = ({ text }) => (
  <div className="relative my-8">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-200"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-4 bg-white text-gray-500">{text}</span>
    </div>
  </div>
);