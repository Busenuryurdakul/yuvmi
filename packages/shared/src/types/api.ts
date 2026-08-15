export type ApiError = {
  message: string;
  code: number;
};

export type ApiResponse<T> = {
  data?: T;
  error?: ApiError;
};

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: string;
  };
};

export type UserProfileResponse = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  locale: string;
  timezone: string;
  onboardingComplete: boolean;
  createdAt: string;
};
