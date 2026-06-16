import { describe, expect, it } from 'vitest'
import { formatPaymentAmount } from '../currency'

describe('formatPaymentAmount', () => {
  it('uses the currency default fraction digits', () => {
    expect(formatPaymentAmount(100, 'JPY', 'en-US')).not.toContain('.00')
    expect(formatPaymentAmount(100, 'KRW', 'en-US')).not.toContain('.00')
    expect(formatPaymentAmount(100, 'HKD', 'en-US')).toContain('.00')
  })

  it('uses an explicit yuan symbol for CNY display amounts', () => {
    expect(formatPaymentAmount(128, 'CNY', 'zh-CN')).toBe('￥128.00')
  })
})
