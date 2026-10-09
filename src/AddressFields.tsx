import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
class PostalLookupError extends Error {}

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 8);
const formatCep = (value: string) => {
  const digits = digitsOnly(value);
  return digits.length > 5
    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
    : digits;
};

export function AddressFields({
  value,
  onChange,
  onBusyChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onBusyChange: (busy: boolean) => void;
  disabled: boolean;
}) {
  const id = useId();
  const storedCep = value.match(/\bCEP\s*(\d{5}-?\d{3})\b/i)?.[1] || "";
  const [cep, setCep] = useState(storedCep);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const sequence = useRef(0);
  const pending = useRef<{ controller: AbortController; cep: string } | null>(
    null,
  );
  // Sair do CEP já salvo não deve substituir número/complemento existentes.
  const lastSuccess = useRef(digitsOnly(storedCep));
  useEffect(
    () => () => {
      sequence.current++;
      pending.current?.controller.abort();
    },
    [],
  );
  const cancel = () => {
    sequence.current++;
    pending.current?.controller.abort();
    pending.current = null;
    setBusy(false);
    onBusyChange(false);
    setMessage("");
    setError(false);
  };
  const lookup = async (explicit = false) => {
    if (disabled) return;
    const digits = digitsOnly(cep);
    if (digits.length !== 8) {
      if (explicit) {
        setError(true);
        setMessage("Informe um CEP com 8 dígitos.");
      }
      return;
    }
    if (
      pending.current?.cep === digits ||
      (!explicit && lastSuccess.current === digits)
    )
      return;
    pending.current?.controller.abort();
    const current = ++sequence.current;
    const controller = new AbortController();
    pending.current = { controller, cep: digits };
    setBusy(true);
    onBusyChange(true);
    setError(false);
    setMessage("Buscando endereço…");
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 8000);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok)
        throw new PostalLookupError(
          "Não foi possível consultar o CEP. Tente novamente ou preencha o endereço manualmente.",
        );
      const data: {
        erro?: boolean | string;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      } = await response.json();
      if (current !== sequence.current) return;
      if (data?.erro)
        throw new PostalLookupError(
          "CEP não encontrado. Confira os números ou preencha o endereço manualmente.",
        );
      if (
        typeof data?.localidade !== "string" ||
        !data.localidade.trim() ||
        typeof data.uf !== "string" ||
        !/^[A-Z]{2}$/.test(data.uf)
      ) {
        throw new PostalLookupError(
          "A consulta não retornou um endereço válido. Você pode preenchê-lo manualmente.",
        );
      }
      const street =
        typeof data.logradouro === "string" ? data.logradouro.trim() : "";
      const neighborhood =
        typeof data.bairro === "string" ? data.bairro.trim() : "";
      onChange(
        [
          street,
          neighborhood,
          `${data.localidade}/${data.uf}`,
          `CEP ${formatCep(digits)}`,
        ]
          .filter(Boolean)
          .join(" · "),
      );
      lastSuccess.current = digits;
      setMessage(
        street
          ? "Endereço encontrado. Confira os dados e acrescente número e complemento."
          : "Cidade e estado encontrados. Complete rua, bairro, número e complemento.",
      );
    } catch (e) {
      if (current !== sequence.current) return;
      setError(true);
      setMessage(
        timedOut
          ? "A consulta demorou para responder. Tente novamente ou preencha o endereço manualmente."
          : e instanceof PostalLookupError
            ? e.message
            : "Não foi possível consultar o CEP. Tente novamente ou preencha o endereço manualmente.",
      );
    } finally {
      clearTimeout(timeout);
      if (current === sequence.current) {
        pending.current = null;
        setBusy(false);
        onBusyChange(false);
      }
    }
  };
  return (
    <div className="address-fields span-2">
      <div className="cep-row">
        <label className="field" htmlFor={`${id}-cep`}>
          CEP
          <input
            id={`${id}-cep`}
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="00000-000"
            maxLength={9}
            value={cep}
            disabled={disabled}
            aria-describedby={`${id}-help${message ? ` ${id}-message` : ""}`}
            aria-invalid={error || undefined}
            onChange={(e) => {
              cancel();
              setCep(formatCep(e.target.value));
            }}
            onBlur={() => void lookup()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void lookup(true);
              }
            }}
          />
        </label>
        <button
          className="button secondary"
          type="button"
          disabled={disabled || busy}
          onClick={() => void lookup(true)}
        >
          {busy ? (
            <LoaderCircle size={16} className="cep-spinner" />
          ) : (
            <Search size={16} />
          )}{" "}
          {busy ? "Buscando…" : "Buscar CEP"}
        </button>
      </div>
      <p id={`${id}-help`} className="subtle-note cep-help">
        Informe o CEP para preencher rua, bairro, cidade e estado. Número e
        complemento devem ser informados por você.
      </p>
      {message && (
        <p
          id={`${id}-message`}
          className={error ? "form-error cep-message" : "cep-message"}
          role={error ? "alert" : "status"}
        >
          {message}
        </p>
      )}
      <div className="field">
        <label htmlFor={`${id}-address`}>Endereço</label>
        <textarea
          id={`${id}-address`}
          rows={2}
          autoComplete="street-address"
          value={value}
          disabled={disabled}
          placeholder="Rua, número, complemento, bairro, cidade e estado"
          onChange={(e) => {
            cancel();
            onChange(e.target.value);
          }}
        />
      </div>
    </div>
  );
}
