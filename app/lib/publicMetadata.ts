import type { Metadata } from "next";

const SOCIAL_IMAGE = {
  url: "/brand/black-diamond/hero-social-4x5.jpg",
  width: 1080,
  height: 1350,
  alt: "Ask Magic Mike real estate guidance from Our Town Properties in Wilson, North Carolina",
};

type PublicMetadataInput = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  canonicalPath?: `/${string}` | "/";
};

export function publicPageMetadata({
  title,
  description,
  path,
  canonicalPath = path,
}: PublicMetadataInput): Metadata {
  const socialTitle = `${title} | Ask Magic Mike`;
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title: socialTitle,
      description,
      url: canonicalPath,
      siteName: "Ask Magic Mike",
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [SOCIAL_IMAGE.url],
    },
  };
}

export function nonIndexablePageMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: null,
    openGraph: null,
    twitter: null,
    robots: { index: false, follow: false, nocache: true },
  };
}
