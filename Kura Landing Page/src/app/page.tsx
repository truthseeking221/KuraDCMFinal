import {
  SearchHero,
  CategoryGrid,
  TopBookedPackages,
  CheckupsByAudience,
  TrustMarquee,
  HowItWorks,
  KuraGallery,
  BrowseByConcern,
  AudienceGrid,
  ResultsFeature,
  CoverageMap,
  Testimonials,
  FaqSection,
} from "@/components/sections";
import { CTASection } from "@/components/site/CTASection";

export default function HomePage() {
  return (
    <>
      <SearchHero />
      <CategoryGrid tone="tint" />
      <TopBookedPackages tone="default" />
      <CheckupsByAudience tone="tint" />
      <KuraGallery tone="default" />
      <TrustMarquee />
      <HowItWorks tone="default" />
      <BrowseByConcern tone="tint" />
      <AudienceGrid tone="default" />
      <ResultsFeature tone="tint" />
      <CoverageMap tone="default" />
      <Testimonials tone="tint" />
      <FaqSection tone="default" limit={5} />
      <CTASection />
    </>
  );
}
