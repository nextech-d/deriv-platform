"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  GraduationCap,
  HelpCircle,
  Play,
  Search,
  Sparkles,
} from "lucide-react";
import {
  COURSE_FAQS,
  COURSE_GUIDES,
  COURSE_STRATEGIES,
  COURSE_TABS,
  COURSE_VIDEOS,
  INTRO_CHAPTERS,
  stripCourseHtml,
  type CourseContentBlock,
  type CourseTabId,
  type IntroChapter,
  type QuickStrategyId,
} from "@/lib/terminal/deriv-course";
import {
  COURSE_STRATEGY_CHAPTERS,
  courseImage,
} from "@/lib/terminal/deriv-course-chapters";
import { cn } from "@/lib/utils/cn";

interface DerivCourseDeskProps {
  onOpenBuilder?: () => void;
  onOpenFreeBots?: () => void;
  onLoadStrategy?: (
    strategyId: QuickStrategyId,
    values: Record<string, number>,
  ) => void;
  embedded?: boolean;
}

function CourseHtml({ html }: { html: string }) {
  return (
    <span
      className="deriv-course-html"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ChapterReader({ blocks }: { blocks: CourseContentBlock[] }) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const sections = useMemo(() => {
    const grouped: Array<{ key: string; title: string; items: CourseContentBlock[] }> =
      [];
    let current: { key: string; title: string; items: CourseContentBlock[] } | null =
      null;

    for (const block of blocks) {
      if (block.type === "subtitle") {
        if (current) grouped.push(current);
        const title = block.content?.[0] ?? "Section";
        current = { key: title, title, items: [] };
        continue;
      }
      if (!current) {
        current = { key: "overview", title: "Overview", items: [] };
      }
      current.items.push(block);
    }
    if (current) grouped.push(current);
    return grouped;
  }, [blocks]);

  return (
    <div className="deriv-course-chapter-body">
      {sections.map((section) => {
        const open = openSections[section.key] ?? true;
        return (
          <section key={section.key} className="deriv-course-section">
            <button
              type="button"
              className="deriv-course-section-title"
              aria-expanded={open}
              onClick={() =>
                setOpenSections((prev) => ({
                  ...prev,
                  [section.key]: !(prev[section.key] ?? true),
                }))
              }
            >
              <span>{section.title}</span>
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
            </button>
            {open ? (
              <div className="deriv-course-section-body">
                {section.items.map((block, index) => {
                  if (block.type === "text") {
                    return (
                      <div
                        key={`text-${section.key}-${index}`}
                        className={cn(
                          "deriv-course-text-block",
                          block.className === "no-margin" &&
                            "deriv-course-text-block--tight",
                          block.className === "top-margin" &&
                            "deriv-course-text-block--spaced",
                          block.className === "italic" &&
                            "deriv-course-text-block--italic",
                        )}
                      >
                        {block.content?.map((line) => (
                          <p key={line}>
                            <CourseHtml html={line} />
                          </p>
                        ))}
                      </div>
                    );
                  }
                  if (block.type === "media") {
                    return (
                      <figure
                        key={`media-${section.key}-${index}`}
                        className={cn(
                          "deriv-course-media",
                          block.className === "formula" && "deriv-course-media--formula",
                        )}
                      >
                        <img
                          src={courseImage(block.src ?? "")}
                          alt={block.alt ?? ""}
                          className="deriv-course-media-light"
                        />
                        {block.dark_src ? (
                          <img
                            src={courseImage(block.dark_src)}
                            alt={block.alt ?? ""}
                            className="deriv-course-media-dark"
                          />
                        ) : null}
                      </figure>
                    );
                  }
                  return null;
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function IntroPanel({
  chapters,
  activeId,
  onSelect,
  query,
}: {
  chapters: IntroChapter[];
  activeId: string;
  onSelect: (id: string) => void;
  query: string;
}) {
  const filtered = useMemo(() => {
    if (!query) return chapters;
    return chapters.filter(
      (ch) =>
        ch.title.toLowerCase().includes(query) ||
        ch.sections.some(
          (s) =>
            s.heading.toLowerCase().includes(query) ||
            s.body.some((line) => line.toLowerCase().includes(query)),
        ),
    );
  }, [chapters, query]);

  const active = filtered.find((ch) => ch.id === activeId) ?? filtered[0];

  return (
    <div className="deriv-course-intro">
      <div className="deriv-course-intro-hero">
        <GraduationCap className="h-8 w-8 text-accent" strokeWidth={1.5} />
        <div>
          <h3 className="text-base font-semibold tracking-tight">
            Introduction to Deriv Trading
          </h3>
          <p className="mt-1 text-sm text-muted leading-relaxed max-w-2xl">
            A comprehensive guide from beginner to advanced trading. Master Deriv
            trading with this in-depth, professional course. From basic concepts to
            advanced strategies, risk management to psychological mastery — this guide
            will transform you into a confident, disciplined Deriv trader.
          </p>
          <p className="mt-2 text-[10px] font-mono text-muted tracking-wide">
            {chapters.length} chapters · sourced from{" "}
            <a
              href="https://traders-academy.deriv.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2"
            >
              Deriv Academy
            </a>{" "}
            &{" "}
            <a
              href="https://deriv.com/help-centre"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2"
            >
              Help Centre
            </a>
          </p>
        </div>
      </div>

      <div className="deriv-course-intro-layout">
        <aside className="deriv-course-intro-toc" aria-label="Chapters">
          {filtered.map((ch, index) => (
            <button
              key={ch.id}
              type="button"
              className={cn(
                "deriv-course-intro-toc-item",
                active?.id === ch.id && "deriv-course-intro-toc-item--active",
              )}
              onClick={() => onSelect(ch.id)}
            >
              <span className="deriv-course-intro-toc-num font-mono">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{ch.title.replace(/^Chapter \d+ — /, "")}</span>
            </button>
          ))}
        </aside>

        <div className="deriv-course-intro-reader">
          {active ? (
            <>
              <p className="deriv-course-guide-kicker">
                Chapter {filtered.indexOf(active) + 1} of {filtered.length}
              </p>
              <h3 className="text-[1.05rem] font-semibold tracking-tight mt-1">
                {active.title}
              </h3>
              <div className="deriv-course-intro-sections">
                {active.sections.map((section) => (
                  <details
                    key={section.heading}
                    className="deriv-course-intro-section"
                    open
                  >
                    <summary className="deriv-course-intro-section-head">
                      {section.heading}
                    </summary>
                    <div className="deriv-course-intro-section-body">
                      {section.body.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">No chapters match that search.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function DerivCourseDesk({
  onOpenBuilder,
  onOpenFreeBots,
  onLoadStrategy,
  embedded = false,
}: DerivCourseDeskProps) {
  const [tab, setTab] = useState<CourseTabId>("intro");
  const [activeIntroChapter, setActiveIntroChapter] = useState<string>(
    INTRO_CHAPTERS[0]?.id ?? "",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(COURSE_FAQS[0]?.id ?? null);
  const [activeVideo, setActiveVideo] = useState(COURSE_VIDEOS[0]?.id ?? "intro");
  const [activeStrategy, setActiveStrategy] = useState<QuickStrategyId>(
    COURSE_STRATEGIES[0]?.id ?? "martingale",
  );
  const [activeChapter, setActiveChapter] = useState(0);
  const [paramValues, setParamValues] = useState<Record<string, Record<string, number>>>(
    () =>
      Object.fromEntries(
        COURSE_STRATEGIES.map((s) => [
          s.id,
          Object.fromEntries(s.params.map((p) => [p.key, p.defaultValue])),
        ]),
      ),
  );

  const video = COURSE_VIDEOS.find((v) => v.id === activeVideo) ?? COURSE_VIDEOS[0];
  const strategy =
    COURSE_STRATEGIES.find((s) => s.id === activeStrategy) ?? COURSE_STRATEGIES[0]!;
  const chapters = COURSE_STRATEGY_CHAPTERS[strategy.id] ?? [];
  const chapter = chapters[activeChapter] ?? chapters[0];

  const query = searchQuery.trim().toLowerCase();

  const filteredGuides = useMemo(() => {
    if (!query) return COURSE_GUIDES;
    return COURSE_GUIDES.filter((item) =>
      `${item.title} ${item.tourSubtype}`.toLowerCase().includes(query),
    );
  }, [query]);

  const filteredVideos = useMemo(() => {
    if (!query) return COURSE_VIDEOS;
    return COURSE_VIDEOS.filter((item) => item.title.toLowerCase().includes(query));
  }, [query]);

  const faqs = useMemo(() => {
    if (!query) return COURSE_FAQS;
    return COURSE_FAQS.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answerHtml.some(
          (line) =>
            stripCourseHtml(line).toLowerCase().includes(query) ||
            line.toLowerCase().includes(query),
        ),
    );
  }, [query]);

  const filteredStrategies = useMemo(() => {
    if (!query) return COURSE_STRATEGIES;
    return COURSE_STRATEGIES.filter((item) => {
      const chapterText = (COURSE_STRATEGY_CHAPTERS[item.id] ?? [])
        .flatMap((ch) => ch.blocks)
        .flatMap((block) => block.content ?? [])
        .join(" ");
      return (
        item.title.toLowerCase().includes(query) ||
        item.aboutLabel.toLowerCase().includes(query) ||
        item.chapterTitles.some((title) => title.toLowerCase().includes(query)) ||
        chapterText.toLowerCase().includes(query)
      );
    });
  }, [query]);

  function patchParam(key: string, value: number) {
    setParamValues((prev) => ({
      ...prev,
      [activeStrategy]: { ...prev[activeStrategy], [key]: value },
    }));
  }

  function selectStrategy(id: QuickStrategyId) {
    setActiveStrategy(id);
    setActiveChapter(0);
  }

  return (
    <div
      className={cn("deriv-course-desk", embedded && "deriv-course-desk--embedded")}
      data-testid="deriv-course-desk"
    >
      <header className="deriv-course-head">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-accent" strokeWidth={2} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
              TradeCity Academy
            </p>
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Deriv Course
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted leading-relaxed">
            Comprehensive tutorials — from beginner guides and video walkthroughs to
            FAQ and quick strategy deep-dives.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenFreeBots ? (
            <button type="button" className="deriv-course-cta" onClick={onOpenFreeBots}>
              Free bots
            </button>
          ) : null}
          {onOpenBuilder ? (
            <button
              type="button"
              className="deriv-course-cta deriv-course-cta--solid"
              onClick={onOpenBuilder}
            >
              Open Bot builder
            </button>
          ) : null}
        </div>
      </header>

      <label className="deriv-course-search">
        <Search className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search tutorials"
          aria-label="Search tutorials"
        />
      </label>

      <div className="deriv-course-tabs" role="tablist" aria-label="Course sections">
        {COURSE_TABS.map((item) => {
          const Icon =
            item.id === "intro"
              ? GraduationCap
              : item.id === "guide"
                ? BookOpen
                : item.id === "videos"
                  ? Clapperboard
                  : item.id === "faq"
                    ? HelpCircle
                    : Sparkles;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={cn(
                "deriv-course-tab",
                tab === item.id && "deriv-course-tab--active",
              )}
              onClick={() => setTab(item.id)}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="deriv-course-body" role="tabpanel">
        {tab === "intro" ? (
          <IntroPanel
            chapters={INTRO_CHAPTERS}
            activeId={activeIntroChapter}
            onSelect={setActiveIntroChapter}
            query={query}
          />
        ) : null}

        {tab === "guide" ? (
          <div className="deriv-course-guide-wrap">
            <div className="deriv-course-guide-grid">
              {filteredGuides.map((guide) => (
                <article key={guide.id} className="deriv-course-guide-card">
                  <img
                    src={courseImage(guide.image)}
                    alt=""
                    className="deriv-course-guide-image"
                  />
                  <p className="deriv-course-guide-kicker">User guide</p>
                  <h3>{guide.title}</h3>
                  <button
                    type="button"
                    className="deriv-course-cta deriv-course-cta--solid mt-3"
                    onClick={onOpenBuilder}
                  >
                    {guide.tourSubtype === "OnBoard"
                      ? "Get started on D-Bot"
                      : "Start Bot builder tour"}
                  </button>
                </article>
              ))}
            </div>
            {!filteredGuides.length ? (
              <p className="text-sm text-muted">No guides match that search.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "videos" ? (
          <div className="deriv-course-videos">
            <div className="deriv-course-video-list">
              {filteredVideos.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "deriv-course-video-item",
                    activeVideo === item.id && "deriv-course-video-item--active",
                  )}
                  onClick={() => setActiveVideo(item.id)}
                >
                  {item.title}
                </button>
              ))}
            </div>
            <div className="deriv-course-video-frame">
              {video ? (
                <iframe
                  title={video.title}
                  src={video.embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : null}
            </div>
            {!filteredVideos.length ? (
              <p className="text-sm text-muted">No videos match that search.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "faq" ? (
          <div className="deriv-course-faq">
            {faqs.map((item) => {
              const open = openFaq === item.id;
              return (
                <div key={item.id} className="deriv-course-faq-item">
                  <button
                    type="button"
                    className="deriv-course-faq-q"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : item.id)}
                  >
                    <span>{item.question}</span>
                    {open ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                  {open ? (
                    <div className="deriv-course-faq-a">
                      {item.answerHtml.map((line) => (
                        <p key={line}>
                          <CourseHtml html={line} />
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!faqs.length ? (
              <p className="text-sm text-muted">No FAQ matches that search.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "strategies" ? (
          <div className="deriv-course-qs">
            <aside className="deriv-course-qs-list" aria-label="Quick strategies">
              {filteredStrategies.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "deriv-course-qs-item",
                    activeStrategy === item.id && "deriv-course-qs-item--active",
                  )}
                  onClick={() => selectStrategy(item.id)}
                >
                  <span className="deriv-course-qs-item-label">{item.aboutLabel}</span>
                  <span className="deriv-course-qs-item-title">{item.title}</span>
                </button>
              ))}
            </aside>

            <div className="deriv-course-qs-main">
              <aside className="deriv-course-chapter-list" aria-label="Chapters">
                {chapters.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    className={cn(
                      "deriv-course-chapter-item",
                      activeChapter === index && "deriv-course-chapter-item--active",
                    )}
                    onClick={() => setActiveChapter(index)}
                  >
                    {item.title}
                  </button>
                ))}
              </aside>

              <div className="deriv-course-qs-panel">
                {chapter ? (
                  <>
                    <p className="deriv-course-guide-kicker">{strategy.aboutLabel}</p>
                    <h3>{chapter.title}</h3>
                    <ChapterReader blocks={chapter.blocks} />

                    <div className="deriv-course-qs-run">
                      <p className="deriv-course-qs-run-title">Quick strategy parameters</p>
                      <div className="deriv-course-qs-fields">
                        {strategy.params.map((param) => (
                          <label key={param.key} className="deriv-course-qs-field">
                            <span>{param.label}</span>
                            <input
                              type="number"
                              min={param.min}
                              max={param.max}
                              step={param.step ?? 1}
                              value={
                                paramValues[strategy.id]?.[param.key] ??
                                param.defaultValue
                              }
                              onChange={(event) =>
                                patchParam(param.key, Number(event.target.value) || 0)
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="deriv-course-cta deriv-course-cta--solid mt-3 gap-1.5"
                        onClick={() => {
                          const values = paramValues[strategy.id] ?? {};
                          onLoadStrategy?.(strategy.id, values);
                          if (!onLoadStrategy) onOpenBuilder?.();
                        }}
                      >
                        <Play className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        Run
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            {!filteredStrategies.length ? (
              <p className="text-sm text-muted">No quick strategies match that search.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
