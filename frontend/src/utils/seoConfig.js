import platformContent from '../content/platformContent';

const { brand, hero, mission_section } = platformContent;

export const seoConfig = {
  home: {
    title: `${brand.name} — ${brand.tagline}`,
    description: hero.subtext,
    keywords:
      'natural cosmetics seller platform, WhatsApp seller website, Instagram seller store, small business e-commerce India, vendor marketplace, online store for sellers',
    og_image: '/og-home.jpg',
  },

  about: {
    title: `About Us — ${brand.name}`,
    description: mission_section.body.split('\n')[0],
    keywords:
      'NativeGlow mission, empower small sellers, social media selling platform, independent seller website India',
  },

  vendor_register: {
    title: `Register Your Store — ${brand.name}`,
    description:
      'Create your free personalized online store on NativeGlow. Manage orders, showcase products, and grow your business without any technical knowledge.',
  },

  vendor_site: (vendorName, vendorCity) => ({
    title: `${vendorName} — Natural Products Store`,
    description: `Shop natural products from ${vendorName} in ${vendorCity}. Browse products, place orders directly, and pay via UPI. Powered by NativeGlow.`,
    keywords: `${vendorName}, natural cosmetics ${vendorCity}, handmade natural products, buy online ${vendorCity}`,
  }),
};
