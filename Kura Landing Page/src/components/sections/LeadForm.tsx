"use client";

import { useState } from "react";
import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { SITE } from "@/data/site";
import { Section, Eyebrow, Button, Icon, type IconName } from "@/components/ui";

const INTERESTS: Localized[] = [
  { en: "I'm a doctor or clinic", km: "ខ្ញុំជាគ្រូពេទ្យ / គ្លីនិក" },
  { en: "Screening for my team", km: "ត្រួតពិនិត្យសុខភាពបុគ្គលិក" },
  { en: "Insurer or payer", km: "ក្រុមហ៊ុនធានារ៉ាប់រង" },
  { en: "I'm a patient", km: "ខ្ញុំជាអ្នកជំងឺ" },
  { en: "Something else", km: "ផ្សេងទៀត" },
];

export function LeadForm({
  id,
  eyebrow,
  title,
  lead,
  tone = "default",
  withContact = true,
}: {
  id?: string;
  eyebrow?: Localized;
  title?: Localized;
  lead?: Localized;
  tone?: "default" | "tint";
  withContact?: boolean;
}) {
  const { t } = useLang();
  const [sent, setSent] = useState(false);

  const contactRows: { icon: IconName; label: Localized; value: string; href: string }[] = [
    { icon: "phone", label: { en: "Call us", km: "ហៅទូរស័ព្ទ" }, value: SITE.contact.phone, href: `tel:${SITE.contact.phone.replace(/\s/g, "")}` },
    { icon: "send", label: { en: "Telegram", km: "តេឡេក្រាម" }, value: SITE.contact.telegram, href: "https://t.me/kuramed" },
    { icon: "report", label: { en: "Email", km: "អ៊ីមែល" }, value: SITE.contact.email, href: `mailto:${SITE.contact.email}` },
  ];

  return (
    <Section tone={tone} id={id}>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          {eyebrow ? <Eyebrow>{t(eyebrow)}</Eyebrow> : null}
          <h2 className="text-h2 font-medium text-balance text-ink-950">
            {t(title ?? { en: "Let's talk", km: "តោះពិភាក្សា" })}
          </h2>
          <p className="max-w-md text-lead text-ink-600">
            {t(
              lead ?? {
                en: "Tell us a little about you. We reply within one business day.",
                km: "ប្រាប់យើងបន្តិចអំពីអ្នក ហើយក្រុមការងារនឹងឆ្លើយតបក្នុងមួយថ្ងៃធ្វើការ។",
              },
            )}
          </p>
          {withContact ? (
            <div className="mt-2 flex flex-col gap-3 border-t border-[var(--hairline)] pt-6">
              {contactRows.map((r) => (
                <a key={r.value} href={r.href} className="group/contact flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-[var(--radius-md)] bg-ink-100 text-ink-700">
                    <Icon name={r.icon} size={18} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[0.75rem] uppercase tracking-wide text-ink-400">{t(r.label)}</span>
                    <span className="text-[0.9375rem] font-medium text-ink-900 group-hover/contact:text-brand-600">
                      {r.value}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--hairline)] bg-surface p-7 shadow-[var(--shadow-sm)] sm:p-8">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-success-50 text-success-600">
                <Icon name="check" size={28} />
              </span>
              <h3 className="text-h4 font-medium text-ink-900">
                {t({ en: "Thank you. We've got your message.", km: "អរគុណ — បានទទួលសារ។" })}
              </h3>
              <p className="max-w-xs text-[0.9375rem] text-ink-600">
                {t({ en: "We'll be in touch within one business day.", km: "យើងនឹងទាក់ទងក្នុងមួយថ្ងៃធ្វើការ។" })}
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="flex flex-col gap-4"
            >
              <Field label={t({ en: "Full name", km: "ឈ្មោះ" })}>
                <input required type="text" className={inputCls} placeholder={t({ en: "Dr. Sokha Chann", km: "វេជ្ជបណ្ឌិត សុខា ច័ន្ទ" })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t({ en: "Email", km: "អ៊ីមែល" })}>
                  <input required type="email" className={inputCls} placeholder="you@email.com" />
                </Field>
                <Field label={t({ en: "Phone", km: "ទូរស័ព្ទ" })}>
                  <input type="tel" className={inputCls} placeholder="+855 ..." />
                </Field>
              </div>
              <Field label={t({ en: "I'm reaching out as", km: "ខ្ញុំទាក់ទងជា" })}>
                <select className={inputCls} defaultValue="">
                  <option value="" disabled>
                    {t({ en: "Choose one", km: "ជ្រើសរើស" })}
                  </option>
                  {INTERESTS.map((opt) => (
                    <option key={opt.en} value={opt.en}>
                      {t(opt)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t({ en: "How can we help?", km: "តើយើងអាចជួយយ៉ាងណា?" })}>
                <textarea rows={4} className={inputCls} placeholder={t({ en: "A few words…", km: "ពាក្យពីរបី…" })} />
              </Field>
              <Button size="lg" full iconRight="arrow-right">
                {t({ en: "Send message", km: "ផ្ញើសារ" })}
              </Button>
              <p className="text-center text-[0.75rem] text-ink-400">
                {t({ en: "Your details stay private. We never sell them.", km: "ព័ត៌មានរបស់អ្នកជាឯកជន។" })}
              </p>
            </form>
          )}
        </div>
      </div>
    </Section>
  );
}

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-surface px-3.5 py-2.5 text-[0.9375rem] text-ink-900 transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.8125rem] font-medium text-ink-700">{label}</span>
      {children}
    </label>
  );
}
