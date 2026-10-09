import { BuildStory } from "@/components/landing/build-story/BuildStory";
import { CareerLevels } from "@/components/landing/CareerLevels";
import { CourseJourney } from "@/components/landing/CourseJourney";
import { CtaBand } from "@/components/landing/CtaBand";
import { Faq } from "@/components/landing/Faq";
import { FeeTiers } from "@/components/landing/FeeTiers";
import { HeroIntro } from "@/components/landing/HeroIntro";
import { ToolCards } from "@/components/landing/ToolCards";
import { TrialSteps } from "@/components/landing/TrialSteps";
import { ZaloCommunity } from "@/components/landing/ZaloCommunity";

// Section order: CLAUDE.md §5. Hero and curriculum share one scroll-driven 3D section.
export default function HomePage() {
  return (
    <>
      <BuildStory intro={<HeroIntro />} />
      <CourseJourney />
      <CareerLevels />
      <TrialSteps />
      <FeeTiers />
      <ToolCards />
      <ZaloCommunity />
      <Faq />
      <CtaBand />
    </>
  );
}
