"use client";

import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { startTransition, useActionState, useRef, useState } from "react";
import { saveAvatarAction, type AvatarState } from "@/app/[locale]/kabinet/actions";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/styles";

const SIZE = 320;

/** Crops the picture to a centred square and re-encodes it as a small JPEG. */
async function toSquareJpeg(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  );
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

export function AvatarForm({
  name,
  src,
  hasProfile,
}: {
  name: string;
  src: string | null;
  hasProfile: boolean;
}) {
  const t = useTranslations("cabinet.avatar");
  const [state, action, pending] = useActionState<AvatarState, FormData>(saveAvatarAction, {});
  const [preparing, setPreparing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const busy = pending || preparing;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLocalError(null);
    setPreparing(true);
    void toSquareJpeg(file).then((blob) => {
      setPreparing(false);
      if (!blob) {
        setLocalError("bad_file");
        return;
      }
      const form = new FormData();
      form.set("avatar", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      startTransition(() => action(form));
    });
  }

  const error = localError ?? state.error;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar name={name} src={src} className="size-24 text-[34px]" />
      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink">{t("title")}</p>
        {hasProfile ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onPick}
              aria-label={t("upload")}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className={buttonClass("secondary", "md", "gap-2")}
            >
              <Camera className="size-4" aria-hidden />
              {busy ? t("uploading") : src ? t("change") : t("upload")}
            </button>
            {src ? (
              <form action={action}>
                <button
                  name="intent"
                  value="remove"
                  disabled={busy}
                  className="h-11 px-2 text-sm text-text-2 hover:text-danger hover:underline"
                >
                  {t("remove")}
                </button>
              </form>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-text-2">{t("saveFirst")}</p>
        )}
        <p className="text-xs text-muted">{t("hint")}</p>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {t(`err_${error}`)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
