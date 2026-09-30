import Link from "next/link";

const STEPS = [
  {
    title: "Connect GitHub",
    desc: "Sign in with GitHub and select which repos to include.",
  },
  {
    title: "AI analyzes commits",
    desc: "Commit hotspots drive real problem-solving stories, not README paraphrasing.",
  },
  {
    title: "Go live",
    desc: "Get a shareable link you can put on a résumé, CV, or profile.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full text-center">
        <span className="mb-6 inline-block rounded-full border border-[#1a1f3a] bg-[#0c1024] px-3 py-1 text-xs font-medium text-[#7b80a0]">
          Open source · MIT
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
          Your GitHub commits,{" "}
          <span className="text-[#4f6ef6]">your portfolio.</span>
        </h1>
        <p className="text-base sm:text-lg text-[#7b80a0] mb-10 leading-relaxed">
          Connect your GitHub account, pick the repos you want to showcase, and
          get a live portfolio page in seconds. Powered by AI that reads your
          commit history — no manual write-ups needed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4f6ef6] px-6 py-3 text-base font-medium text-white hover:bg-[#3d5bd9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f6ef6] transition-colors"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/FurryForWhat/EazyPortfolio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1a1f3a] px-6 py-3 text-base font-medium text-[#e8eaf0] hover:bg-[#0c1024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a2f4a] transition-colors"
          >
            View on GitHub
          </a>
        </div>

        <div className="mt-16 sm:mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 text-left">
          {STEPS.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[#1a1f3a] p-6 bg-[#0c1024]"
            >
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-[#7b80a0] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
