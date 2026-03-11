'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { InputField } from '@/components/ui/Field';
import { Divider } from '@/components/ui/Divider';
import { AnimatedBackground } from './componants/AnimatedHeader';
import { LoginHeader } from './componants/LoginHeader';
import { toast, Toaster } from "sonner"
import Link from 'next/link';
import { LoginFormData, loginSchema } from '@/schemas';
import { useLoginMutation } from '@/features/user/userApi';






interface SocialButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}



// Social Button Component
const SocialButton: React.FC<SocialButtonProps> = ({ icon, label, onClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-gray-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-all duration-300 group"
        >
            {icon}
            <span className="text-sm font-medium text-gray-700 group-hover:text-violet-600 transition-colors duration-300">
                {label}
            </span>
        </button>
    );
};

// Google Icon Component
const GoogleIcon: React.FC = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

// GitHub Icon Component
const GitHubIcon: React.FC = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
);





// Submit Button Component
const SubmitButton: React.FC<{ isLoading: boolean; onClick: () => void }> = ({ isLoading, onClick }) => (
    <button
        onClick={onClick}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
    >
        {isLoading ? (
            <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing in...
            </>
        ) : (
            <>
                Sign In
                <ArrowRight className="w-5 h-5" />
            </>
        )}
    </button>
);



// Main Login Form Component
const LoginForm: React.FC = () => {
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [focusedField, setFocusedField] = useState<string>('');
    const [loginUser, { isLoading: isLoadingLogin, isError }] = useLoginMutation();
    const {
        register,
        handleSubmit,
        formState: { errors }
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        mode: 'onChange',
        defaultValues: {
            email: '',
            password: '',
            rememberMe: false
        }
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);

        // await loginUser( data ).unwrap()
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('Login successful:', data);
        toast("Event has been created", {
            description: "Sunday, December 03, 2023 at 9:00 AM",
            position: "top-right",
            action: {
                label: "x",
                onClick: () => {
                   
                },
            },
        })
        setIsLoading(false);
    };

    const handleSocialLogin = (provider: string) => {
        console.log(`${provider} login clicked`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
            <AnimatedBackground />
            <div className="relative w-full max-w-md">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                    <LoginHeader />

                    <div className="space-y-6">
                        <InputField
                            id="email"
                            label="Email Address"
                            type="email"
                            placeholder="you@example.com"
                            icon={<Mail />}
                            error={errors.email?.message}
                            register={register('email')}
                            focused={focusedField === 'email'}
                            onFocus={() => setFocusedField('email')}
                            onBlur={() => setFocusedField('')}
                        />

                        <InputField
                            id="password"
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            icon={<Lock />}
                            error={errors.password?.message}
                            register={register('password')}
                            focused={focusedField === 'password'}
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField('')}
                            rightAction={
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="text-gray-400 hover:text-violet-500 transition-colors duration-300"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            }
                        />

                        <div className="flex items-center justify-between">
                            <label className="flex items-center cursor-pointer group">
                                <input
                                    type="checkbox"
                                    {...register('rememberMe')}
                                    className="w-4 h-4 text-violet-500 border-gray-300 rounded focus:ring-violet-500 focus:ring-2 transition-all duration-300"
                                />
                                <span className="ml-2 text-sm text-gray-600 group-hover:text-violet-600 transition-colors duration-300">
                                    Remember me
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={() => console.log('Forgot password clicked')}
                                className="text-sm text-violet-600 hover:text-purple-600 font-medium transition-colors duration-300"
                            >
                                Forgot password?
                            </button>
                        </div>

                        <SubmitButton isLoading={isLoading} onClick={handleSubmit(onSubmit)} />
                    </div>

                    <Divider text="Or continue with" />

                    <div className="grid grid-cols-2 gap-4">
                        <SocialButton
                            icon={<GoogleIcon />}
                            label="Google"
                            onClick={() => handleSocialLogin('Google')}
                        />
                        <SocialButton
                            icon={<GitHubIcon />}
                            label="GitHub"
                            onClick={() => handleSocialLogin('GitHub')}
                        />
                    </div>

                    <p className="text-center text-sm text-gray-600 mt-8">
                        Don't have an account?{' '}
                        <Link href={'/register'}
                            type="button"
                            onClick={() => console.log('Sign up clicked')}
                            className="text-violet-600 cursor-pointer font-semibold hover:text-purple-600 transition-colors duration-300"
                        >
                            Sign up for free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;