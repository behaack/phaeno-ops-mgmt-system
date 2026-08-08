import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import Spinner from "../Spinner";
import { isWebsiteReviewMode } from "@/lib/reviewMode";
import { formatMessage, getMessages } from "@/i18n/messages";
import type { ContactValidationMessages } from "@/i18n/catalogs/types";
import type { SupportedLocale } from "@/i18n/locales";

const BASE_URL = import.meta.env.PUBLIC_API_BASE_URL;

function createOrderSchema(validation: ContactValidationMessages) {
  return z.object({
  firstname: z
    .string()
    .nonempty(validation.firstNameRequired)
    .max(60, validation.maximum60),
  lastname: z
    .string()
    .nonempty(validation.lastNameRequired)
    .max(60, validation.maximum60),
  organizationname: z
    .string()
    .nonempty(validation.organizationRequired)
    .max(250, validation.maximum250),
  email: z
    .string()
    .nonempty(validation.emailRequired)
    .email(validation.emailInvalid)
    .max(256, validation.maximum256),
  description: z
    .string()
    .nonempty(validation.descriptionRequired)
    .max(1000, validation.maximum1000),
  });
}

export type FormValues = z.infer<ReturnType<typeof createOrderSchema>>;

interface OrderFormProps {
  locale?: SupportedLocale;
}

/**
 * OrderForm (Demo / Project request)
 * - More premium layout + clear value copy
 * - 2-col name row on md+
 * - Styled textarea + helper hint
 * - Stronger CTA
 */
export function OrderForm({ locale = 'en-US' }: OrderFormProps) {
  const text = getMessages(locale).contact;
  const schema = createOrderSchema(text.validation);
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

    if (isWebsiteReviewMode) {
      setMessage(text.previewDisabled);
      setIsSuccess(false);
      return;
    }

    if (!executeRecaptcha) {
      setMessage(text.recaptchaUnavailable);
      setIsSuccess(false);
      return;
    }

    let token: string;
    try {
      token = await executeRecaptcha("order_form_submit");
    } catch {
      setMessage(text.recaptchaTokenFailed);
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
        let errorText = formatMessage(text.requestFailed, { status: res.status });
        try {
          const detail = await res.json();
          if (detail?.message) errorText = detail.message;
        } catch {
          /* ignore */
        }

        switch (res.status) {
          case 403:
            errorText = text.recaptchaFailed;
            break;
          case 409:
            errorText = text.duplicateEmail;
            break;
          case 500:
            errorText = text.serverError;
            break;
        }
        throw new Error(errorText);
      }

      setMessage(text.demo.success);
      setIsSuccess(true);
      reset();
    } catch (err: unknown) {
      let friendlyMessage = text.unexpectedError;

      if (err instanceof Error) {
        if (err.message === "Failed to fetch") {
          friendlyMessage = text.networkError;
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
          {isWebsiteReviewMode && (
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
              {text.previewDisabled}
            </p>
          )}
          {/* NAME ROW */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-firstname`} className={labelBase}>
                {text.firstName}
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
                {text.lastName}
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
              {text.organization}
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
              {text.email}
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              className={inputBase}
              placeholder={text.emailPlaceholder}
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-px p-0 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* DESCRIPTION */}
          <div>
            <label htmlFor={`${formId}-description`} className={labelBase}>
              {text.demo.projectDescription}
            </label>
            <textarea
              id={`${formId}-description`}
              className={[
                inputBase,
                "min-h-30 resize-y leading-5",
              ].join(" ")}
              placeholder={text.demo.projectPlaceholder}
              {...register("description")}
            />
            {errors.description && (
              <p className="mt-px p-0 text-sm text-red-600">{errors.description.message}</p>
            )}
            <p className="mt-px text-xs text-slate-700">
              {text.demo.projectHint}
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
              {text.demo.replyTime}
            </p>

            <button
              type="submit"
              disabled={isSubmitting || isWebsiteReviewMode}
              aria-busy={isSubmitting}
              className={[
                "contact-submit inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                "shadow-sm",
                "disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
            >
              {isSubmitting ? <Spinner size={21} /> : text.demo.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
