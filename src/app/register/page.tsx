'use client';
import React, { use } from 'react';
import { AnimatedBackground } from '../login/componants/AnimatedHeader';
import { RegisterHeader } from '../login/componants/RegisterHearder';
import { InputField } from '@/components/ui/Field';
import { Mail, Lock, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRegisterMutation } from '@/features/user/userApi';
import { useRouter } from 'next/navigation';
// import { Button } from '@/components/ui/button';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const [focusedField, setFocusedField] = React.useState<string>('');
   const navigate=useRouter();
  const [registerData,{isLoading, isError}] = useRegisterMutation();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();
 

  const onSubmit = async(data: RegisterFormData) => {
    console.log('Registration Data:', data);
    // await registerData(data).unwrap();
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('Registration successful!', {position: 'top-right', duration: 3000 });

    navigate.push('/dashboard');
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 flex items-center justify-center p-4 relative overflow-hidden'>
      <AnimatedBackground />
      <div className='relative w-full max-w-md'>
        <div className='bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20'>
          <RegisterHeader />

          {/* Registration Form */}
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-6 mt-6'>

            {/* Name */}
            <InputField
              id='name'
              label='Full Name'
              type='text'
              placeholder='Enter your name'
              icon={<User />}
              error={errors.name?.message}
              register={register('name', { required: 'Name is required' })}
              focused={focusedField === 'name'}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField('')}
            />

            {/* Email */}
            <InputField
              id='email'
              label='Email Address'
              type='email'
              placeholder='Enter your email'
              icon={<Mail />}
              error={errors.email?.message}
              register={register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Invalid email address',
                },
              })}
              focused={focusedField === 'email'}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField('')}
            />

            {/* Password */}
            <InputField
              id='password'
              label='Password'
              type='password'
              placeholder='Enter your password'
              icon={<Lock />}
              error={errors.password?.message}
              register={register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              focused={focusedField === 'password'}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField('')}
            />

            {/* Confirm Password */}
            <InputField
              id='confirmPassword'
              label='Confirm Password'
              type='password'
              placeholder='Confirm your password'
              icon={<Lock />}
              error={errors.confirmPassword?.message}
              register={register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === watch('password') || 'Passwords do not match',
              })}
              focused={focusedField === 'confirmPassword'}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField('')}
            />

            {/* Submit Button */}
            <button
              type='submit'
              className='w-full cursor-pointer bg-gradient-to-r from-violet-500 to-pink-500 text-white font-medium py-2 rounded-xl shadow-md hover:opacity-90 transition duration-200'
            >
              Create Account
            </button>

            {/* Already have an account */}
            <p className='text-center text-sm text-gray-600'>
              Already have an account?{' '}
              <Link
                href='/login'
                className='text-violet-600 font-medium hover:underline'
              >
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
