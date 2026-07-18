import {
  GoogleReCaptchaProvider,
} from "react-google-recaptcha-v3";
import { ContactForm } from "./ContactForm";
import { OrderForm } from "./OrderForm";

const CAPTCHA_SITE_KEY = import.meta.env.PUBLIC_RECAPTCHA_SITE_ID;

export default function ContactUsForms() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={CAPTCHA_SITE_KEY}
      scriptProps={{ async: true, defer: true }}
    >
      <section className="demo-band" aria-labelledby="request-demo">
        <div className="demo-band__inner">
          <div className="demo-band__intro">
            <p className="demo-band__eyebrow" data-phaeno-search-ignore>
              For research teams
            </p>
            <h2
              id="request-demo"
              data-phaeno-search="Request a PSeq demo"
              data-phaeno-search-summary="Request a PSeq demo to walk through isoform-resolved RNA data with the Phaeno team."
              data-phaeno-search-keywords="PSeq demo request isoform-resolved RNA data sample project"
            >See PSeq in Action</h2>
            <p>
              Bring us your sample, biological question, or current workflow. We will show you where full-length RNA
              resolution changes what you can see.
            </p>
            <ul className="demo-band__expectations" aria-label="What to expect">
              <li>Discuss your sample and study goals</li>
              <li>Explore isoform-resolved PSeq output</li>
              <li>Hear from a Phaeno scientist in 1–3 business days</li>
            </ul>
          </div>
          <div className="demo-band__form">
            <OrderForm />
          </div>
        </div>
      </section>
      <section className="updates-band" aria-labelledby="sign-up">
        <div className="updates-band__inner">
          <div className="updates-band__copy">
            <p className="updates-band__eyebrow" data-phaeno-search-ignore>
              Not ready for a demo?
            </p>
            <h2
              id="sign-up"
              data-phaeno-search="Get Phaeno updates and the PSeq technical brief"
              data-phaeno-search-summary="Sign up for Phaeno product releases, validation updates, technical insights, and the PSeq technical brief."
              data-phaeno-search-keywords="Phaeno updates PSeq technical brief validation updates product releases"
            >Stay Updated on Phaeno</h2>
            <p>
              Follow product releases, validation updates, and technical insights. You can also request the PSeq
              Technical Brief.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    </GoogleReCaptchaProvider>
  );
}
