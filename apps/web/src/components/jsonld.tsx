import React from "react";

export interface JsonLdProps {
  schema: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * JsonLd component to inject structured data (schema.org) into the page.
 * Uses dangerouslySetInnerHTML safely with a stringified JSON schema.
 */
export function JsonLd({ schema }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function makeWebsiteSchema(opts: { name: string; url: string; potentialAction?: unknown }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: opts.name,
    url: opts.url,
    ...(opts.potentialAction ? { potentialAction: opts.potentialAction } : {}),
  };
}

export function makeOrganizationSchema(opts: { name: string; url: string; logoUrl?: string; sameAs?: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: opts.name,
    url: opts.url,
    ...(opts.logoUrl ? { logo: opts.logoUrl } : {}),
    ...(opts.sameAs ? { sameAs: opts.sameAs } : {}),
  };
}

export function makeArticleSchema(opts: {
  headline: string;
  description?: string;
  image?: string | string[];
  datePublished: string;
  dateModified?: string;
  authorName: string;
  publisherName: string;
  publisherLogoUrl?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    image: opts.image,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: {
      "@type": "Person",
      name: opts.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: opts.publisherName,
      logo: opts.publisherLogoUrl
        ? {
            "@type": "ImageObject",
            url: opts.publisherLogoUrl,
          }
        : undefined,
    },
  };
}

export function makeProductSchema(opts: {
  name: string;
  description?: string;
  image?: string | string[];
  price: string;
  priceCurrency: string;
  availability?: string;
  ratingValue?: number;
  reviewCount?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    description: opts.description,
    image: opts.image,
    offers: {
      "@type": "Offer",
      price: opts.price,
      priceCurrency: opts.priceCurrency,
      availability: opts.availability ?? "https://schema.org/InStock",
    },
    ...(opts.ratingValue ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: opts.ratingValue.toString(),
        reviewCount: opts.reviewCount?.toString() ?? "1",
      },
    } : {}),
  };
}
