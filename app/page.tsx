import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Your GitHub commits,{" "}
          <span className="text-[#4f6ef6]">your portfolio.</span>
        </h1>
        <p className="text-lg text-[#7b80a0] mb-10 leading-relaxed">
          Connect your GitHub account, pick the repos you want to showcase, and
          get a live portfolio page in seconds. Powered by AI that reads your
          commit history — no manual write-ups needed.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-[#4f6ef6] px-6 py-3 text-base font-medium text-white hover:bg-[#3d5bd9] transition-colors"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/FurryForWhat/EazyPortfolio"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#1a1f3a] px-6 py-3 text-base font-medium text-[#e8eaf0] hover:bg-[#0c1024] transition-colors"
          >
            View on GitHub
          </a>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {[
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
              desc: "Get a shareable link or deploy to your own hosting — your choice.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-[#1a1f3a] p-6 bg-[#0c1024]">
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-[#7b80a0]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
