import type { Metadata } from "next";
import { mikePlatformAssets } from "@/lib/mikePlatformAssets";

const SOCIAL_IMAGE = mikePlatformAssets.openGraphCard;

type PublicMetadataInput = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  canonicalPath?: `/${string}` | "/";
  socialImage?: { src: string; alt: string };
};

export function publicPageMetadata({
  title,
  description,
  path,
  canonicalPath = path,
  socialImage,
}: PublicMetadataInput): Metadata {
  const socialTitle = title.includes("Ask Magic Mike") ? title : `${title} | Ask Magic Mike`;
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
      images: [{
        url: socialImage?.src ?? SOCIAL_IMAGE.src,
        width: SOCIAL_IMAGE.width,
        height: SOCIAL_IMAGE.height,
        alt: socialImage?.alt ?? SOCIAL_IMAGE.alt,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [socialImage?.src ?? SOCIAL_IMAGE.src],
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
