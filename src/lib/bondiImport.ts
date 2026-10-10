import type { Passageiro } from "@/data/agendaData";

export const bondiIdentifiers = (orderCode: unknown, serviceCode: unknown) => {
  const sht = String(serviceCode ?? "").trim();
  const os = String(orderCode || sht).trim().split("-")[0];
  return { os, sht };
};

export const parseBondiPassengerText = (text: string, voo = ""): Passageiro[] =>
  text.split(/[\n;,]+/).map((line) => {
    const phone = line.match(/\+?\d[\d\s().-]{6,}\d/);
    const telefone = phone && phone[0].replace(/\D/g, "").length >= 8 ? phone[0].trim() : "";
    const nome = (telefone ? line.replace(telefone, "") : line)
      .replace(/(?:tel(?:efone)?|cel(?:ular)?|whatsapp)\s*:?\s*$/i, "")
      .replace(/^[\s|:–—-]+|[\s|:–—-]+$/g, "").trim();
    return { nome, telefone, voo };
  }).filter((p) => Boolean(p.nome));