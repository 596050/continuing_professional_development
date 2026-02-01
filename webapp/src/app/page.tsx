import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { WhatYouGet } from "@/components/WhatYouGet";
import { WhoThisIsFor } from "@/components/WhoThisIsFor";
import { HowItWorks } from "@/components/HowItWorks";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Nav />
      <Hero />
      <TrustBar />
      <WhatYouGet />
      <WhoThisIsFor />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
