"use client";

import { useId, useState } from "react";

export const NATIVE_PUBLICATION_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const APPROVED_DESTINATION_PATHS = new Set(["/ask", "/home-value", "/buy", "/rent"]);
const APPROVED_UTM_MEDIA = new Set(["organic_local", "social_organic"]);
const REQUIRED_UTM_KEYS = ["utm_campaign", "utm_content", "utm_medium", "utm_source"];
const SAFE_UTM_VALUE = /^[a-z0-9_-]{1,96}$/;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

type HandoffState =
  | "idle"
  | "preparing"
  | "ready"
  | "handed_off"
  | "share_failed"
  | "unsupported"
  | "failed";

export interface NativePublicationHandoffProps {
  assetHref: string;
  channelLabel: string;
  filename: string;
  shareText: string;
  shareTitle: string;
  trackedUrl: string;
}

const STATE_COPY: Record<HandoffState, string> = {
  idle: "Two explicit taps are required. The first securely prepares the approved image; the second opens your device share sheet.",
  preparing: "Preparing the approved private image…",
  ready: "Image ready. Tap again to open the device share sheet. You still choose the destination and approve any native post.",
  handed_off: "Handed to the device share sheet. This is not publication proof; verify the native platform state before recording evidence.",
  share_failed: "The device handoff failed or was rejected. Nothing was published; the prepared image remains ready to try again.",
  unsupported: "This browser cannot share the approved image as a file. Use the existing download and copy controls instead.",
  failed: "The protected image could not be prepared. No content was posted or transmitted to a native platform.",
};

function hasUnsafeControlCharacter(value: string) {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
  });
}

function trustedHandoffInput(input: NativePublicationHandoffProps) {
  if (!/^[a-z0-9-]+\.png$/.test(input.filename)) return false;
  if (!/^\/api\/admin\/distribution\/assets\/[a-z_]+\/[a-z_]+\?format=(feed|story)$/.test(input.assetHref)) {
    return false;
  }
  if (
    input.channelLabel.length < 1
    || input.channelLabel.length > 80
    || input.shareTitle.length < 1
    || input.shareTitle.length > 180
    || input.shareText.length < 1
    || input.shareText.length > 2_500
    || hasUnsafeControlCharacter(input.channelLabel)
    || hasUnsafeControlCharacter(input.shareTitle)
    || hasUnsafeControlCharacter(input.shareText)
  ) {
    return false;
  }

  try {
    const url = new URL(input.trackedUrl);
    const queryKeys = [...url.searchParams.keys()].sort();
    const source = url.searchParams.get("utm_source") ?? "";
    const medium = url.searchParams.get("utm_medium") ?? "";
    const content = url.searchParams.get("utm_content") ?? "";
    return url.origin === "https://www.askmagicmike.com"
      && !url.username
      && !url.password
      && !url.hash
      && APPROVED_DESTINATION_PATHS.has(url.pathname)
      && queryKeys.length === REQUIRED_UTM_KEYS.length
      && queryKeys.every((key, index) => key === REQUIRED_UTM_KEYS[index])
      && SAFE_UTM_VALUE.test(source)
      && APPROVED_UTM_MEDIA.has(medium)
      && url.searchParams.get("utm_campaign") === "amm_owned_demand_2026"
      && SAFE_UTM_VALUE.test(content)
      && input.shareText.includes(input.trackedUrl);
  } catch {
    return false;
  }
}

async function isPngBlob(blob: Blob) {
  if (blob.type.toLowerCase() !== "image/png") return false;
  const prefix = blob.slice(0, PNG_SIGNATURE.length);
  const buffer = typeof prefix.arrayBuffer === "function"
    ? await prefix.arrayBuffer()
    : await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          if (reader.result instanceof ArrayBuffer) resolve(reader.result);
          else reject(new Error("invalid_asset_reader_result"));
        }, { once: true });
        reader.addEventListener("error", () => reject(new Error("invalid_asset_reader_error")), { once: true });
        reader.readAsArrayBuffer(prefix);
      });
  const signature = new Uint8Array(buffer);
  return signature.length === PNG_SIGNATURE.length
    && PNG_SIGNATURE.every((byte, index) => signature[index] === byte);
}

function isAbortError(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "name" in error
    && error.name === "AbortError";
}

export function NativePublicationHandoff(props: NativePublicationHandoffProps) {
  const statusId = useId();
  const [state, setState] = useState<HandoffState>("idle");
  const [preparedFile, setPreparedFile] = useState<File | null>(null);

  async function prepareImage() {
    if (
      typeof navigator.share !== "function"
      || typeof navigator.canShare !== "function"
    ) {
      setState("unsupported");
      return;
    }
    if (!trustedHandoffInput(props)) {
      setState("failed");
      return;
    }

    setState("preparing");
    try {
      const response = await fetch(props.assetHref, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "image/png" },
      });
      const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim();
      if (!response.ok || contentType !== "image/png") throw new Error("invalid_asset_response");

      const blob = await response.blob();
      if (blob.size < 1 || blob.size > NATIVE_PUBLICATION_MAX_IMAGE_BYTES) {
        throw new Error("invalid_asset_size");
      }
      if (!(await isPngBlob(blob))) throw new Error("invalid_asset_content");

      const file = new File([blob], props.filename, { type: "image/png" });
      if (!navigator.canShare({ files: [file] })) {
        setState("unsupported");
        return;
      }

      setPreparedFile(file);
      setState("ready");
    } catch {
      setPreparedFile(null);
      setState("failed");
    }
  }

  async function openShareSheet() {
    if (!preparedFile) {
      await prepareImage();
      return;
    }

    try {
      await navigator.share({
        files: [preparedFile],
        text: props.shareText,
        title: props.shareTitle,
        url: props.trackedUrl,
      });
      setState("handed_off");
    } catch (error) {
      if (isAbortError(error)) {
        setState("ready");
        return;
      }
      setState("share_failed");
    }
  }

  const label = state === "preparing"
    ? "Preparing image"
    : preparedFile
      ? state === "handed_off" ? "Open share sheet again" : "Open device share sheet"
      : "Prepare native share";

  return (
    <div className="mt-3 rounded-xl border border-[#4baab833] bg-[#061417] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#9edbe2]">
            Mobile native handoff · {props.channelLabel}
          </p>
          <p id={statusId} role="status" aria-live="polite" className="mt-1 max-w-xl text-[11px] leading-5 text-[#8bbfc6]">
            {STATE_COPY[state]}
          </p>
        </div>
        <button
          type="button"
          onClick={openShareSheet}
          disabled={state === "preparing" || state === "unsupported"}
          aria-describedby={statusId}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#4baab866] bg-[#4baab818] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.11em] text-[#bff8ff] transition hover:bg-[#4baab82b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9edbe2] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {label}
        </button>
      </div>
    </div>
  );
}
