#!/usr/bin/env python3
"""Write docs/Scalability_Gap_Analysis_Regimens.pdf"""

import re
from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parent / "Scalability_Gap_Analysis_Regimens.pdf"

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
        "\u2264": "<=",
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
        self.cell(0, 6, "Regimens  |  Scalability Gap Analysis  |  COE 454", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*LINE)
        self.line(16, 14, 194, 14)
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 8, f"Page {self.page_no()}  |  Source: Logical883/regimens  |  10 Sep 2026", align="C")

    def h2(self, title):
        self.ln(3)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*NAVY)
        self.cell(0, 8, S(title), new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*TEAL)
        self.line(16, self.get_y(), 70, self.get_y())
        self.ln(4)

    def h3(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*NAVY)
        self.cell(0, 7, S(title), new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*SLATE)
        self.multi_cell(0, 5.2, S(text))
        self.ln(2)

    def box(self, title, text, fill):
        x = 16
        w = 178
        self.set_font("Helvetica", "B", 10)
        title_h = 7
        self.set_font("Helvetica", "", 9.5)
        body_h = self._text_height(S(text), w - 10, 5)
        h = 8 + title_h + body_h + 4
        if self.get_y() + h > 277:
            self.add_page()
        y = self.get_y()
        self.set_fill_color(*fill)
        self.set_draw_color(*LINE)
        self.rect(x, y, w, h, "DF")
        self.set_xy(x + 5, y + 4)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*NAVY)
        self.cell(w - 10, 6, S(title), new_x="LMARGIN", new_y="NEXT")
        self.set_x(x + 5)
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(*SLATE)
        self.multi_cell(w - 10, 5, S(text))
        self.set_y(y + h + 3)

    def _text_height(self, text, width, line_h):
        if not text:
            return line_h
        self.set_font("Helvetica", "", 9.5)
        lines = self.multi_cell(width, line_h, text, dry_run=True, output="LINES")
        return max(line_h, len(lines) * line_h)

    def stats(self):
        items = [
            ("1", "Express process"),
            ("300", "API req / 15 min / IP"),
            ("60 s", "Proxy + client timeout"),
            ("12 h", "JWT lifetime (no revoke)"),
        ]
        w = 42.5
        gap = 2.5
        x0 = 16
        y = self.get_y()
        for i, (val, lab) in enumerate(items):
            x = x0 + i * (w + gap)
            self.set_fill_color(*FILL)
            self.set_draw_color(*LINE)
            self.rect(x, y, w, 22, "DF")
            self.set_xy(x, y + 3)
            self.set_font("Helvetica", "B", 14)
            self.set_text_color(*TEAL)
            self.cell(w, 8, val, align="C")
            self.set_xy(x + 2, y + 12)
            self.set_font("Helvetica", "", 7.5)
            self.set_text_color(*MUTED)
            self.multi_cell(w - 4, 3.5, lab, align="C")
        self.set_y(y + 26)

    def bars(self):
        rows = [
            ("One shop, few tills", 78, TEAL),
            ("High-volume sales", 28, (245, 158, 11)),
            ("Mobile / Android", 25, (245, 158, 11)),
            ("Multiple branches", 22, (220, 38, 38)),
            ("100s concurrent users", 18, (220, 38, 38)),
        ]
        label_w = 52
        bar_w = 110
        x = 16
        y = self.get_y()
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 4, "Architectural fit (0-100). Dashed target = 70 (demo shop).", new_x="LMARGIN", new_y="NEXT")
        y = self.get_y() + 2
        for i, (label, score, color) in enumerate(rows):
            yy = y + i * 11
            self.set_xy(x, yy)
            self.set_font("Helvetica", "", 8)
            self.set_text_color(*SLATE)
            self.cell(label_w, 8, label)
            self.set_fill_color(*LINE)
            self.rect(x + label_w, yy + 2, bar_w, 5, "F")
            self.set_fill_color(*color)
            self.rect(x + label_w, yy + 2, bar_w * score / 100.0, 5, "F")
            tx = x + label_w + bar_w * 0.70
            self.set_draw_color(*TEAL)
            self.line(tx, yy + 1, tx, yy + 8)
            self.set_xy(x + label_w + bar_w + 2, yy)
            self.set_text_color(*NAVY)
            self.set_font("Helvetica", "B", 8)
            self.cell(12, 8, str(score))
        self.set_y(y + len(rows) * 11 + 4)

    def table(self, headers, rows, col_w):
        if self.get_y() > 250:
            self.add_page()
        self.set_fill_color(*NAVY)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 8)
        x = 16
        y = self.get_y()
        h = 7
        for i, head in enumerate(headers):
            self.set_xy(x, y)
            self.cell(col_w[i], h, S(head), border=0, fill=True)
            x += col_w[i]
        self.ln(h)
        self.set_font("Helvetica", "", 8)
        fill = False
        for row in rows:
            heights = []
            for i, cell in enumerate(row):
                lines = self.multi_cell(col_w[i] - 2, 4, S(str(cell)), dry_run=True, output="LINES")
                heights.append(max(8, len(lines) * 4 + 2))
            rh = max(heights)
            if self.get_y() + rh > 277:
                self.add_page()
            y = self.get_y()
            x = 16
            bg = FILL if fill else (255, 255, 255)
            self.set_fill_color(*bg)
            self.rect(16, y, sum(col_w), rh, "F")
            self.set_text_color(*SLATE)
            for i, cell in enumerate(row):
                self.set_xy(x + 1, y + 1)
                self.multi_cell(col_w[i] - 2, 4, S(str(cell)))
                x += col_w[i]
            self.set_y(y + rh)
            fill = not fill
        self.ln(3)


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
    pdf.cell(0, 6, "COE 454 Software Engineering  |  KNUST Department of Computer Engineering")
    pdf.ln(20)

    pdf.set_text_color(*TEAL)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "REPORT")
    pdf.ln(7)
    pdf.set_text_color(*NAVY)
    pdf.set_font("Helvetica", "B", 20)
    pdf.multi_cell(0, 9, "Scalability Gap Analysis")
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*SLATE)
    pdf.multi_cell(
        0,
        5.2,
        S(
            "COE 454 inventory and sales app for one stationery shop. "
            "Scores are architectural fit, not load-test measurements. "
            "Source: Logical883/regimens codebase, assessed 10 Sep 2026."
        ),
    )
    pdf.ln(3)

    pdf.box(
        "Verdict: sized for one shop, not a chain",
        "The stack is a modular monolith: browser -> Vercel React SPA -> same-origin "
        "/api proxy -> one Express process on Render -> Neon/Postgres (or in-memory mock). "
        "That is enough for a few counters. It is not a multi-branch, high-concurrency, "
        "or native-mobile platform.",
        WARN,
    )

    pdf.stats()

    pdf.h2("1. Fit by growth scenario")
    pdf.body(
        "Architectural fit (0-100) by target load. A score of 70 or above means "
        "the current design can ship as-is for a demo shop."
    )
    pdf.bars()

    pdf.table(
        ["Scenario", "Fit", "What blocks scale"],
        [
            [
                "One shop, few terminals",
                "Good (with Neon)",
                "Render sleep/cold start; filesystem backups on ephemeral disk; KeepAlive needs a tab or uptime ping.",
            ],
            [
                "High-volume sales",
                "Weak",
                "Sync batch max 100 sales / 100 products; JSON body 256kb; FIFO row locks; unbounded list/profit queries.",
            ],
            [
                "Mobile / Android",
                "Web only",
                "Vite SPA + Dexie in the browser. No Capacitor, PWA worker, or Android package in the repo.",
            ],
            [
                "Multiple branches",
                "Not modeled",
                "No store/branch/tenant id. One global users + inventory schema. Last-write-wins assumes one shop.",
            ],
            [
                "Hundreds of concurrent users",
                "Poor",
                "Single Node process; in-memory rate limits; default pg pool (~10); no Redis/queue/CDN; hot SKU lock contention.",
            ],
        ],
        [48, 32, 98],
    )

    pdf.h2("2. What already holds for class / one shop")
    pdf.body(
        "Durable mode (USE_MOCK_DB=false + Neon) uses transactional sales, FIFO cost "
        "layers with FOR UPDATE, and stamped unit_cost / unit_price on lines. Owner vs "
        "assistant roles, parameterized SQL, helmet/CORS, and a Dexie offline sale queue "
        "match a small counter with flaky internet. Split hosting (Vercel UI, Render API, "
        "Neon DB) is the intended deploy path."
    )

    pdf.h2("3. Hard ceilings in the current design")
    pdf.h3("Single process  (backend/src/index.js)")
    pdf.body(
        "app.listen only. No cluster, workers, or replica set. Mock state and "
        "express-rate-limit live in that process memory, so they cannot be shared even "
        "if you added instances."
    )
    pdf.h3("Free-tier hop  (frontend/api/proxy.js)")
    pdf.body(
        "Vercel function maxDuration 60s; axios timeout 60s; documented Render cold "
        "start 30-60s. KeepAlive pings every 30s with a 10s health timeout. First sale "
        "after sleep can still miss the window."
    )
    pdf.h3("Data and sync")
    pdf.body(
        "Product sync is last-write-wins: if the server row is newer, the offline edit "
        "is dropped (backend/src/routes/sync.js). Sales flush in one POST. listSales and "
        "profit reports load matching rows then N+1 item queries (backend/src/data/real.js) "
        "with no pagination. Pool is new Pool() with no max / idle settings (backend/src/db.js)."
    )
    pdf.body(
        "Mock mode (USE_MOCK_DB=true) resets on every sleep or restart - fine for a "
        "marking demo, not for a live shop. Backups write JSON under database/backups/ "
        "on the API host disk, which Render does not treat as durable storage."
    )

    pdf.h2("4. Limits taken from code")
    pdf.table(
        ["Limit", "Value", "Where"],
        [
            ["JSON body", "256 kb", "backend/src/index.js"],
            ["Global rate limit", "300 / 15 min", "security.js  RATE_LIMIT_MAX"],
            ["Login / forgot limit", "20 / 15 min", "security.js  LOGIN_RATE_LIMIT_MAX"],
            ["JWT expiry", "12 h default", "auth.js  JWT_EXPIRES_IN"],
            ["JWT secret floor", "32+ chars", "security.js, render-start.js"],
            ["Axios timeout", "60 000 ms", "frontend/src/api/client.js"],
            ["KeepAlive interval", "30 000 ms", "KeepAlive.jsx"],
            ["KeepAlive health timeout", "10 000 ms", "KeepAlive.jsx"],
            ["Vercel proxy maxDuration", "60 s", "frontend/api/proxy.js"],
            ["Sync batch", "100 sales, 100 products", "backend/src/routes/sync.js"],
            ["Sale lines / qty", "200 lines, qty <= 100 000", "backend/src/routes/sales.js"],
            ["Render cold start (doc)", "~30-60 s", "docs/DEPLOY.md"],
        ],
        [58, 48, 72],
    )
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(
        0,
        4,
        "Values are configured defaults, not measured production traffic.",
    )
    pdf.ln(2)

    pdf.h2("5. If the shop grows - order of work")
    pdf.table(
        ["Priority", "Change", "Why it matters"],
        [
            [
                "P0",
                "Paid always-on API + Neon (no mock, no sleep)",
                "Removes the 30-60s cold-start cliff that currently looks like API unreachable.",
            ],
            [
                "P1",
                "Paginate sales/reports; set pg pool max",
                "Stops unbounded reads and connection stampede before adding machines.",
            ],
            [
                "P1",
                "Idempotent sync keys; raise or chunk batches",
                "Offline retries must not double-post sales under load.",
            ],
            [
                "P2",
                "Shared rate-limit store; JWT refresh/revoke",
                "Needed only if you run more than one API instance.",
            ],
            [
                "P3",
                "branch_id schema; native/PWA client",
                "New product, not a config tweak - current model is one shop.",
            ],
        ],
        [22, 68, 88],
    )

    pdf.box(
        "Course vs production",
        "For COE 454, the gap that matters in a demo is hosting (sleep, suspended Render, "
        "proxy), not Kubernetes. Treat Redis, multi-region, and Android as future work, "
        "not missing homework, unless the brief asks for them.",
        INFO,
    )

    pdf.output(str(OUT))
    print(OUT)


if __name__ == "__main__":
    main()
