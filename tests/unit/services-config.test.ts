import { describe, it, expect } from 'vitest';
import { services, siteConfig } from '../../src/config/services';

describe('services config (catálogo Divinación, Fase 1)', () => {
  it('has exactly one service: Divinación', () => {
    expect(services).toHaveLength(1);
    expect(services[0].id).toBe('divinacion');
    expect(services[0].name).toBe('Divinación');
  });

  it('has the three variants with the confirmed Cal.com slugs and prices', () => {
    const variants = services[0].variants.map((v) => ({
      duration: v.duration,
      regularPrice: v.regularPrice,
      launchPrice: v.launchPrice,
      calcomEventSlug: v.calcomEventSlug,
    }));
    expect(variants).toEqual([
      { duration: '15 min', regularPrice: 888, launchPrice: 444, calcomEventSlug: 'divinacion-15' },
      { duration: '30 min', regularPrice: 1555, launchPrice: 777, calcomEventSlug: 'divinacion-30' },
      { duration: '60 min', regularPrice: 2222, launchPrice: 1111, calcomEventSlug: 'divinacion-60' },
    ]);
  });

  it('has unique calcomEventSlugs across all variants', () => {
    const slugs = services.flatMap((s) => s.variants.map((v) => v.calcomEventSlug));
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every variant has launchPrice below regularPrice', () => {
    for (const service of services) {
      for (const variant of service.variants) {
        expect(variant.launchPrice).toBeLessThan(variant.regularPrice);
        expect(variant.launchPrice).toBeGreaterThan(0);
      }
    }
  });

  it('contains no legacy service slugs', () => {
    const legacy = ['uno-a-uno', 'lectura-de-cartas', 'divinacion-akashica', 'activacion-cuantica'];
    const slugs = services.flatMap((s) => [s.id, ...s.variants.map((v) => v.calcomEventSlug)]);
    for (const old of legacy) {
      expect(slugs).not.toContain(old);
    }
  });

  it('exposes the promo flag and label', () => {
    expect(typeof siteConfig.promoActive).toBe('boolean');
    expect(siteConfig.promoLabel.length).toBeGreaterThan(0);
  });
});
