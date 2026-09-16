"use client";

export function FormFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm text-red-700">
      {message}
    </p>
  );
}
