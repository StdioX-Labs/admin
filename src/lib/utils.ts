import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { NextResponse } from "next/server";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely handles API errors and ensures JSON responses
 * @param handler The API route handler function
 */
export function withErrorHandler(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API Error:", error);

      // Ensure we always return a proper JSON response
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
          error:
            process.env.NODE_ENV === "development"
              ? error instanceof Error
                ? error.stack
                : String(error)
              : undefined,
        },
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  };
}
