import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";
import { waLink, openWhatsApp } from "@/lib/whatsapp";

type LangPageProps = {
  lang: "ru" | "en" | "fr";
  dir: "ltr" | "rtl";
  title: string;
  subtitle: string;
  body: string;
  back: string;
  contact: string;
  whatsappText: string;
  metaTitle: string;
  metaDescription: string;
  path: "/ru" | "/en" | "/fr";
};

const ComingSoonPage = ({
  lang,
  dir,
  title,
  subtitle,
  body,
  back,
  contact,
  whatsappText,
  metaTitle,
  metaDescription,
  path,
}: LangPageProps) => {
  const url = `https://sade-il.com${path}`;
  return (
    <div dir={dir} lang={lang} className="min-h-screen bg-gradient-hero text-primary-foreground flex flex-col">
      <Helmet htmlAttributes={{ lang }}>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="robots" content="noindex, follow" />
        <meta name="googlebot" content="noindex, follow" />
        <meta name="bingbot" content="noindex, follow" />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={url} />
        <meta property="og:locale" content={lang === "ru" ? "ru_RU" : lang === "fr" ? "fr_FR" : "en_US"} />
        {/* This page is noindex; hreflang alternates to noindex URLs are invalid
            and dropped by Google. Keep only he + x-default until real translated
            pages ship. */}
        <link rel="alternate" hrefLang="he" href="https://sade-il.com/" />
        <link rel="alternate" hrefLang="x-default" href="https://sade-il.com/" />
      </Helmet>
      <header className="border-b border-gold/20 backdrop-blur bg-primary/40">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link to="/" className="t-mono text-xs tracking-[0.18em] text-gold hover:text-primary-foreground transition-smooth">
            A. SADETSKY · Reg.no. 35825
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 container mx-auto flex items-center justify-center py-20 px-4">
        <div className="max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/10 backdrop-blur t-mono text-[10px] tracking-[0.22em] text-gold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
            {lang.toUpperCase()} · COMING SOON
          </div>
          <h1 className="t-h1 mb-6">{title}</h1>
          <p className="t-lead text-primary-foreground/85 mb-4">{subtitle}</p>
          <p className="t-body text-primary-foreground/70 mb-10 leading-relaxed">{body}</p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90">
              <a
                href={waLink(whatsappText)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => openWhatsApp(e, whatsappText)}
              >
                <MessageCircle className="w-5 h-5" /> {contact}
              </a>
            </Button>
            <Button asChild variant="outlineHero" size="lg">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" /> {back}
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export const RuPage = () => (
  <ComingSoonPage
    lang="ru"
    dir="ltr"
    path="/ru"
    metaTitle="Инженер-строитель Илья Садецкий · Лицензия №35825"
    metaDescription="Структурное проектирование, экспертные заключения и инженерные согласования в Израиле. Консультация на русском языке, ответ в течение 24 часов."
    title="Инженер-строитель · Лицензия №35825"
    subtitle="Структурное проектирование, экспертные заключения и технические согласования."
    body="Русскоязычная версия сайта готовится. Уже сейчас вы можете связаться с инженером напрямую — консультация на русском языке, ответ в течение 24 часов."
    back="К версии на иврите"
    contact="Написать в WhatsApp"
    whatsappText="Здравствуйте, я хотел бы получить консультацию по структурному проектированию."
  />
);

export const EnPage = () => (
  <ComingSoonPage
    lang="en"
    dir="ltr"
    path="/en"
    metaTitle="Licensed Structural Engineer Ilia Sadetsky · Reg. 35825"
    metaDescription="Structural design, engineering opinions and municipal approvals in Israel — pergolas, pools, interior walls. English consultation, response within 24 hours."
    title="Licensed Structural Engineer · Reg. No. 35825"
    subtitle="Structural design, engineering opinions and approvals — pergolas, pools, interior walls and more."
    body="The English version of this site is being prepared. In the meantime, feel free to contact the engineer directly — consultations in English, response within 24 hours."
    back="Back to Hebrew site"
    contact="Message on WhatsApp"
    whatsappText="Hello, I would like to inquire about a structural engineering consultation."
  />
);

export const FrPage = () => (
  <ComingSoonPage
    lang="fr"
    dir="ltr"
    path="/fr"
    metaTitle="Ingénieur en structures Ilia Sadetsky · Reg. 35825"
    metaDescription="Conception structurelle, expertises et autorisations municipales en Israël — pergolas, piscines, murs porteurs. Consultation en français sous 24 heures."
    title="Ingénieur en structures agréé · Reg. No. 35825"
    subtitle="Conception structurelle, expertises et autorisations — pergolas, piscines, murs intérieurs et plus."
    body="La version française du site est en cours de préparation. Vous pouvez dès maintenant contacter directement l'ingénieur — consultations en français, réponse sous 24 heures."
    back="Retour au site en hébreu"
    contact="Écrire sur WhatsApp"
    whatsappText="Bonjour, je souhaiterais obtenir une consultation en ingénierie des structures."
  />
);
