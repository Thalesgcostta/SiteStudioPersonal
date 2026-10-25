import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  HeartPulse,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  ScanLine,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Gallery } from "./Gallery";
import { StudioVideo } from "./StudioVideo";
import { mapEmbedUrl, mapUrl, photos, studio, whatsappLink } from "./content";
import { BrandMark, StudioPhoto } from "./StudioPhoto";
import { publicPlanDays, usePublicPlans } from "./usePublicPlans";

function TrialLink({
  className = "",
  children = "Agendar aula gratuita",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      className={`cta ${className}`}
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={20} aria-hidden="true" />
    </a>
  );
}
function Header() {
  const [expanded, setExpanded] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="site-header"
      onKeyDown={(e) => {
        if (e.key === "Escape" && expanded) {
          setExpanded(false);
          toggle.current?.focus();
        }
      }}
    >
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="container header-inner">
        <a
          className="brand"
          href="#inicio"
          aria-label="Studio Katielle Faleiros, início"
        >
          <BrandMark />
          <span>
            <strong>Katielle Faleiros</strong>
            <small>STUDIO DE PERSONAL</small>
          </span>
        </a>
        <button
          type="button"
          className="mobile-menu"
          ref={toggle}
          aria-label={expanded ? "Fechar menu" : "Abrir menu"}
          aria-expanded={expanded}
          aria-controls="site-navigation"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <X /> : <Menu />}
        </button>
        <nav
          id="site-navigation"
          className={expanded ? "is-open" : ""}
          aria-label="Navegação do site"
        >
          <a href="#studio" onClick={() => setExpanded(false)}>
            O studio
          </a>
          <a href="#metodo" onClick={() => setExpanded(false)}>
            Nosso cuidado
          </a>
          <a href="#galeria" onClick={() => setExpanded(false)}>
            Galeria
          </a>
          <a href="#planos" onClick={() => setExpanded(false)}>
            Planos
          </a>
          <TrialLink className="header-cta" />
        </nav>
      </div>
    </header>
  );
}
function Hero() {
  return (
    <section
      id="inicio"
      className="hero container"
      aria-labelledby="hero-heading"
    >
      <div className="hero-copy">
        <span className="eyebrow">
          <span className="status-dot" /> PERSONAL TRAINING · FRANCA, SP
        </span>
        <div
          className="hero-brand"
          role="img"
          aria-label="KF — Katielle Faleiros Personal Trainer"
        >
          <BrandMark className="hero-brand-mark" />
          <div className="hero-brand-name">
            KATIELLE FALEIROS<span>PERSONAL TRAINER</span>
          </div>
        </div>
        <h1 id="hero-heading">
          Seu corpo. Seu ritmo.
          <br />
          <em>Seu melhor.</em>
        </h1>
        <p>
          Um treino feito para você. Com atenção de perto, técnica em cada
          movimento e espaço para cuidar da sua saúde.
        </p>
        <div className="hero-actions">
          <TrialLink />
          <a className="text-link" href="#studio">
            Conheça o studio <ArrowDown size={17} />
          </a>
        </div>
        <div className="trainer-intro">
          <StudioPhoto photo={photos.katielle} />
          <div>
            <strong>Katielle Faleiros</strong>
            <span>Mais de 15 anos cuidando de pessoas.</span>
          </div>
        </div>
      </div>
      <div className="hero-visual">
        <div className="hero-photo-primary">
          <StudioPhoto photo={photos.guidedTraining} priority />
          <div className="hero-photo-label">
            <span className="status-dot" /> ACOMPANHAMENTO DE VERDADE
          </div>
        </div>
        <div className="hero-photo-secondary">
          <StudioPhoto photo={photos.interior} />
          <span>Seu espaço para evoluir.</span>
        </div>
        <div className="hero-stamp" aria-hidden="true">
          <Sparkles size={22} />
          <span>
            SEU TREINO.
            <br />
            SEU MOMENTO.
          </span>
        </div>
        <div className="hero-note">
          <span>01 /</span>
          <p>
            Você no centro.
            <br />
            <strong>Em cada movimento.</strong>
          </p>
          <ArrowUpRight size={28} />
        </div>
      </div>
      <div className="hero-bottom">
        <span>MENOS DISTRAÇÕES. MAIS CUIDADO.</span>
        <a href="#metodo" aria-label="Descubra nosso cuidado">
          <ArrowDown size={21} />
        </a>
        <span>SAÚDE · FORÇA · QUALIDADE DE VIDA</span>
      </div>
    </section>
  );
}
function About() {
  return (
    <section
      id="studio"
      className="about-section"
      aria-labelledby="about-heading"
    >
      <div className="container about-layout">
        <div className="about-photo-wrap">
          <StudioPhoto photo={photos.katielle} />
          <div className="experience-note">
            <strong>
              15<span>+</span>
            </strong>
            <span>
              anos de experiência.
              <br />O mesmo cuidado, todos os dias.
            </span>
          </div>
        </div>
        <div className="about-copy">
          <span className="eyebrow">PRAZER, SEU NOVO STUDIO.</span>
          <h2 id="about-heading">
            Um espaço menor.
            <br />
            <em>Uma atenção maior.</em>
          </h2>
          <p>
            No Studio de Personal Katielle Faleiros, em Franca, o treinamento
            começa com uma pessoa: você.
          </p>
          <p>
            Katielle é profissional de educação física e tem mais de 15 anos de
            experiência. Seu trabalho une treinos individualizados, correção
            próxima dos movimentos e cuidado com os objetivos de cada aluno.
          </p>
          <div className="about-values">
            <span>
              <Check size={18} />
              Treino personalizado
            </span>
            <span>
              <Check size={18} />
              Técnica e segurança
            </span>
            <span>
              <Check size={18} />
              Saúde e qualidade de vida
            </span>
          </div>
          <div className="signature">
            <span>Katielle Faleiros</span>
            <small>Profissional de educação física</small>
          </div>
          <a
            className="text-link light-link"
            href={studio.instagram}
            target="_blank"
            rel="noopener noreferrer"
          >
            Um pouco mais do nosso dia a dia <Instagram size={19} />
          </a>
        </div>
      </div>
    </section>
  );
}
function Method() {
  const [selected, setSelected] = useState(0);
  const features = [
    {
      number: "01",
      icon: Target,
      title: "O seu objetivo guia o treino.",
      text: "Treinos individualizados e personalizados, pensados para o seu ritmo e para o que faz sentido na sua rotina.",
      photo: photos.barTraining,
      caption: "Seu objetivo. Nossa orientação.",
    },
    {
      number: "02",
      icon: HeartPulse,
      title: "Atenção em cada movimento.",
      text: "Correção próxima, técnica e segurança. Um ambiente para evoluir com acompanhamento e cuidar da sua qualidade de vida.",
      photo: photos.machineCare,
      caption: "Presença e cuidado em cada repetição.",
    },
    {
      number: "03",
      icon: ScanLine,
      title: "Cuidado que olha o todo.",
      text: "Avaliações por bioimpedância para acompanhar sua composição corporal e observar sua evolução ao longo dos treinos.",
      photo: photos.ambient,
      caption: "Um espaço pensado para cuidar de você.",
    },
  ];
  return (
    <section
      id="metodo"
      className="method-section container"
      aria-labelledby="method-heading"
    >
      <div className="section-heading">
        <span className="eyebrow">CADA PESSOA, UM CAMINHO.</span>
        <h2 id="method-heading">
          Muito além
          <br />
          <em>de uma ficha de treino.</em>
        </h2>
        <p>
          Menor circulação de pessoas e uma orientação próxima para você treinar
          com confiança.
        </p>
      </div>
      <div className="method-layout">
        <div className="method-photo">
          {features.map((item, index) => (
            <div
              className={`method-photo-layer ${selected === index ? "is-active" : ""}`}
              key={item.number}
              aria-hidden={selected !== index}
            >
              <StudioPhoto photo={item.photo} />
              <span className="equipment-caption">
                <span>{item.number} /</span>
                {item.caption}
              </span>
            </div>
          ))}
          <span className="method-photo-tag" aria-hidden="true">
            FEITO PARA VOCÊ.
          </span>
        </div>
        <div className="method-features">
          <div
            className="method-options"
            role="group"
            aria-label="Conheça nosso cuidado"
          >
            {features.map((item, index) => (
              <button
                type="button"
                className="method-feature"
                key={item.number}
                aria-pressed={selected === index}
                onMouseEnter={() => setSelected(index)}
                onFocus={() => setSelected(index)}
                onClick={() => setSelected(index)}
              >
                <span className="feature-number">{item.number}</span>
                <span className="feature-content">
                  <span className="feature-heading">
                    <item.icon size={23} aria-hidden="true" />
                    <span>{item.title}</span>
                  </span>
                  <span className="feature-description">{item.text}</span>
                </span>
                <ArrowUpRight
                  className="feature-arrow"
                  size={20}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
          <a
            className="method-contact text-link"
            href={whatsappLink(
              "Olá, Katielle! Gostaria de saber mais sobre os treinos e as avaliações por bioimpedância no studio.",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Vamos conversar sobre seus objetivos <ArrowUpRight size={19} />
          </a>
        </div>
      </div>
    </section>
  );
}
function Plans() {
  const { plans, status } = usePublicPlans();
  const currency = (amount: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(amount);
  return (
    <section
      id="planos"
      className="plans-section"
      aria-labelledby="plans-heading"
    >
      <div className="container">
        <div className="plans-heading">
          <div>
            <span className="eyebrow">UM COMPROMISSO COM VOCÊ.</span>
            <h2 id="plans-heading">
              Encontre
              <br />
              <em>o seu ritmo.</em>
            </h2>
          </div>
          <p>
            Escolha a frequência que combina com a sua rotina. O acompanhamento
            personalizado faz parte de cada plano.
          </p>
        </div>
        <div className="plan-grid" aria-busy={status === "loading"}>
          {publicPlanDays.map((days) => {
            const plan = plans?.find((p) => p.days === days);
            return (
              <article key={days} className="plan-card">
                <span className="plan-label">PLANO MENSAL</span>
                <h3>
                  <strong>{days}×</strong>
                  <span>por semana</span>
                </h3>
                <p className="plan-price">
                  {plan
                    ? currency(plan.monthlyPrice)
                    : status === "loading"
                      ? "…"
                      : "Consulte"}
                  {plan && <span>/mês</span>}
                </p>
                <p className="plan-description">
                  {
                    [
                      "Presença na rotina.",
                      "Constância em movimento.",
                      "Mais dias para você.",
                      "O cuidado na sua semana.",
                    ][days - 2]
                  }
                </p>
                <ul>
                  <li>
                    <Check size={16} />
                    Treino individualizado
                  </li>
                  <li>
                    <Check size={16} />
                    Acompanhamento próximo
                  </li>
                </ul>
                <a
                  className="plan-contact"
                  href={whatsappLink(
                    `Olá, Katielle! Conheci o studio pelo site e gostaria de saber mais sobre o plano de ${days} dias por semana${plan ? `, por ${currency(plan.monthlyPrice)} ao mês` : ""}. Também quero agendar uma aula experimental gratuita.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Conversar sobre o plano de ${days} dias por semana`}
                >
                  Quero saber mais <ArrowUpRight size={18} />
                </a>
              </article>
            );
          })}
        </div>
        <p className="plan-note" role="status">
          {status === "reference"
            ? "Valores de referência do projeto, exibidos somente na apresentação local."
            : status === "unavailable"
              ? "Consulte os valores atuais com o studio pelo WhatsApp."
              : status === "loading"
                ? "Consultando os planos do studio…"
                : "Mensalidades em reais, conforme os valores atuais do studio."}{" "}
          <span>
            Avaliações e serviços complementares: consulte condições e valores.
          </span>
        </p>
      </div>
    </section>
  );
}
function Questions() {
  return (
    <section
      className="questions-section container"
      aria-labelledby="questions-heading"
    >
      <div>
        <span className="eyebrow">ANTES DO PRIMEIRO TREINO.</span>
        <h2 id="questions-heading">
          Pode chegar.
          <br />
          <em>A gente conversa.</em>
        </h2>
        <p>
          Cada começo é diferente. Tire suas dúvidas e venha conhecer o nosso
          jeito de cuidar.
        </p>
      </div>
      <div className="questions-list">
        {[
          {
            title: "Como funciona a aula experimental gratuita?",
            text: "É a oportunidade de conhecer o espaço, conversar sobre seus objetivos e experimentar o acompanhamento do studio. Combine um horário com Katielle pelo WhatsApp.",
          },
          {
            title: "Preciso já estar treinando para começar?",
            text: "O treinamento é individualizado. Converse sobre seu momento, seus objetivos e seu condicionamento para encontrar um caminho que faça sentido para você.",
          },
          {
            title: "Como agendar uma avaliação por bioimpedância?",
            text: "O studio realiza avaliações por bioimpedância para acompanhar sua composição corporal. Consulte horários, condições e valores pelo WhatsApp.",
          },
        ].map((item) => (
          <details key={item.title} name="studio-questions">
            <summary>
              {item.title}
              <ChevronDown size={21} aria-hidden="true" />
            </summary>
            <p>{item.text}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
function Contact() {
  return (
    <section
      id="contato"
      className="contact-section"
      aria-labelledby="contact-heading"
    >
      <div className="container contact-layout">
        <div>
          <span className="eyebrow">SEU PRÓXIMO PASSO.</span>
          <h2 id="contact-heading">
            Comece por
            <br />
            <em>uma aula gratuita.</em>
          </h2>
          <p>
            Conheça o studio. Sinta a diferença de treinar com alguém que olha
            para você. A gente te espera em Franca.
          </p>
          <TrialLink className="contact-cta">
            Agendar aula experimental gratuita
          </TrialLink>
          <span className="contact-note">
            Converse diretamente com Katielle pelo WhatsApp.
          </span>
        </div>
        <div className="contact-details">
          <div className="contact-logo">
            <StudioPhoto photo={photos.logo} />
          </div>
          <div>
            <MapPin size={23} />
            <span>ONDE ESTAMOS</span>
            <strong>{studio.street}</strong>
            <p>
              {studio.neighborhood} · {studio.location}
              <br />
              CEP {studio.postalCode}
            </p>
            <a href={mapUrl} target="_blank" rel="noopener noreferrer">
              Abrir no Google Maps <ArrowUpRight size={16} />
            </a>
          </div>
          <div>
            <MessageCircle size={23} />
            <span>VAMOS CONVERSAR?</span>
            <a
              className="contact-phone"
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
            >
              {studio.phone}
            </a>
            <p>Consulte os horários e agende sua visita.</p>
          </div>
          <div>
            <Instagram size={23} />
            <span>NOSSO DIA A DIA</span>
            <a
              className="contact-phone"
              href={studio.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              @katiifaleiros <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
        <div className="contact-map">
          <div className="map-frame">
            <iframe
              title="Localização do Studio Katielle Faleiros em Franca"
              src={mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <div className="map-caption">
            <p>
              <MapPin size={19} aria-hidden="true" />
              <span>
                {studio.street}
                <small>
                  {studio.neighborhood} · Franca, SP · {studio.postalCode}
                </small>
              </span>
            </p>
            <a href={mapUrl} target="_blank" rel="noopener noreferrer">
              Ver localização <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
export default function App() {
  return (
    <>
      <Header />
      <main id="conteudo" tabIndex={-1}>
        <Hero />
        <About />
        <Method />
        <StudioVideo />
        <Gallery />
        <Plans />
        <Questions />
        <Contact />
      </main>
      <footer className="site-footer">
        <div className="container footer-inner">
          <a
            className="brand"
            href="#inicio"
            aria-label="Voltar ao início do site"
          >
            <BrandMark />
            <span>
              <strong>Katielle Faleiros</strong>
              <small>STUDIO DE PERSONAL</small>
            </span>
          </a>
          <span>Franca, SP · Movimento com atenção.</span>
          <p>© {new Date().getFullYear()} Studio Katielle Faleiros</p>
        </div>
      </footer>
      <aside className="floating-contact" aria-label="Contato rápido">
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Agendar aula experimental gratuita pelo WhatsApp"
        >
          <MessageCircle size={27} />
          <span>Vamos conversar?</span>
        </a>
      </aside>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsActivityLocation",
            name: studio.name,
            description:
              "Studio de personal em Franca, SP, com treinamento individualizado, orientação próxima e mais de 15 anos de experiência de Katielle Faleiros.",
            telephone: "+5516992148454",
            hasMap: mapUrl,
            address: {
              "@type": "PostalAddress",
              streetAddress: `${studio.street} - ${studio.neighborhood}`,
              postalCode: studio.postalCode,
              addressLocality: "Franca",
              addressRegion: "SP",
              addressCountry: "BR",
            },
            sameAs: [studio.instagram],
          }),
        }}
      />
    </>
  );
}
