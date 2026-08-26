import iranCity from 'iran-city';

type IranProvince = { id: number | string; name: string };

function allProvinces(): IranProvince[] {
  try {
    return iranCity.allProvinces() as IranProvince[];
  } catch {
    return [];
  }
}

/**
 * Resolves a stored province field (numeric id or name) to a Persian display name.
 * Never returns a bare numeric id to the customer UI.
 */
export function getProvinceName(provinceIdOrName: string): string {
  const raw = String(provinceIdOrName ?? '').trim();
  if (!raw) return '';

  const provinces = allProvinces();
  const byId = provinces.find((p) => String(p.id) === raw);
  if (byId?.name) return byId.name;

  const byName = provinces.find((p) => p.name === raw);
  if (byName?.name) return byName.name;

  // Non-numeric unknown string — show as-is; numeric unknown — hide (avoid "1")
  if (/^\d+$/.test(raw)) return '';
  return raw;
}

/** Formats "city, provinceName" for customer-facing address summaries. */
export function formatCityProvince(
  city: string,
  provinceIdOrName: string,
): string {
  const parts = [city?.trim(), getProvinceName(provinceIdOrName)].filter(
    Boolean,
  );
  return parts.join('، ');
}
