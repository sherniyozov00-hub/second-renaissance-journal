import "server-only";
import QRCode from "qrcode";

/** Inline SVG QR code (certificate verification link, TZ 14). */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 0,
    color: { dark: "#0B1F4D", light: "#FFFFFF" },
  });
}
