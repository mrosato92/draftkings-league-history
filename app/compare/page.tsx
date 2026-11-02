import { redirect } from "next/navigation";
export default async function Compare({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value)
      ? value
      : value === undefined
        ? []
        : [value])
      query.append(key, v);
  }
  redirect(`/rivalries${query.size ? `?${query}` : ""}`);
}
