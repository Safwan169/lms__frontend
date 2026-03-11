import { AlertCircle } from "lucide-react";
import React from "react";



export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  type,
  placeholder,
  icon,
  error,
  register,
  focused,
  onFocus,
  onBlur,
  rightAction
}) => {
  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {React.cloneElement(icon as React.ReactElement<any>, {
            className: `w-5 h-5 transition-colors duration-300 ${
              focused ? 'text-violet-500' : error ? 'text-red-500' : 'text-gray-400'
            }`
          })}
        </div>
        <input
          id={id}
          type={type}
          {...register}
          onFocus={onFocus}
          onBlur={onBlur}
          className={`w-full pl-12 ${rightAction ? 'pr-12' : 'pr-4'} py-3 bg-gray-50 border-2 rounded-xl focus:outline-none focus:bg-white transition-all duration-300 text-gray-700 ${
            error 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-200 focus:border-violet-500'
          }`}
          placeholder={placeholder}
        />
        {rightAction && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            {rightAction}
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1 mt-2 text-red-500 text-sm animate-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};