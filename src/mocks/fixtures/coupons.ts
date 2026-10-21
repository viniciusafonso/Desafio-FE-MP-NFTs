export const networkFeeEth = '0.002'

export const couponFixtures = [
  {
    code: 'ORVALHO',
    percent: 10,
    expiresAt: '2027-01-01T00:00:00.000Z',
  },
  {
    code: 'SECA',
    percent: 15,
    expiresAt: '2025-12-01T00:00:00.000Z',
  },
] as const

export type CouponFixture = (typeof couponFixtures)[number]
