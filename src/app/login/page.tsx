'use client';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useForgotPasswordMutation, useLoginMutation, useResetPasswordMutation } from '@/features/user/userApi';
import { useAuth } from '@/context/AuthContext';
import { LoginFormData, loginSchema } from '@/schemas';

interface SocialButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}

const SocialButton: React.FC<SocialButtonProps> = ({ icon, label, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="lms-social-btn"
    >
        {icon}
        <span>{label}</span>
    </button>
);

const GoogleIcon: React.FC = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const GitHubIcon: React.FC = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
);

const SubmitButton: React.FC<{ isLoading: boolean }> = ({ isLoading }) => (
    <button
        type="submit"
        disabled={isLoading}
        className="lms-submit-btn"
    >
        {isLoading ? (
            <>
                <div className="lms-spinner"></div>
                Signing in...
            </>
        ) : (
            <>
                CONTINUE
                <ArrowRight className="w-4 h-4" />
            </>
        )}
    </button>
);

const DEMO_ACCOUNTS = [
    { role: 'Admin',      email: 'admin@smartz.com',       password: 'Admin@123' },
    { role: 'Teacher',    email: 'fatima.ali@smartz.com',  password: 'Teacher@123' },
    { role: 'Student',    email: 'k17tasmia@gmail.com',    password: 'PkBCCeU@gn' },
    { role: 'Accountant', email: 'accountant@smartz.com',  password: 'Accountant@123' },
];

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <button type="button" className={`lms-copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy} title="Copy">
            {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
    );
}

function DemoCredentials({ setValue }: { setValue: (field: 'identifier' | 'password', value: string) => void }) {
    return (
        <div className="lms-demo">
            <p className="lms-demo-notice">
                <span>⚠</span> Demo credentials — will be removed soon
            </p>
            <div className="lms-demo-list">
                {DEMO_ACCOUNTS.map(({ role, email, password }) => (
                    <div key={role} className="lms-demo-card">
                        <div className="lms-demo-role">{role}</div>
                        <div className="lms-demo-row">
                            <span className="lms-demo-label">Email</span>
                            <span className="lms-demo-value">{email}</span>
                            <CopyButton text={email} />
                        </div>
                        <div className="lms-demo-row" style={{ marginTop: '2px' }}>
                            <span className="lms-demo-label">Password</span>
                            <span className="lms-demo-value">{password}</span>
                            <CopyButton text={password} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const LoginForm: React.FC = () => {
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isLoadingLogin, setIsLoadingLogin] = useState<boolean>(false);
    const [isForgotLoading, setIsForgotLoading] = useState<boolean>(false);
    const [isResetLoading, setIsResetLoading] = useState<boolean>(false);
    const [showResetForm, setShowResetForm] = useState<boolean>(false);
    const [resetEmail, setResetEmail] = useState<string>('');
    const [resetOtp, setResetOtp] = useState<string>('');
    const [resetNewPassword, setResetNewPassword] = useState<string>('');
    const router = useRouter();
    const [loginUser] = useLoginMutation();
    const [forgotPassword] = useForgotPasswordMutation();
    const [resetPassword] = useResetPasswordMutation();
    const { login, user, isAuthReady } = useAuth();

    useEffect(() => {
        if (!isAuthReady || !user) return;

        const normalizedRole = String(
            user?.role ??
            (Array.isArray(user?.roles) ? user.roles[0] : user?.roles) ??
            ''
        ).toLowerCase();

        const routeByRole =
            normalizedRole === 'superadmin'
                ? '/dashboard/admins'
                : '/dashboard';

        router.replace(routeByRole);
    }, [isAuthReady, user, router]);

    const {
        register,
        handleSubmit,
        getValues,
        setError,
        setValue,
        formState: { errors }
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        mode: 'onChange',
        defaultValues: { identifier: '', password: '', rememberMe: false }
    });

    const onSubmit = async (_data: LoginFormData) => {
        setIsLoadingLogin(true);

        try {
            const isEmail = _data.identifier.includes('@');
            const payload = isEmail
                ? { password: _data.password, email: _data.identifier }
                : { password: _data.password, phone: _data.identifier };

            const response = await loginUser(payload).unwrap();
            const token = response?.token || response?.access_token || response?.accessToken;
            const user = response?.user;
            const tenant = response?.tenant;

            if (!token || !user) {
                throw new Error('Login succeeded but token/user payload is missing.');
            }

            login({ token, user, tenant });

            toast('Logged in successfully!', {
                description: 'Redirecting to dashboard.',
                position: 'top-right',
                action: { label: 'x', onClick: () => { } },
            });

        } catch (error: unknown) {
            const maybeError = error as { data?: { message?: string }; message?: string };
            const message =
                maybeError?.data?.message ||
                maybeError?.message ||
                'Unable to login. Please check your credentials and try again.';

            setError('root', { type: 'server', message });
        } finally {
            setIsLoadingLogin(false);
        }
    };

    const handleForgotPassword = async (identifier?: string) => {
        const candidate = (identifier || '').trim();
        const email = candidate.includes('@') ? candidate : '';

        if (!email) {
            toast('Enter your email first', {
                description: 'Forgot password works with email. Type your email in the Email or Phone field.',
                position: 'top-right',
            });
            return;
        }

        setIsForgotLoading(true);
        try {
            await forgotPassword({
                email,
            }).unwrap();

            setShowResetForm(true);
            setResetEmail(email);

            toast('OTP sent', {
                description: 'Check your email and enter OTP below to reset password.',
                position: 'top-right',
                action: { label: 'x', onClick: () => { } },
            });
        } catch (error: unknown) {
            const maybeError = error as { data?: { message?: string }; message?: string };
            toast('Failed to send reset link', {
                description: maybeError?.data?.message || maybeError?.message || 'Please try again.',
                position: 'top-right',
                action: { label: 'x', onClick: () => { } },
            });
        } finally {
            setIsForgotLoading(false);
        }
    };

    const handleResetPassword = async () => {
        const email = resetEmail.trim();
        const otp = resetOtp.trim();
        const newPassword = resetNewPassword.trim();

        if (!email || !email.includes('@')) {
            toast('Email is required', {
                description: 'Enter a valid email for password reset.',
                position: 'top-right',
            });
            return;
        }

        if (!otp) {
            toast('OTP is required', {
                description: 'Enter the OTP you received via email.',
                position: 'top-right',
            });
            return;
        }

        if (newPassword.length < 8) {
            toast('Password too short', {
                description: 'New password must be at least 8 characters.',
                position: 'top-right',
            });
            return;
        }

        setIsResetLoading(true);
        try {
            await resetPassword({
                email,
                otp,
                new_password: newPassword,
            }).unwrap();

            toast('Password reset successful', {
                description: 'You can now sign in with your new password.',
                position: 'top-right',
                action: { label: 'x', onClick: () => { } },
            });

            setShowResetForm(false);
            setResetOtp('');
            setResetNewPassword('');
        } catch (error: unknown) {
            const maybeError = error as { data?: { message?: string }; message?: string };
            toast('Reset failed', {
                description: maybeError?.data?.message || maybeError?.message || 'Please check your OTP and try again.',
                position: 'top-right',
                action: { label: 'x', onClick: () => { } },
            });
        } finally {
            setIsResetLoading(false);
        }
    };

    const handleSocialLogin = (provider: string) => console.log(`${provider} login clicked`);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

                .lms-root {
                    min-height: 100vh;
                    display: flex;
                    font-family: 'DM Sans', sans-serif;
                    background-color: #0f1117;
                    color: #e8e6e0;
                    overflow: hidden;
                    position: relative;
                }

                /* Left panel — decorative */
                .lms-left {
                    display: none;
                    flex: 1;
                    position: relative;
                    background: linear-gradient(145deg, #111827 0%, #0f1117 100%);
                    border-right: 1px solid rgba(255,255,255,0.06);
                    overflow: hidden;
                }

                @media (min-width: 1024px) {
                    .lms-left { display: flex; flex-direction: column; justify-content: space-between; padding: 3rem; }
                }

                .lms-left-grid {
                    position: absolute;
                    inset: 0;
                    background-image:
                        linear-gradient(rgba(99,179,237,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99,179,237,0.04) 1px, transparent 1px);
                    background-size: 48px 48px;
                }

                .lms-left-glow {
                    position: absolute;
                    width: 400px;
                    height: 400px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
                    top: 20%;
                    left: 10%;
                    pointer-events: none;
                }

                .lms-brand {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    z-index: 1;
                }

                .lms-brand-icon {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .lms-brand-name {
                    font-family: 'Instrument Serif', serif;
                    font-size: 1.4rem;
                    color: #f0ede8;
                    letter-spacing: -0.01em;
                }

                .lms-left-content {
                    z-index: 1;
                }

                .lms-left-heading {
                    font-family: 'Instrument Serif', serif;
                    font-size: 2.8rem;
                    line-height: 1.15;
                    color: #f0ede8;
                    margin-bottom: 1.25rem;
                    letter-spacing: -0.02em;
                }

                .lms-left-heading em {
                    font-style: italic;
                    color: #818cf8;
                }

                .lms-left-sub {
                    font-size: 0.95rem;
                    color: #6b7280;
                    line-height: 1.6;
                    max-width: 340px;
                }

                .lms-stats {
                    display: flex;
                    gap: 2rem;
                    z-index: 1;
                }

                .lms-stat-num {
                    font-family: 'Instrument Serif', serif;
                    font-size: 1.8rem;
                    color: #f0ede8;
                }

                .lms-stat-label {
                    font-size: 0.78rem;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }

                /* Right panel — form */
                .lms-right {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    position: relative;
                }

                .lms-card {
                    width: 100%;
                    max-width: 420px;
                }

                /* Mobile brand */
                .lms-mobile-brand {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 2.5rem;
                }

                @media (min-width: 1024px) {
                    .lms-mobile-brand { display: none; }
                }

                .lms-heading {
                    font-family: 'Instrument Serif', serif;
                    font-size: 2rem;
                    color: #f0ede8;
                    margin-bottom: 0.4rem;
                    letter-spacing: -0.02em;
                }

                .lms-subheading {
                    font-size: 0.9rem;
                    color: #6b7280;
                    margin-bottom: 2rem;
                }

                /* Input */
                .lms-field {
                    margin-bottom: 1.1rem;
                }

                .lms-label {
                    display: block;
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: #9ca3af;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    margin-bottom: 0.45rem;
                }

                .lms-input-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .lms-input-icon {
                    position: absolute;
                    left: 14px;
                    color: #4b5563;
                    width: 16px;
                    height: 16px;
                    pointer-events: none;
                }

                .lms-input {
                    width: 100%;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px;
                    padding: 0.75rem 1rem 0.75rem 2.6rem;
                    font-size: 0.9rem;
                    font-family: 'DM Sans', sans-serif;
                    color: #e8e6e0;
                    outline: none;
                    transition: border-color 0.2s, background 0.2s;
                    box-sizing: border-box;
                }

                .lms-input::placeholder { color: #374151; }

                .lms-input:focus {
                    border-color: rgba(99,102,241,0.5);
                    background: rgba(99,102,241,0.06);
                }

                .lms-input-right {
                    position: absolute;
                    right: 12px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #4b5563;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    transition: color 0.2s;
                }

                .lms-input-right:hover { color: #818cf8; }

                .lms-error {
                    font-size: 0.75rem;
                    color: #f87171;
                    margin-top: 0.3rem;
                }

                /* Row */
                .lms-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.5rem;
                    margin-top: 0.25rem;
                }

                .lms-remember {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    color: #6b7280;
                }

                .lms-remember input[type="checkbox"] {
                    accent-color: #6366f1;
                    width: 14px;
                    height: 14px;
                }

                .lms-forgot {
                    font-size: 0.85rem;
                    color: #818cf8;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-family: 'DM Sans', sans-serif;
                    transition: color 0.2s;
                }

                .lms-forgot:hover { color: #a5b4fc; }

                /* Submit */
                .lms-submit-btn {
                    width: 100%;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    padding: 0.82rem 1.5rem;
                    font-size: 0.9rem;
                    font-weight: 600;
                    font-family: 'DM Sans', sans-serif;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: opacity 0.2s, transform 0.15s;
                    letter-spacing: 0.01em;
                    box-shadow: 0 4px 24px rgba(99,102,241,0.25);
                    margin-bottom: 1.5rem;
                }

                .lms-submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
                .lms-submit-btn:active:not(:disabled) { transform: translateY(0); }
                .lms-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                .lms-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: lms-spin 0.7s linear infinite;
                }

                @keyframes lms-spin { to { transform: rotate(360deg); } }

                /* Divider */
                .lms-divider {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 1.25rem;
                }

                .lms-divider-line {
                    flex: 1;
                    height: 1px;
                    background: rgba(255,255,255,0.07);
                }

                .lms-divider-text {
                    font-size: 0.78rem;
                    color: #4b5563;
                    text-transform: uppercase;
                    letter-spacing: 0.07em;
                    white-space: nowrap;
                }

                /* Social */
                .lms-social-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 2rem;
                }

                .lms-social-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 0.7rem 1rem;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px;
                    color: #9ca3af;
                    font-size: 0.85rem;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 500;
                    cursor: pointer;
                    transition: border-color 0.2s, background 0.2s, color 0.2s;
                }

                .lms-social-btn:hover {
                    border-color: rgba(99,102,241,0.4);
                    background: rgba(99,102,241,0.06);
                    color: #e8e6e0;
                }

                /* Demo credentials */
                .lms-demo {
                    margin-top: 1.5rem;
                    border: 1px solid rgba(99,102,241,0.2);
                    border-radius: 12px;
                    padding: 1rem;
                    background: rgba(99,102,241,0.04);
                }

                .lms-demo-notice {
                    font-size: 0.72rem;
                    color: #f59e0b;
                    margin-bottom: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 500;
                    letter-spacing: 0.02em;
                    text-transform: uppercase;
                }

                .lms-demo-list {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .lms-demo-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 8px;
                    padding: 0.55rem 0.75rem;
                }

                .lms-demo-role {
                    font-size: 0.68rem;
                    font-weight: 600;
                    color: #818cf8;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    margin-bottom: 4px;
                }

                .lms-demo-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 6px;
                }

                .lms-demo-label {
                    font-size: 0.68rem;
                    color: #4b5563;
                    width: 52px;
                    flex-shrink: 0;
                }

                .lms-demo-value {
                    font-size: 0.75rem;
                    color: #d1d5db;
                    font-family: monospace;
                    flex: 1;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .lms-copy-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #4b5563;
                    padding: 2px;
                    display: flex;
                    align-items: center;
                    transition: color 0.15s;
                    flex-shrink: 0;
                }

                .lms-copy-btn:hover { color: #818cf8; }
                .lms-copy-btn.copied { color: #34d399; }

                /* Footer text */
                .lms-footer-text {
                    text-align: center;
                    font-size: 0.85rem;
                    color: #4b5563;
                }

                .lms-footer-link {
                    color: #818cf8;
                    font-weight: 500;
                    text-decoration: none;
                    transition: color 0.2s;
                }

                .lms-footer-link:hover { color: #a5b4fc; }
            `}</style>

            <div className="lms-root">
                {/* Left decorative panel */}
                <div className="lms-left">
                    <div className="lms-left-grid" />
                    <div className="lms-left-glow" />

                    <div className="lms-brand">
                        <div className="lms-brand-icon">
                            <GraduationCap size={20} />
                        </div>
                        <span className="lms-brand-name"></span>
                    </div>

                    <div className="lms-left-content">
                        <h1 className="lms-left-heading">
                            Manage your<br />
                            coaching <em>smarter.</em>
                        </h1>
                        <p className="lms-left-sub">
                            Students, teachers, batches, and payments —
                            everything in one place.
                        </p>
                    </div>

                    <div className="lms-stats">
                        <div>
                            <div className="lms-stat-num">1k+</div>
                            <div className="lms-stat-label">Students</div>
                        </div>
                        <div>
                            <div className="lms-stat-num">98%</div>
                            <div className="lms-stat-label">Success Rate</div>
                        </div>
                        <div>
                            <div className="lms-stat-num">4.9★</div>
                            <div className="lms-stat-label">Rating</div>
                        </div>
                    </div>
                </div>

                {/* Right form panel */}
                <div className="lms-right">
                    <div className="lms-card">

                        {/* Mobile brand */}
                        <div className="lms-mobile-brand">
                            <div className="lms-brand-icon">
                                <GraduationCap size={18} />
                            </div>
                            <span className="lms-brand-name">LearnFlow</span>
                        </div>

                        <h2 className="lms-heading">Welcome back</h2>
                        <p className="lms-subheading">Sign in to continue your learning journey</p>

                        <form onSubmit={handleSubmit(onSubmit)}>
                            {/* Email / Phone */}
                            <div className="lms-field">
                                <label className="lms-label">Email or Phone</label>
                                <div className="lms-input-wrap">
                                    <Mail className="lms-input-icon" />
                                    <input
                                        id="identifier"
                                        type="text"
                                        placeholder="you@example.com or +8801XXXXXXXXX"
                                        className="lms-input"
                                        {...register('identifier')}
                                    />
                                </div>
                                {errors.identifier && <p className="lms-error">{errors.identifier.message}</p>}
                            </div>

                            {/* Password */}
                            <div className="lms-field">
                                <label className="lms-label">Password</label>
                                <div className="lms-input-wrap">
                                    <Lock className="lms-input-icon" />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        className="lms-input"
                                        style={{ paddingRight: '2.8rem' }}
                                        {...register('password')}
                                    />
                                    <button
                                        type="button"
                                        className="lms-input-right"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {errors.password && <p className="lms-error">{errors.password.message}</p>}
                            </div>

                            {/* Remember / Forgot */}
                            <div className="lms-row">
                                <label className="lms-remember">
                                    <input type="checkbox" {...register('rememberMe')} />
                                    Remember me
                                </label>
                                <button
                                    type="button"
                                    className="lms-forgot"
                                    disabled={isForgotLoading}
                                    onClick={() => handleForgotPassword(getValues('identifier'))}
                                >
                                    {isForgotLoading ? 'Sending...' : 'Forgot password?'}
                                </button>
                            </div>

                            <div className="lms-row" style={{ justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    className="lms-forgot"
                                    onClick={() => {
                                        const identifier = getValues('identifier')?.trim() || '';
                                        const fallbackEmail = identifier.includes('@') ? identifier : '';
                                        setResetEmail((prev) => prev || fallbackEmail);
                                        setShowResetForm((prev) => !prev);
                                    }}
                                >
                                    {showResetForm ? 'Hide reset form' : 'Have OTP? Reset password'}
                                </button>
                            </div>

                            {showResetForm && (
                                <div style={{ marginTop: '0.25rem', marginBottom: '0.75rem', display: 'grid', gap: '0.75rem' }}>
                                    <div className="lms-field" style={{ marginBottom: 0 }}>
                                        <label className="lms-label">Reset Email</label>
                                        <div className="lms-input-wrap">
                                            <Mail className="lms-input-icon" />
                                            <input
                                                type="email"
                                                placeholder="you@example.com"
                                                className="lms-input"
                                                value={resetEmail}
                                                onChange={(event) => setResetEmail(event.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="lms-field" style={{ marginBottom: 0 }}>
                                        <label className="lms-label">OTP</label>
                                        <div className="lms-input-wrap">
                                            <Lock className="lms-input-icon" />
                                            <input
                                                type="text"
                                                placeholder="483921"
                                                className="lms-input"
                                                value={resetOtp}
                                                onChange={(event) => setResetOtp(event.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="lms-field" style={{ marginBottom: 0 }}>
                                        <label className="lms-label">New Password</label>
                                        <div className="lms-input-wrap">
                                            <Lock className="lms-input-icon" />
                                            <input
                                                type="password"
                                                placeholder="NewPassword@123"
                                                className="lms-input"
                                                value={resetNewPassword}
                                                onChange={(event) => setResetNewPassword(event.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={isResetLoading}
                                        className="lms-submit-btn"
                                        onClick={handleResetPassword}
                                    >
                                        {isResetLoading ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </div>
                            )}

                            {errors.root?.message && <p className="lms-error">{errors.root.message}</p>}

                            <SubmitButton isLoading={isLoadingLogin} />
                        </form>

                        {/* Divider */}
                        {/* <div className="lms-divider">
                            <div className="lms-divider-line" />
                            <span className="lms-divider-text">or continue with</span>
                            <div className="lms-divider-line" />
                        </div> */}

                        {/* Social */}
                        {/* <div className="lms-social-grid">
                            <SocialButton icon={<GoogleIcon />} label="Google" onClick={() => handleSocialLogin('Google')} />
                            <SocialButton icon={<GitHubIcon />} label="GitHub" onClick={() => handleSocialLogin('GitHub')} />
                        </div> */}

                        {/* Demo credentials */}
                        <DemoCredentials setValue={setValue} />

                        {/* <p className="lms-footer-text">
                            Don't have an account?{' '}
                            <Link href="/register" className="lms-footer-link">
                                Sign up for free
                            </Link>
                        </p> */}
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginForm;
