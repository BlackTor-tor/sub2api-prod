export const DEFAULT_PAYMENT_CURRENCY = 'CNY'
export const DEFAULT_PAYMENT_DISPLAY_CURRENCY = 'USD'

const PAYMENT_DISPLAY_SYMBOLS: Record<string, string> = {
  CNY: '￥',
  USD: '$',
}

export function normalizePaymentCurrency(currency?: string | null): string {
  const normalized = String(currency || '').trim().toUpperCase()
  return /^[A-Z]{3}$/.test(normalized) ? normalized : DEFAULT_PAYMENT_CURRENCY
}

export function normalizePaymentDisplayCurrency(currency?: string | null): string {
  const normalized = String(currency || '').trim().toUpperCase()
  return normalized === 'CNY' || normalized === 'USD' ? normalized : DEFAULT_PAYMENT_DISPLAY_CURRENCY
}

function paymentCurrencyFractionDigits(currency: string): number {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

export function formatPaymentAmount(amount: number | null | undefined, currency?: string | null, locale?: string): string {
  const normalized = normalizePaymentCurrency(currency)
  const fractionDigits = paymentCurrencyFractionDigits(normalized)
  const value = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  const explicitSymbol = PAYMENT_DISPLAY_SYMBOLS[normalized]
  if (explicitSymbol) {
    return `${explicitSymbol}${value.toFixed(fractionDigits)}`
  }
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency: normalized,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value)
  } catch {
    return `${normalized} ${value.toFixed(fractionDigits)}`
  }
}
