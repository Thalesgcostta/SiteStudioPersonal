import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { states } from "./address";
import type { Address } from "./address";
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
  required = false,
}: {
  value: Address;
  onChange: (value: Address) => void;
  onBusyChange: (busy: boolean) => void;
  disabled: boolean;
  required?: boolean;
}) {
  const id = useId();
  const cep = value.cep;
  const latest = useRef(value);
  latest.current = value;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const sequence = useRef(0);
  const pending = useRef<{ controller: AbortController; cep: string } | null>(
    null,
  );
  // Sair do CEP já salvo não deve substituir número/complemento existentes.
  const lastSuccess = useRef(digitsOnly(cep));
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
      onChange({
        ...latest.current,
        cep: formatCep(digits),
        street,
        neighborhood,
        city: data.localidade.trim(),
        state: data.uf,
      });
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
              onChange({ ...value, cep: formatCep(e.target.value) });
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
        O CEP é opcional. Busque o endereço ou preencha os campos manualmente.
        Informe o número e o complemento, se houver.
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
      <div className="form-grid address-input-grid">
        {(
          [
            ["street", "Rua / logradouro", "address-line1", 200],
            ["number", "Número da residência", "off", 20],
            ["complement", "Complemento", "address-line2", 100],
            ["neighborhood", "Bairro", "address-level3", 100],
            ["city", "Cidade", "address-level2", 100],
          ] as const
        ).map(([field, label, complete, max]) => (
          <label
            key={field}
            className={`field ${field === "street" ? "span-2" : ""}`}
          >
            {label}
            <input
              value={value[field]}
              autoComplete={complete}
              maxLength={max}
              required={required && field !== "complement"}
              disabled={disabled}
              placeholder={
                field === "number" ? "Ex.: 123, 12A ou S/N" : undefined
              }
              onChange={(event) => {
                if (field !== "number" && field !== "complement") cancel();
                onChange({ ...value, [field]: event.target.value });
              }}
            />
          </label>
        ))}
        <label className="field">
          Estado
          <select
            aria-label="Estado"
            value={value.state}
            autoComplete="address-level1"
            disabled={disabled}
            required={required}
            onChange={(event) => {
              cancel();
              onChange({ ...value, state: event.target.value });
            }}
          >
            <option value="">Selecione</option>
            {states.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
