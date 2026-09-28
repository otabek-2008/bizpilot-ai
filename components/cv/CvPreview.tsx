import { forwardRef } from "react";
import { A4_PX, splitList, type CvData, type CvEntry, type CvTemplate } from "@/lib/cv";

export type CvLang = "uz" | "ru" | "en";

export const CV_LABELS: Record<CvLang, Record<"summary" | "experience" | "education" | "skills" | "languages" | "extra" | "contacts", string>> = {
  uz: { summary: "O'zim haqimda", experience: "Ish tajribasi", education: "Ta'lim", skills: "Ko'nikmalar", languages: "Tillar", extra: "Qo'shimcha", contacts: "Aloqa" },
  ru: { summary: "О себе", experience: "Опыт работы", education: "Образование", skills: "Навыки", languages: "Языки", extra: "Дополнительно", contacts: "Контакты" },
  en: { summary: "Profile", experience: "Experience", education: "Education", skills: "Skills", languages: "Languages", extra: "Additional", contacts: "Contact" },
};

type Props = { data: CvData; template: CvTemplate; color: string; lang: CvLang };

const filled = (list: CvEntry[]) => list.filter((e) => e.title.trim() || e.place.trim());

// Rezyume har doim oq fonda, qat'iy A4 kengligida chiziladi — ekrandagi ko'rinish PDF bilan bir xil.
const CvPreview = forwardRef<HTMLDivElement, Props>(function CvPreview({ data, template, color, lang }, ref) {
  const L = CV_LABELS[lang];
  const contacts = [data.email, data.phone, data.city, ...splitList(data.links)].filter(Boolean);
  const skills = splitList(data.skills);
  const languages = splitList(data.languages);
  const experience = filled(data.experience);
  const education = filled(data.education);
  const serif = template === "classic";

  const heading = (children: string) =>
    template === "minimal" ? (
      <h3 style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#64748b", margin: "0 0 10px", fontWeight: 600 }}>{children}</h3>
    ) : (
      <h3 style={{ fontSize: 15, color, margin: "0 0 10px", paddingBottom: 5, borderBottom: `2px solid ${color}33`, fontWeight: 700, textTransform: serif ? "uppercase" : undefined, letterSpacing: serif ? 1 : undefined }}>
        {children}
      </h3>
    );

  const entries = (list: CvEntry[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {list.map((e) => (
        <div key={e.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
            <strong style={{ fontSize: 14, color: "#0f172a" }}>{e.title}</strong>
            {e.period && <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{e.period}</span>}
          </div>
          {e.place && <div style={{ fontSize: 13, color, fontWeight: 500 }}>{e.place}</div>}
          {e.details && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{e.details}</p>}
        </div>
      ))}
    </div>
  );

  const main = (
    <>
      {data.summary && (
        <section style={{ marginBottom: 22 }}>
          {heading(L.summary)}
          <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{data.summary}</p>
        </section>
      )}
      {experience.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          {heading(L.experience)}
          {entries(experience)}
        </section>
      )}
      {education.length > 0 && (
        <section style={{ marginBottom: 22 }}>
          {heading(L.education)}
          {entries(education)}
        </section>
      )}
    </>
  );

  const side = (light: boolean) => {
    const text = light ? "#fff" : "#334155";
    const chip = light ? { background: "rgba(255,255,255,.18)", color: "#fff" } : { background: `${color}14`, color };
    const h = (t: string) => (
      <h3 style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 8px", color: light ? "rgba(255,255,255,.75)" : color, fontWeight: 700 }}>{t}</h3>
    );
    return (
      <>
        {contacts.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            {h(L.contacts)}
            {contacts.map((c) => (
              <div key={c} style={{ fontSize: 12.5, color: text, marginBottom: 4, wordBreak: "break-word" }}>{c}</div>
            ))}
          </section>
        )}
        {skills.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            {h(L.skills)}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {skills.map((s) => (
                <span key={s} style={{ ...chip, fontSize: 12, padding: "3px 9px", borderRadius: 999 }}>{s}</span>
              ))}
            </div>
          </section>
        )}
        {languages.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            {h(L.languages)}
            {languages.map((s) => (
              <div key={s} style={{ fontSize: 12.5, color: text, marginBottom: 4 }}>{s}</div>
            ))}
          </section>
        )}
        {data.extra && (
          <section>
            {h(L.extra)}
            <p style={{ margin: 0, fontSize: 12.5, color: text, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{data.extra}</p>
          </section>
        )}
      </>
    );
  };

  const photo = data.photo && (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={data.photo} alt="" style={{ width: 110, height: 110, borderRadius: template === "classic" ? 8 : "50%", objectFit: "cover", flexShrink: 0 }} />
  );

  const base: React.CSSProperties = {
    width: A4_PX.w,
    minHeight: A4_PX.h,
    background: "#fff",
    color: "#0f172a",
    fontFamily: serif ? "Georgia, 'Times New Roman', serif" : "Inter, 'Segoe UI', Arial, sans-serif",
    boxSizing: "border-box",
  };

  if (template === "modern") {
    return (
      <div ref={ref} style={{ ...base, display: "flex" }}>
        <aside style={{ width: 250, background: color, padding: "40px 26px", boxSizing: "border-box" }}>
          {photo && <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>{photo}</div>}
          {side(true)}
        </aside>
        <main style={{ flex: 1, padding: "44px 38px" }}>
          <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.1, fontWeight: 800 }}>{data.name || "Ism Familiya"}</h1>
          {data.role && <p style={{ margin: "6px 0 0", fontSize: 16, color, fontWeight: 600 }}>{data.role}</p>}
          <div style={{ height: 28 }} />
          {main}
        </main>
      </div>
    );
  }

  if (template === "classic") {
    return (
      <div ref={ref} style={{ ...base, padding: "48px 56px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 24, paddingBottom: 18, borderBottom: `3px double ${color}` }}>
          {photo}
          <div style={{ flex: 1, textAlign: photo ? "left" : "center" }}>
            <h1 style={{ margin: 0, fontSize: 30, letterSpacing: 1, textTransform: "uppercase", color }}>{data.name || "Ism Familiya"}</h1>
            {data.role && <p style={{ margin: "6px 0 0", fontSize: 16, fontStyle: "italic", color: "#334155" }}>{data.role}</p>}
            {contacts.length > 0 && <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "#475569" }}>{contacts.join("  •  ")}</p>}
          </div>
        </header>
        <div style={{ height: 24 }} />
        {main}
        {skills.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            {heading(L.skills)}
            <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>{skills.join(" · ")}</p>
          </section>
        )}
        {languages.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            {heading(L.languages)}
            <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>{languages.join(" · ")}</p>
          </section>
        )}
        {data.extra && (
          <section>
            {heading(L.extra)}
            <p style={{ margin: 0, fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{data.extra}</p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ ...base, padding: "56px 60px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 34 }}>
        {photo}
        <div>
          <h1 style={{ margin: 0, fontSize: 36, fontWeight: 300, letterSpacing: -0.5 }}>{data.name || "Ism Familiya"}</h1>
          {data.role && <p style={{ margin: "4px 0 0", fontSize: 15, color }}>{data.role}</p>}
        </div>
      </header>
      <div style={{ display: "flex", gap: 40 }}>
        <div style={{ flex: 1 }}>{main}</div>
        <div style={{ width: 190 }}>{side(false)}</div>
      </div>
    </div>
  );
});

export default CvPreview;
