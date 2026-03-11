// src/components/ui/Toast.tsx
import { ToastProps } from "@/types/Toast";
import { toast } from "sonner";

export const showCustomToast = (data: ToastProps) => {
  const id = toast(
    <div className="flex justify-between border w-full border-red-700 items-start">
      <div>
        <h4 className="font-semibold text-sm">{data.title}</h4>
        <p className="text-xs text-gray-600">
         {data.description}
        </p>
      </div>
      <button
        onClick={() => toast.dismiss(id)} 
        className="ml-4 text-gray-400 hover:text-gray-700"
      >
        ✕
      </button>
    </div>,
    {
      position: "top-right",
      duration: 4000,
    }
  );
};