import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, id, className = "", ...rest }, ref) => {
    const inputId = id ?? `inp-${label.replace(/\s+/g, "-").toLowerCase()}`;
    return (
      <div>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-100 ${
            error
              ? "border-red-400 focus:border-red-500"
              : "border-slate-300 focus:border-brand-500"
          } ${className}`}
          {...rest}
        />
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : helper ? (
          <p className="mt-1 text-xs text-slate-500">{helper}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
