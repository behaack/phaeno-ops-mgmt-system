import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import Spinner from "../Spinner";

const BASE_URL = import.meta.env.PUBLIC_API_BASE_URL;

const schema = z.object({
  firstname: z
    .string()
    .nonempty("Please enter your first name.")
    .max(60, "Length may not exceed 60 characters."),
  lastname: z
    .string()
    .nonempty("Please enter your last name.")
    .max(60, "Length may not exceed 60 characters."),
  organizationname: z
    .string()
    .nonempty("Please enter your organization.")
    .max(250, "Length may not exceed 250 characters."),
  email: z
    .string()
    .nonempty("Please enter your email.")
    .email("Please enter a valid email address.")
    .max(256, "Length may not exceed 256 characters."),
  description: z
    .string()
    .nonempty("Please enter a brief description of your needs.")
    .max(1000, "Length may not exceed 1000 characters."),
});

export type FormValues = z.infer<typeof schema>;

/**
 * OrderForm (Demo / Project request)
 * - More premium layout + clear value copy
 * - 2-col name row on md+
 * - Styled textarea + helper hint
 * - Stronger CTA
 */
export function OrderForm() {
  const formId = useId();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const { executeRecaptcha } = useGoogleReCaptcha();
  const [message, setMessage] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(true);

  const onSubmit = async (data: FormValues) => {
    setMessage("");

    if (!executeRecaptcha) {
      setMessage("reCAPTCHA is not loaded. Please try again.");
      setIsSuccess(false);
      return;
    }

    let token: string;
    try {
      token = await executeRecaptcha("order_form_submit");
    } catch {
      setMessage("Failed to get reCAPTCHA token. Please try again.");
      setIsSuccess(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}web-ops/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webOrder: data,
          recaptchaCode: token,
          recaptchaAction: "order_form_submit",
        }),
      });

      if (!res.ok) {
        let errorText = `Request failed (${res.status}).`;
        try {
          const detail = await res.json();
          if (detail?.message) errorText = detail.message;
        } catch {
          /* ignore */
        }

        switch (res.status) {
          case 403:
            errorText =
              "The reCAPTCHA verification failed. Please refresh and try again.";
            break;
          case 409:
            errorText = "Thanks — we already have this email on file.";
            break;
          case 500:
            errorText =
              "Whoops — something went wrong on our side. Please try again.";
            break;
        }
        throw new Error(errorText);
      }

      setMessage(
        "Thanks! Request received. A Phaeno scientist will contact you within three business days."
      );
      setIsSuccess(true);
      reset();
    } catch (err: unknown) {
      let friendlyMessage = "Unexpected error — please try again.";

      if (err instanceof Error) {
        if (err.message === "Failed to fetch") {
          friendlyMessage =
            "Server is currently unreachable. Do you have a network connection?";
        } else {
          friendlyMessage = err.message;
        }
      }

      setMessage(friendlyMessage);
      setIsSuccess(false);
    }
  };

  const inputBase =
    "contact-input mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm " +
    "outline-none placeholder:text-slate-400 " +
    "disabled:bg-slate-50 disabled:text-slate-500";

  const labelBase = "block text-sm font-medium text-slate-900";

  return (
    <div className="contact-form-panel contact-form-panel--demo">
      <div className="px-6 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* NAME ROW */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-firstname`} className={labelBase}>
                First Name
              </label>
              <input
                id={`${formId}-firstname`}
                autoComplete="given-name"
                className={inputBase}
                {...register("firstname")}
              />
              {errors.firstname && (
                <p className="mt-px p-0 text-sm text-red-600">
                  {errors.firstname.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-lastname`} className={labelBase}>
                Last Name
              </label>
              <input
                id={`${formId}-lastname`}
                autoComplete="family-name"
                className={inputBase}
                {...register("lastname")}
              />
              {errors.lastname && (
                <p className="mt-px p-0 text-sm text-red-600">
                  {errors.lastname.message}
                </p>
              )}
            </div>
          </div>

          {/* ORG */}
          <div>
            <label htmlFor={`${formId}-organization`} className={labelBase}>
              Organization
            </label>
            <input
              id={`${formId}-organization`}
              autoComplete="organization"
              className={inputBase}
              {...register("organizationname")}
            />
            {errors.organizationname && (
              <p className="mt-px p-0 text-sm text-red-600">
                {errors.organizationname.message}
              </p>
            )}
          </div>

          {/* EMAIL */}
          <div>
            <label htmlFor={`${formId}-email`} className={labelBase}>
              Email
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              className={inputBase}
              placeholder="name@company.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-px p-0 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* DESCRIPTION */}
          <div>
            <label htmlFor={`${formId}-description`} className={labelBase}>
              Project Description
            </label>
            <textarea
              id={`${formId}-description`}
              className={[
                inputBase,
                "min-h-30 resize-y leading-5",
              ].join(" ")}
              placeholder="Example: isoform-level differential expression in FFPE tumors; need full-length assemblies + ML-ready feature export."
              {...register("description")}
            />
            {errors.description && (
              <p className="mt-px p-0 text-sm text-red-600">{errors.description.message}</p>
            )}
            <p className="mt-px text-xs text-slate-700">
              Include sample type, organism, and study goals if you can.
            </p>
          </div>

          {/* MESSAGE */}
          {message && (
            <div
              role="status"
              aria-live="polite"
              className={[
                "rounded-xl border px-4 py-3 text-sm",
                isSuccess
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900",
              ].join(" ")}
            >
              <p className="font-medium">{message}</p>
            </div>
          )}

          <div className="contact-form-actions flex items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-700">
              We usually reply within 1–3 business days.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className={[
                "contact-submit inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                "shadow-sm",
                "disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
            >
              {isSubmitting ? <Spinner size={21} /> : "Request Demo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
