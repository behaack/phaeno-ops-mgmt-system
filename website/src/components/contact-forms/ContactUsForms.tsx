import {
  GoogleReCaptchaProvider,
} from "react-google-recaptcha-v3";
import { ContactForm } from "./ContactForm";
import { OrderForm } from "./OrderForm";
import { isWebsiteReviewMode } from "@/lib/reviewMode";
import { getMessages } from "@/i18n/messages";
import type { SupportedLocale } from "@/i18n/locales";
import "@/styles/contact-forms.css";

const CAPTCHA_SITE_KEY = import.meta.env.PUBLIC_RECAPTCHA_SITE_ID;

interface ContactUsFormsProps {
  locale?: SupportedLocale;
}

export default function ContactUsForms({ locale = 'en-US' }: ContactUsFormsProps) {
  const text = getMessages(locale).contact;
  const forms = (
    <>
      <section className="demo-band" aria-labelledby="request-demo">
        <div className="demo-band__inner">
          <div className="demo-band__intro">
            <p className="demo-band__eyebrow" data-phaeno-search-ignore>
              {text.demo.audience}
            </p>
            <h2
              id="request-demo"
              data-phaeno-search={text.demo.searchTitle}
              data-phaeno-search-summary={text.demo.searchSummary}
              data-phaeno-search-keywords="PSeq demo request isoform-resolved RNA data sample project"
            >{text.demo.title}</h2>
            <p>
              {text.demo.introduction}
            </p>
            <ul className="demo-band__expectations" aria-label={text.demo.expectationsLabel}>
              {text.demo.expectations.map((expectation) => <li key={expectation}>{expectation}</li>)}
            </ul>
          </div>
          <div className="demo-band__form">
            <OrderForm locale={locale} />
          </div>
        </div>
      </section>
      <section className="updates-band" aria-labelledby="sign-up">
        <div className="updates-band__inner">
          <div className="updates-band__copy">
            <p className="updates-band__eyebrow" data-phaeno-search-ignore>
              {text.updates.eyebrow}
            </p>
            <h2
              id="sign-up"
              data-phaeno-search={text.updates.searchTitle}
              data-phaeno-search-summary={text.updates.searchSummary}
              data-phaeno-search-keywords="Phaeno updates PSeq technical brief validation updates product releases"
            >{text.updates.title}</h2>
            <p>
              {text.updates.introduction}
            </p>
          </div>
          <ContactForm locale={locale} />
        </div>
      </section>
    </>
  );

  if (isWebsiteReviewMode) return forms;

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={CAPTCHA_SITE_KEY}
      scriptProps={{ async: true, defer: true }}
    >
      {forms}
    </GoogleReCaptchaProvider>
  );
}
