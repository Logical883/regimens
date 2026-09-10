#!/usr/bin/env python3
"""Write docs/Presentation_Reflection_Regimens.pdf (sections 5-7 speaking notes)."""

import re
from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parent / "Presentation_Reflection_Regimens.pdf"

NAVY = (15, 23, 42)
TEAL = (13, 148, 136)
SLATE = (51, 65, 85)
MUTED = (100, 116, 139)
LINE = (226, 232, 240)
FILL = (248, 250, 252)
WARN = (254, 243, 199)
INFO = (224, 242, 254)


def S(text):
    if not text:
        return ""
    table = {
        "\u2014": " - ",
        "\u2013": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
        "\u2192": "->",
    }
    for src, dst in table.items():
        text = text.replace(src, dst)
    return re.sub(r" {2,}", " ", text)


class Report(FPDF):
    def __init__(self):
        super().__init__(format="A4")
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(16, 16, 16)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*TEAL)
        self.cell(
            0,
            6,
            "Regimens  |  Technical decisions, challenges, next steps  |  COE 454",
            new_x="LMARGIN",
            new_y="NEXT",
        )
        self.set_draw_color(*LINE)
        self.line(16, 14, 194, 14)
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(
            0,
            8,
            f"Page {self.page_no()}  |  Team Regimens  |  Speaking notes, not a script to memorise word-for-word",
            align="C",
        )

    def h2(self, title):
        self.ln(2)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*NAVY)
        self.cell(0, 8, S(title), new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*TEAL)
        self.line(16, self.get_y(), 72, self.get_y())
        self.ln(4)

    def h3(self, title):
        self.set_font("Helvetica", "B", 10.5)
        self.set_text_color(*NAVY)
        self.multi_cell(0, 5.5, S(title))
        self.ln(1)

    def body(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*SLATE)
        self.multi_cell(0, 5.2, S(text))
        self.ln(2)

    def say(self, text):
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(*SLATE)
        self.multi_cell(0, 5.2, S('Say: "' + text + '"'))
        self.ln(2)

    def box(self, title, text, fill):
        w = 178
        self.set_font("Helvetica", "", 9.5)
        body_h = self._text_height(S(text), w - 10, 5)
        h = 8 + 7 + body_h + 4
        if self.get_y() + h > 277:
            self.add_page()
        y = self.get_y()
        self.set_fill_color(*fill)
        self.set_draw_color(*LINE)
        self.rect(16, y, w, h, "DF")
        self.set_xy(21, y + 4)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*NAVY)
        self.cell(w - 10, 6, S(title), new_x="LMARGIN", new_y="NEXT")
        self.set_x(21)
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(*SLATE)
        self.multi_cell(w - 10, 5, S(text))
        self.set_y(y + h + 3)

    def _text_height(self, text, width, line_h):
        self.set_font("Helvetica", "", 9.5)
        lines = self.multi_cell(width, line_h, text, dry_run=True, output="LINES")
        return max(line_h, len(lines) * line_h)


def main():
    pdf = Report()
    pdf.add_page()
    pdf.set_fill_color(*NAVY)
    pdf.rect(0, 0, 210, 40, "F")
    pdf.set_xy(16, 10)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 6, "REGIMENS  |  Outstretched Arm Enterprise")
    pdf.ln(7)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(204, 251, 241)
    pdf.cell(0, 6, "COE 454  |  Technical decision, challenges, and what comes next")
    pdf.ln(20)

    pdf.set_text_color(*TEAL)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "PRESENTATION NOTES")
    pdf.ln(7)
    pdf.set_text_color(*NAVY)
    pdf.set_font("Helvetica", "B", 18)
    pdf.multi_cell(0, 8, "Sections 5-7: decisions, lessons, phase two")
    pdf.ln(2)
    pdf.body(
        "Grounded in this repo, not generic teamwork language. Use as talking points. "
        "Architecture Decision Records live in docs/Architecture_Decision_Records.docx "
        "- cite that they exist; you do not need to read them aloud."
    )

    pdf.h2("Section 5  |  One significant technical decision")
    pdf.h3("PostgreSQL over MongoDB (primary example)")
    pdf.say(
        "We chose PostgreSQL, not MongoDB, because a sale is a set of facts that must stay consistent: "
        "stock goes down, a sale row is written, and each line gets a cost. That is a transaction, not a document dump."
    )
    pdf.body(
        "Why it fits this shop: products have typed columns (quantity, cost_price, category). "
        "Sales stamp unit_price and FIFO unit_cost onto sale_items so later price edits do not rewrite history. "
        "Stock layers use FOR UPDATE inside a transaction so two tills cannot oversell the same pack of pens. "
        "MongoDB would have been faster to sketch, but we would have re-implemented joins, constraints, and "
        "atomic stock updates ourselves. Migrations in database/ are versioned SQL the DB owners can review."
    )
    pdf.h3("Web app rather than a native mobile app (supporting decision)")
    pdf.say(
        "We built a React web app, not Android first, because the counter already has a browser, "
        "the course timeline was weeks not months, and one codebase could be used on a laptop or a phone browser."
    )
    pdf.body(
        "Offline still matters when ECG or data drops: Dexie queues sales in IndexedDB and POST /api/sync "
        "replays them (ADR-005, last-write-wins). A store app would have meant Play Store, Capacitor, and a "
        "second UI track we did not have staff time for. Android is explicitly in the later backlog (Won't / phase two)."
    )
    pdf.h3("Architecture Decision Records")
    pdf.body(
        "The team keeps Architecture Decision Records in docs/Architecture_Decision_Records.docx. "
        "They are also referenced from the root README and the backend/frontend READMEs. "
        "You do not need to open the file in the video. Name two that show up in code comments:"
    )
    pdf.body(
        "ADR-004 - JWT auth and role checks (owner vs assistant) in backend/src/middleware/auth.js. "
        "ADR-005 - offline queue and last-write-wins sync (frontend Dexie + POST /api/sync)."
    )
    pdf.h3("Third-party services (show working, do not invent Paystack)")
    pdf.box(
        "We did not integrate Paystack, Africa's Talking, or Supabase Storage.",
        "The shop records sales in-house; there is no card checkout or SMS OTP in this product. "
        "Claiming those would be dishonest. What we did integrate is hosting and Postgres as a service.",
        WARN,
    )
    pdf.body(
        "Neon (Postgres): production data when USE_MOCK_DB=false. On the live site, GET /api/health "
        "has returned {\"status\":\"ok\",\"mode\":\"postgres\"} - that means Express is talking to Neon, "
        "not the in-memory mock. Show health in a tab, then log in and load Inventory so products persist after refresh."
    )
    pdf.body(
        "Vercel (frontend): https://regimens-six.vercel.app - React SPA. Same-origin /api is proxied "
        "with API_ORIGIN so the Render URL is not baked in as VITE_."
    )
    pdf.body(
        "Render (API): Node Express. Be honest on camera: the original free instance hit monthly hours "
        "and could show 'Service Suspended'. KeepAlive pings /api/health every 30s while the tab is open. "
        "If health is postgres, the third-party DB path is working. If health fails, say so - do not fake Paystack instead."
    )

    pdf.h2("Section 6  |  Challenges and lessons learnt  (1-2 minutes)")
    pdf.h3("Hardest technical problem")
    pdf.say(
        "The hardest technical problem was not FIFO math. It was getting a split deploy to stay up: "
        "Vercel for the UI, Render for the API, Neon for Postgres."
    )
    pdf.body(
        "What went wrong, specifically: Render's default build ran npm run build at repo root, which called Vite. "
        "Vite lives in frontend/node_modules, so the API host failed with 'vite: not found'. We changed root "
        "scripts so build/start only prepare and run Express (scripts/render-start.js). Then Vercel warned that "
        "VITE_API_URL is a public prefix; we moved the host to API_ORIGIN and a serverless proxy. The first "
        "catch-all function only matched one path segment, so /api/health worked and POST /api/auth/login 404ed. "
        "We rewrote nested /api/* through frontend/api/proxy.js. Free Render also slept or suspended; the UI then "
        "said it could not reach the API even though the React app was fine."
    )
    pdf.body(
        "Workaround: Neon for durable data; mock mode only for demos; KeepAlive; document API_ORIGIN; "
        "do not point VITE_API_URL at a dead onrender host."
    )
    pdf.h3("Hardest non-technical challenge")
    pdf.say(
        "Coordination and hosting quota, not 'the client was difficult'."
    )
    pdf.body(
        "Seven people across docs, DB, backend, UI. Easy to duplicate work or leave Forgot? as a dead span. "
        "The client process is a real stationery shop on a notebook - they are not paying for 24/7 Render. "
        "When free hours ran out, the 'production' URL died even though the code was correct. Time pressure "
        "pushed mock mode so frontend could proceed without waiting for Postgres. Scope: we kept staff roles "
        "and receipts as Should/Won't rather than finishing every wish."
    )
    pdf.h3("What we would do differently")
    pdf.body(
        "1. Put Postgres on Neon on day one and treat Render as compute only - one free resource, not web plus Render Postgres. "
        "2. Never bake the API host into VITE_ variables; same-origin /api from the start. "
        "3. Budget a few dollars of always-on API before the marking demo, or accept mock mode on camera and say so. "
        "4. Agree a written MoSCoW with the client early so FIFO and offline are Must, Android is Won't. "
        "5. Run one end-to-end production login in week two, not the night before."
    )
    pdf.h3("What we learned that we did not expect")
    pdf.body(
        "Env-var prefixes (VITE_) are a product decision, not a naming preference - they leak into the browser bundle. "
        "Serverless rewrites are not the same as Express routers; a catch-all can 404 nested routes. "
        "Free-tier 'production' is an operations problem: sleep, suspend, 60-second cold starts. "
        "FIFO is simple on paper and fussy in code: leftover stock must keep its old cost when the shelf price changes."
    )

    pdf.h2("Section 7  |  What comes next  (30s-1 min)")
    pdf.h3("Phase two")
    pdf.body(
        "Always-on API, email or owner-issued recovery without a shared shop code, printed/PDF receipts, "
        "owner reset of a staff password from Settings, pagination on orders and reports, and a PWA or "
        "lightweight Android wrap if the counter wants a home-screen icon."
    )
    pdf.h3("Backlog we did not have time to build")
    pdf.body(
        "Native Android; Paystack or mobile money (not in current sales flow); SMS alerts (Africa's Talking); "
        "true pg_dump backups; refresh-token revocation; MFA; multi-branch / store_id; merge (not last-write-wins) "
        "for concurrent product edits; rate-limit store in Redis."
    )
    pdf.h3("If this had to serve 10,000 users")
    pdf.body(
        "Stop using one Express process on free Render. Run multiple API instances behind a load balancer, "
        "Postgres with a sized connection pool, Redis for rate limits and sessions, paginated APIs, "
        "chunked/idempotent sync, and a CDN for the SPA. JWT would need rotation and a revoke list. "
        "The schema would need store or tenant ids. That is a rewrite of operations, not a new button on the dashboard."
    )
    pdf.h3("Is the client still using it? Support arrangement?")
    pdf.box(
        "Be honest on this question.",
        "Outstretched Arm was the case study. We have a deployed web app and a demo login (owner / owner1234 until they change it). "
        "We do not have a paid SLA. Free Render hours ran out on the original API, so 'always on' is not guaranteed. "
        "Handover is: Neon connection string, Vercel project, API_ORIGIN, JWT_SECRET, and the GitHub repo. "
        "If they keep using it after the course, they (or a teammate) must pay for always-on compute or accept mock/demo resets.",
        INFO,
    )

    pdf.output(str(OUT))
    print(OUT)


if __name__ == "__main__":
    main()
