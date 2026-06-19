"use client";

import { useLang, type Localized } from "@/i18n/LanguageProvider";
import { Section, SectionHeader, Reveal, Icon, Pill } from "@/components/ui";
import { cx } from "@/lib/cx";

type Article = {
  category: Localized;
  title: Localized;
  excerpt: Localized;
  readMins: number;
};

const ARTICLES: Article[] = [
  {
    category: { en: "Diabetes", km: "ជំងឺទឹកនោមផ្អែម" },
    title: { en: "Understanding your HbA1c", km: "ស្វែងយល់ពី HbA1c របស់អ្នក" },
    excerpt: {
      en: "One number sums up your average blood sugar over three months. Here's what it means and when to act.",
      km: "តួលេខមួយបង្ហាញកម្រិតជាតិស្ករជាមធ្យមរយៈពេលបីខែ។ នេះជាអត្ថន័យ និងពេលដែលគួរយកចិត្តទុកដាក់។",
    },
    readMins: 6,
  },
  {
    category: { en: "Heart health", km: "សុខភាពបេះដូង" },
    title: { en: "What a lipid panel really tells you", km: "តេស្តខ្លាញ់ឈាមប្រាប់អ្វីពិតប្រាកដ" },
    excerpt: {
      en: "Cholesterol isn't one thing. We break down HDL, LDL and triglycerides, and the ratios that matter.",
      km: "កូឡេស្តេរ៉ុលមិនមែនមានតែមួយប្រភេទ។ យើងពន្យល់ HDL, LDL និងត្រីគ្លីសេរីត និងសមាមាត្រសំខាន់ៗ។",
    },
    readMins: 5,
  },
  {
    category: { en: "Nutrition", km: "អាហារូបត្ថម្ភ" },
    title: { en: "Vitamin D in a sunny country", km: "វីតាមីន D នៅប្រទេសដែលមានពន្លឺថ្ងៃច្រើន" },
    excerpt: {
      en: "Cambodia has plenty of sun, yet deficiency is common. Indoor work, sunscreen and diet all play a part.",
      km: "កម្ពុជាមានពន្លឺថ្ងៃច្រើន ប៉ុន្តែការខ្វះវីតាមីន D នៅតែជារឿងធម្មតា។ ការងារក្នុងផ្ទះ និងរបបអាហារសុទ្ធតែមានឥទ្ធិពល។",
    },
    readMins: 4,
  },
  {
    category: { en: "Before your test", km: "មុនពេលធ្វើតេស្ត" },
    title: { en: "How to prepare for a fasting blood test", km: "របៀបរៀបចំសម្រាប់តេស្តឈាមតមអាហារ" },
    excerpt: {
      en: "When fasting starts, what you can drink and the small mistakes that skew results. A simple checklist.",
      km: "ពេលណាត្រូវចាប់ផ្តើមតមអាហារ អ្វីដែលអាចផឹកបាន និងកំហុសតូចៗដែលធ្វើឱ្យលទ្ធផលឃ្លាតឆ្ងាយ។",
    },
    readMins: 3,
  },
  {
    category: { en: "Hormones", km: "អ័រម៉ូន" },
    title: { en: "Reading a thyroid result", km: "ការអានលទ្ធផលក្រពេញទីរ៉ូអ៊ីត" },
    excerpt: {
      en: "TSH, T3 and T4 work together. Learn how they connect and why one figure rarely tells the whole story.",
      km: "TSH, T3 និង T4 ដំណើរការជាមួយគ្នា។ ស្វែងយល់ពីការតភ្ជាប់ និងហេតុអ្វីលេខមួយមិនគ្រប់គ្រាន់។",
    },
    readMins: 5,
  },
  {
    category: { en: "Screening", km: "ការពិនិត្យ" },
    title: { en: "Hepatitis B: why screening matters", km: "ជំងឺរលាកថ្លើម B៖ ហេតុអ្វីការពិនិត្យសំខាន់" },
    excerpt: {
      en: "Often silent for years, it's common in the region and highly manageable when caught early.",
      km: "ច្រើនតែគ្មានរោគសញ្ញាជាច្រើនឆ្នាំ វាជារឿងធម្មតាក្នុងតំបន់ និងគ្រប់គ្រងបានល្អនៅពេលរកឃើញឆាប់។",
    },
    readMins: 6,
  },
];

function ReadFooter({ mins }: { mins: number }) {
  const { t } = useLang();
  return (
    <div className="mt-auto flex items-center justify-between pt-2">
      <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-500">
        <Icon name="clock" size={15} />
        {t({ en: `${mins} min read`, km: `អាន ${mins} នាទី` })}
      </span>
      <span className="grid size-8 place-items-center rounded-full bg-brand-50 text-brand-600 transition-colors duration-300 ease-[var(--ease-out)] group-hover/card:bg-brand-600 group-hover/card:text-white">
        <Icon name="arrow-up-right" size={16} />
      </span>
    </div>
  );
}

export function ArticleGrid() {
  const { t } = useLang();
  const [featured, ...rest] = ARTICLES;

  const cardBase =
    "group/card flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-surface p-7 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)]";

  return (
    <Section tone="default">
      <SectionHeader
        eyebrow={t({ en: "Latest guides", km: "មគ្គុទ្ទេសក៍ថ្មីៗ" })}
        title={t({ en: "Notes worth keeping", km: "ចំណាំដែលគួររក្សាទុក" })}
        lead={t({
          en: "Short reads from our clinical team. Written to make sense of a result, not to sell a test.",
          km: "អត្ថបទខ្លីៗពីក្រុមគ្រូពេទ្យរបស់យើង សរសេរដើម្បីពន្យល់លទ្ធផល មិនមែនដើម្បីលក់តេស្តឡើយ។",
        })}
      />

      <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-lg)] sm:grid-cols-2 lg:grid-cols-3">
        {/* Featured — spans two columns on wide screens */}
        <Reveal delay={1} className="sm:col-span-2 lg:col-span-2">
          <article className={cx(cardBase, "lg:p-9")}>
            <Pill tone="brand" dot="brand">
              {t(featured.category)}
            </Pill>
            <h3 className="text-h3 font-medium text-balance text-ink-900">
              {t(featured.title)}
            </h3>
            <p className="max-w-xl text-[1rem] leading-relaxed text-ink-600">
              {t(featured.excerpt)}
            </p>
            <ReadFooter mins={featured.readMins} />
          </article>
        </Reveal>

        {rest.map((article, i) => (
          <Reveal key={article.title.en} delay={(((i + 1) % 3) + 1) as 1 | 2 | 3}>
            <article className={cardBase}>
              <p className="eyebrow text-brand-600">{t(article.category)}</p>
              <h3 className="text-h4 font-medium text-balance text-ink-900">
                {t(article.title)}
              </h3>
              <p className="text-[0.9375rem] leading-relaxed text-ink-600">
                {t(article.excerpt)}
              </p>
              <ReadFooter mins={article.readMins} />
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
