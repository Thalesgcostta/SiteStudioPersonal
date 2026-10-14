import { useId, useState } from "react";
import { normalize } from "./data";
import type { Student } from "./data";
export function StudentPicker({
  students,
  value,
  onChange,
  required = false,
  label = "Aluno",
  searchLabel = "Pesquisar aluno",
}: {
  students: Student[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  label?: string;
  searchLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const id = useId();
  const matches = students.filter((s) =>
    normalize(s.name).includes(normalize(query)),
  );
  return (
    <div className="student-picker">
      <label className="field" htmlFor={`${id}-search`}>
        {searchLabel}
        <input
          id={`${id}-search`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite o nome do aluno"
          autoComplete="off"
        />
      </label>
      <label className="field" htmlFor={`${id}-select`}>
        {label}
        {required ? " *" : ""}
        <select
          id={`${id}-select`}
          aria-label={label}
          required={required}
          value={matches.some((s) => s.id === value) ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {matches.length ? "Selecione o aluno" : "Nenhum aluno encontrado"}
          </option>
          {matches.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <p className="subtle-note">
        {matches.length}{" "}
        {matches.length === 1 ? "aluno encontrado" : "alunos encontrados"}
      </p>
    </div>
  );
}
