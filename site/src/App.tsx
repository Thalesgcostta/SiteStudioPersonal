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
import { photos, studio, whatsappLink } from "./content";
import { BrandMark, StudioPhoto } from "./StudioPhoto";
import { usePublicPlans } from "./usePublicPlans";

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
        <h1 id="hero-heading">
          Seu corpo.
          <br />
          Seu ritmo.
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
          <StudioPhoto photo={photos.portrait} priority />
          <div>
            <strong>Katielle Faleiros</strong>
            <span>Mais de 15 anos cuidando de pessoas.</span>
          </div>
        </div>
      </div>
      <div className="hero-visual">
        <div className="hero-photo-primary">
          <StudioPhoto photo={photos.together} priority />
          <div className="hero-photo-label">
            <span className="status-dot" /> ACOMPANHAMENTO DE VERDADE
          </div>
        </div>
        <div className="hero-photo-secondary">
          <StudioPhoto photo={photos.individual} />
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
        <div className="equipment-photo">
          <StudioPhoto photo={photos.equipment} />
          <span className="equipment-caption">
            Estrutura para o seu movimento.
          </span>
        </div>
        <div className="method-features">
          {[
            {
              number: "01",
              icon: Target,
              title: "O seu objetivo guia o treino.",
              text: "Treinos individualizados e personalizados, pensados para o seu ritmo e para o que faz sentido na sua rotina.",
            },
            {
              number: "02",
              icon: HeartPulse,
              title: "Atenção em cada movimento.",
              text: "Correção próxima, técnica e segurança. Um ambiente para evoluir com acompanhamento e cuidar da sua qualidade de vida.",
            },
            {
              number: "03",
              icon: ScanLine,
              title: "Cuidado que olha o todo.",
              text: "Avaliações por bioimpedância para acompanhar seu caminho e parceria com o nutricionista Vinícius para apoiar o cuidado com a alimentação.",
            },
          ].map((item) => (
            <article className="method-feature" key={item.number}>
              <span className="feature-number">{item.number}</span>
              <div>
                <item.icon size={23} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
          <a
            className="method-contact text-link"
            href={whatsappLink(
              "Olá, Katielle! Gostaria de saber mais sobre os treinos, a bioimpedância e a parceria com nutrição no studio.",
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
          {[1, 2, 3, 4, 5].map((days) => {
            const plan = plans?.find((p) => p.days === days);
            return (
              <article
                key={days}
                className={`plan-card ${days === 3 ? "featured-plan" : ""}`}
              >
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
                      "Seu primeiro compromisso.",
                      "Presença na rotina.",
                      "Constância em movimento.",
                      "Mais dias para você.",
                      "O cuidado na sua semana.",
                    ][days - 1]
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
                    `Olá, Katielle! Conheci o studio pelo site e gostaria de saber mais sobre o plano de ${days} ${days === 1 ? "dia" : "dias"} por semana${plan ? `, por ${currency(plan.monthlyPrice)} ao mês` : ""}. Também quero agendar uma aula experimental gratuita.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Conversar sobre o plano de ${days} ${days === 1 ? "dia" : "dias"} por semana`}
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
            title: "Como agendar bioimpedância ou consultar a nutrição?",
            text: "O studio realiza avaliações por bioimpedância e conta com a parceria do nutricionista Vinícius. Consulte agendamentos, condições e valores desses serviços pelo WhatsApp.",
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
            <strong>Franca, São Paulo</strong>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Studio%20de%20Personal%20Katielle%20Faleiros%20Franca%20SP"
              target="_blank"
              rel="noopener noreferrer"
            >
              Buscar o studio no mapa <ArrowUpRight size={16} />
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
            address: {
              "@type": "PostalAddress",
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
