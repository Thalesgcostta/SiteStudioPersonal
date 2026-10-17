export type Address = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};
export const states = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
export const emptyAddress = (): Address => ({
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
});
export const formatAddress = (address: Address) =>
  [
    [address.street.trim(), address.number.trim()].filter(Boolean).join(", "),
    address.complement.trim(),
    address.neighborhood.trim(),
    [address.city.trim(), address.state].filter(Boolean).join("/"),
    address.cep ? `CEP ${address.cep}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
export function readAddress(student: {
  address: string;
  addressFields?: Address | null;
}): Address {
  if (student.addressFields)
    return { ...emptyAddress(), ...student.addressFields };
  const result = emptyAddress();
  const parts = student.address.split(" · ").filter(Boolean);
  for (const part of parts) {
    if (/^CEP\s/i.test(part)) result.cep = part.replace(/^CEP\s*/i, "");
    else if (/\/[A-Z]{2}$/.test(part)) {
      result.state = part.slice(-2);
      result.city = part.slice(0, -3);
    } else if (!result.street) {
      const match = part.match(/^(.*?),\s*(\d+[\w/-]*|s\/?n)$/i);
      result.street = match ? match[1] : part;
      result.number = match?.[2] || "";
    } else if (!result.neighborhood) result.neighborhood = part;
    else
      result.complement = [result.complement, part].filter(Boolean).join(" · ");
  }
  return result;
}
