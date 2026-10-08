/** Decode the Portal API envelope without treating every validation failure as a duplicate. */
export async function websiteContactError(response) {
  let code;
  try {
    const envelope = await response.json();
    code = envelope?.error?.code;
  } catch { /* Proxies and rate limiters may return a non-JSON response. */ }
  if (code === "email_already_in_use")
    return "Thanks — we already have this email on file. If your requested technical brief has not arrived, contact Phaeno for help.";
  if (code === "recaptcha_rejected" || response.status === 403)
    return "The reCAPTCHA verification failed. Please try again.";
  if (response.status === 429)
    return "Too many requests. Please wait a few minutes and try again. Your entries have been kept.";
  if (response.status === 400 || response.status === 422)
    return "Please check the information entered and try again. Your entries have been kept.";
  return "We could not save your signup. Please try again. Your entries have been kept.";
}
