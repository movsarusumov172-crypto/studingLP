export type Plan = 'free' | 'pro' | 'team';

export interface JwtPayload {
  sub:  string;  // userId
  plan: Plan;
}

// Augment @fastify/jwt so request.user is typed everywhere
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user:    JwtPayload;
  }
}

// Kernel IDs supported by the app
export const KERNEL_IDS = ['js', 'python', 'c', 'cpp', 'csharp', 'go', 'java'] as const;
export type KernelId = typeof KERNEL_IDS[number];

// Standard API error shape
export interface ApiError {
  error:   string;
  code:    string;
  message?: string;
}
