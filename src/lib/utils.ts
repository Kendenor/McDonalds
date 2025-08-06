import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get current domain for referral links
export function getCurrentDomain(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use window.location
    return window.location.origin;
  } else {
    // Server-side: use environment variable or default
    return process.env.NEXT_PUBLIC_SITE_URL || 'https://mcdonald.app';
  }
}

// Generate referral link with current domain
export function generateReferralLink(referralCode: string): string {
  const domain = getCurrentDomain();
  return `${domain}/register?ref=${referralCode}`;
}

// Validate and format phone number
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let numbers = phone.replace(/\D/g, '');
  
  // Handle different phone number formats
  if (numbers.startsWith('234') && numbers.length === 13) {
    numbers = numbers.substring(3); // Remove 234 prefix
  } else if (numbers.startsWith('0') && numbers.length === 11) {
    numbers = numbers.substring(1); // Remove leading 0
  }
  
  // Validate phone number length
  if (numbers.length !== 10) {
    throw new Error('Invalid phone number format. Please enter a valid 10-digit Nigerian phone number.');
  }
  
  return numbers;
}

// Generate email address with current domain
export function generateEmailAddress(phone: string): string {
  const phoneNumber = formatPhoneNumber(phone);
  return `${phoneNumber}@mcdonald.app`;
}

// Get user-friendly error message from Firebase auth error
export function getAuthErrorMessage(error: any, context: 'registration' | 'login' = 'login'): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return "This phone number is already registered. Please try logging in instead.";
    case 'auth/user-not-found':
      return "No account found with this phone number. Please register first.";
    case 'auth/wrong-password':
      return "Incorrect password. Please check your password and try again.";
    case 'auth/weak-password':
      return "Your password is too weak. It should be at least 6 characters long.";
    case 'auth/invalid-email':
      return "Invalid phone number format. Please enter a valid 10-digit Nigerian phone number.";
    case 'auth/network-request-failed':
      return "Network error. Please check your internet connection and try again.";
    case 'auth/too-many-requests':
      return context === 'registration' 
        ? "Too many registration attempts. Please wait a moment and try again."
        : "Too many failed attempts. Please wait a moment and try again.";
    case 'auth/user-disabled':
      return "This account has been disabled. Please contact support.";
    case 'auth/operation-not-allowed':
      return context === 'registration'
        ? "Registration is temporarily disabled. Please try again later."
        : "Login is temporarily disabled. Please try again later.";
    default:
      // For any other Firebase errors, show a generic message
      if (error.message && error.message.includes('Invalid phone number format')) {
        return error.message;
      } else {
        return context === 'registration'
          ? "Registration failed. Please check your information and try again."
          : "Login failed. Please check your credentials and try again.";
      }
  }
}
