#!/usr/bin/env python3
"""Generate team video-script PDFs. Run from repo root with PYTHONPATH=/tmp/pdfgen."""

import re
from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parent


def S(text):
    if text is None:
        return ""
    table = {
        "\u2014": " - ",
        "\u2013": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2026": "...",
    }
    for src, dst in table.items():
        text = text.replace(src, dst)
    return re.sub(r" {2,}", " ", text)

NAVY = (15, 23, 42)
TEAL = (13, 148, 136)
SLATE = (51, 65, 85)
MUTED = (100, 116, 139)
LINE = (226, 232, 240)


class ScriptPDF(FPDF):
    def __init__(self, meta):
        super().__init__(format="A4")
        self.meta = meta
        self.set_auto_page_break(auto=True, margin=22)
        self.set_margins(18, 18, 18)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*TEAL)
        self.cell(0, 6, "Team Regimens  |  COE 454 video script", align="L")
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 6, S(self.meta["speaker"]), align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*LINE)
        self.line(18, 16, 192, 16)
        self.ln(4)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 8, f"Page {self.page_no()}  |  Target runtime {self.meta['duration']}  |  Do not read the cues out loud", align="C")

    def cover(self):
        self.add_page()
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 42, "F")
        self.set_xy(18, 12)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(255, 255, 255)
        self.cell(0, 6, "REGIMENS  |  Inventory system for Outstretched Arm Enterprise")
        self.ln(7)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(204, 251, 241)
        self.cell(0, 6, "COE 454 Software Engineering  |  KNUST Department of Computer Engineering")
        self.ln(22)

        self.set_text_color(*TEAL)
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 6, "SPEAKING SCRIPT")
        self.ln(8)
        self.set_text_color(*NAVY)
        self.set_font("Helvetica", "B", 20)
        self.multi_cell(0, 9, S(self.meta["title"]))
        self.ln(2)
        self.set_font("Helvetica", "", 12)
        self.set_text_color(*SLATE)
        self.cell(0, 7, S(self.meta["speaker"]), new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*MUTED)
        self.cell(0, 6, S(self.meta["role"]), new_x="LMARGIN", new_y="NEXT")
        self.ln(6)

        for label, value in [
            ("Duration", self.meta["duration"]),
            ("Slot in the video", self.meta["slot"]),
            ("On camera", self.meta["camera"]),
        ]:
            self.set_font("Helvetica", "B", 9)
            self.set_text_color(*TEAL)
            self.cell(32, 6, label)
            self.set_font("Helvetica", "", 9)
            self.set_text_color(*SLATE)
            self.cell(0, 6, S(value), new_x="LMARGIN", new_y="NEXT")

        self.ln(6)
        self.set_draw_color(*LINE)
        self.line(18, self.get_y(), 192, self.get_y())
        self.ln(6)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*NAVY)
        self.cell(0, 6, "How to use this script", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*SLATE)
        self.multi_cell(
            0,
            5,
            "Read the spoken words naturally. Do not read lines in [SQUARE BRACKETS]; those are camera or screen cues. "
            "If you run long, skip a paragraph marked OPTIONAL. Aim for the duration on the cover. "
            "The full team video should land between 8 and 15 minutes.",
        )

    def heading(self, text):
        self.ln(4)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*NAVY)
        self.cell(0, 7, S(text), new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def cue(self, text):
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(*TEAL)
        self.multi_cell(0, 5, S(text))
        self.ln(1)

    def body(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*SLATE)
        self.multi_cell(0, 5.4, S(text))
        self.ln(2)

    def bullet(self, text):
        x = self.get_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*SLATE)
        self.cell(6, 5.4, "-")
        self.multi_cell(0, 5.4, S(text))
        self.set_x(x)
        self.ln(0.5)


def write_pdf(filename, meta, sections):
    pdf = ScriptPDF(meta)
    pdf.cover()
    pdf.add_page()
    for kind, content in sections:
        if kind == "h":
            pdf.heading(content)
        elif kind == "cue":
            pdf.cue(content)
        elif kind == "p":
            pdf.body(content)
        elif kind == "li":
            pdf.bullet(content)
    pdf.output(str(OUT / filename))


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    write_pdf(
        "01-introduction-documentation-hafsa.pdf",
        {
            "title": "Introduction and documentation",
            "speaker": "Nuamah Asamoaa Hafsa",
            "role": "Documentation and backend support",
            "duration": "about 2 minutes",
            "slot": "Opens the video (0:00)",
            "camera": "Face to camera, then cut to README / docs folder",
        },
        [
            ("h", "Opening (on camera)"),
            ("cue", "[FACE TO CAMERA. Team can stand behind you, or cut to a wide shot of everyone.]"),
            (
                "p",
                "Hello. We are Team Regimens from the Department of Computer Engineering at KNUST. "
                "This is our COE 454 Software Engineering project: an inventory and sales system for "
                "Outstretched Arm Enterprise, a small stationery shop that was still tracking stock and sales by hand in a notebook.",
            ),
            (
                "p",
                "The notebook caused three problems: they could not see low stock in time, they could not "
                "trust the profit numbers when prices changed, and they could not work when the internet dropped. "
                "Regimens is our answer: a simple web app that works in the shop, even offline, and still calculates profit honestly.",
            ),
            ("h", "The team (keep this brisk)"),
            ("cue", "[SHOW: README team table, or name cards.]"),
            (
                "p",
                "Quickly, who did what. I am Hafsa. I own documentation and I support the backend. "
                "Albert leads the backend. Francis and Raymond own the database. "
                "David leads UI and UX. Peter and Benjamin own the frontend. "
                "You will hear each of them in a moment.",
            ),
            ("h", "Documentation — how we actually worked"),
            ("cue", "[SCREEN SHARE: docs folder. Click through file names, do not read every title slowly.]"),
            (
                "p",
                "Before we wrote a lot of code, we agreed how we would work. Our collaboration guide set the branching rule: "
                "main stays working, one branch per task, and a teammate reviews before we merge. "
                "That stopped us from overwriting each other.",
            ),
            (
                "p",
                "Then we wrote the contracts. The ERD is the database picture. The API schema is the contract between frontend and backend. "
                "The UI and UX guide is what the shop owner should see. Architecture decision records explain why we chose React, Express, Postgres, and JWT, "
                "and why we went offline-first with a sync queue instead of hoping the network is always up.",
            ),
            (
                "p",
                "As we built, we kept living docs in the repo: a demo walkthrough, a deploy guide for Vercel and Render, and a security checklist "
                "because this app handles money-related data. If a new teammate joins tomorrow, they start at the README, then the doc that matches their folder.",
            ),
            ("h", "Handoff"),
            (
                "p",
                "That is the story and the paper trail. David will show how we designed the experience for a busy shop counter.",
            ),
        ],
    )

    write_pdf(
        "02-uiux-david.pdf",
        {
            "title": "UI and UX",
            "speaker": "David Kwame Castel",
            "role": "UI/UX and frontend",
            "duration": "about 1 minute 45 seconds",
            "slot": "Second (after Hafsa)",
            "camera": "Face, then walk through live UI or Figma / screens",
        },
        [
            ("h", "Who we designed for"),
            ("cue", "[FACE, then cut to login screen.]"),
            (
                "p",
                "I am David. I led UI and UX. We did not design for a developer. We designed for a shop owner and a shop assistant "
                "who may be serving a customer while they tap. So the first test was: can they log in, sell an item, and see stock, in under a minute?",
            ),
            (
                "p",
                "The primary user is the owner: they care about stock, sales, and profit. Staff need a short path to record a sale and nothing extra in the way. "
                "That is why the app is one shell, one search, one set of nav items, not five different layouts.",
            ),
            ("h", "What you see on screen"),
            ("cue", "[WALK THE LIVE APP. Hover the sidebar. Do not click every page — Peter and Benjamin will.]"),
            (
                "p",
                "Login is calm and branded. After login, App Shell keeps breadcrumb, search, and notifications in the same place on every screen. "
                "Low stock is not buried: a banner and counts so they act before the shelf is empty. Money is in Ghana cedis, because that is how the shop thinks.",
            ),
            (
                "p",
                "Colour does work, not decoration. Green is in stock. Orange is low. Red is out. Charts on profit use the same language as the inventory table. "
                "We kept forms short: name, category, stock, sell price, cost. If a field is not needed at the counter, it is not on the first screen.",
            ),
            ("h", "UX decisions that mattered"),
            (
                "li",
                "Sale is a three-step story: add items, review, success. We did not dump everything on one long form.",
            ),
            (
                "li",
                "Protected routes: if you are not logged in, you never see stock or profit.",
            ),
            (
                "li",
                "Offline is visible. A sync status tells you the sale is queued, not lost. Trust is a UX feature.",
            ),
            (
                "li",
                "Settings let the owner change password after the demo login. We designed for real use after the class demo.",
            ),
            ("h", "Handoff"),
            (
                "p",
                "The screens are the contract with the user. Peter will show how we built the shell, inventory, and categories in React.",
            ),
        ],
    )

    write_pdf(
        "03-frontend-peter.pdf",
        {
            "title": "Frontend — shell, inventory, and categories",
            "speaker": "Peter Appiah",
            "role": "Frontend developer",
            "duration": "about 1 minute 45 seconds",
            "slot": "Third (after David)",
            "camera": "Screen share of the running app and a little code if you want",
        },
        [
            ("h", "What I built"),
            ("cue", "[SCREEN: browser at localhost or Vercel. Optionally split with VS Code on App.jsx.]"),
            (
                "p",
                "I am Peter. I work on the frontend. The app is React with Vite. We chose that because it is fast to run locally and easy to deploy on Vercel. "
                "React Router is the map of the product: login, dashboard, products, categories, sales, reports, profit, backup, and settings.",
            ),
            (
                "p",
                "Auth lives in context. After login we store a JWT and every request goes through one API client. "
                "Protected Route is the gate: no token, no inventory. That matches how the shop should work. You should not see another person's stock.",
            ),
            ("h", "Inventory and categories — demo this"),
            ("cue", "[CLICK: Dashboard, then Inventory, open edit on one product, then Categories.]"),
            (
                "p",
                "Dashboard is the morning view: how the shop is doing at a glance. Inventory is where the work happens. "
                "You can search, filter by in stock, low, or out, and export CSV if they still want a spreadsheet. "
                "Add or edit a product: name, SKU, category, stock, sell price, cost, and minimum stock. Those numbers come from the API, not from a notebook in the browser.",
            ),
            (
                "p",
                "If this product has more than one cost layer, you will see them here: oldest stock listed first. "
                "That is the UI for the database idea Francis and Raymond will explain. I just had to show it so the owner is not surprised.",
            ),
            (
                "p",
                "Categories are first-class. Notebooks, pens, paper — they can add their own groups. The category screen talks to its own API, "
                "and the product form uses the same list, so we do not get two different spellings of 'Pens'.",
            ),
            ("h", "Handoff"),
            (
                "p",
                "That is the shell and the catalogue. Benjamin will take the sale, the reports, and what happens when the internet dies.",
            ),
        ],
    )

    write_pdf(
        "04-frontend-benjamin.pdf",
        {
            "title": "Frontend — sales, profit, and offline",
            "speaker": "Benjamin Azumah",
            "role": "UI/UX and frontend",
            "duration": "about 1 minute 45 seconds",
            "slot": "Fourth (after Peter)",
            "camera": "Screen share of sale flow, profit page, sync indicator",
        },
        [
            ("h", "The sale, as the shop does it"),
            ("cue", "[CLICK through New sale, Confirm, Success. Speak while you click.]"),
            (
                "p",
                "I am Benjamin. I also work on frontend and UI. The path that pays the rent is New Sale. "
                "You pick products, quantities, then Review, then Confirm. We split it on purpose so they can catch a wrong quantity before stock moves. "
                "Success stays inside the same shell so it does not feel like they left the app.",
            ),
            (
                "p",
                "Orders is the history of those sales. Reports is revenue over time. Profit is the page we are proud of: daily, weekly, monthly, yearly, "
                "with revenue, cost of goods, and gross profit. The chart is Recharts. The numbers come from the backend, not from multiplying today's cost by old sales.",
            ),
            ("h", "Offline and keep-alive"),
            ("cue", "[POINT at sync status if visible. OPTIONAL: turn on airplane mode, record a sale, turn network back on.]"),
            (
                "p",
                "Shops lose internet. We queue sales in IndexedDB with Dexie. If you are online we post to the API. If you are not, we save locally "
                "and flush when the browser comes back online. Last write wins if there is a conflict, and we do not silently delete a queued sale. "
                "That is UX plus engineering: the owner should see pending, not a blank error.",
            ),
            (
                "p",
                "On Vercel the frontend pings the API every thirty seconds while the tab is open, because the free Render server sleeps. "
                "For a class demo that ping is the difference between a frozen login and a live system.",
            ),
            ("h", "Settings and backup"),
            (
                "p",
                "Owner settings: change display name and password after the demo login. Backup is owner-only. "
                "I wired the screens; Albert locked the routes. That split is how we stayed fast without leaving holes.",
            ),
            ("h", "Handoff"),
            (
                "p",
                "The UI is only as true as the API. Albert will show the backend that stamps prices, checks stock, and keeps the shop secure.",
            ),
        ],
    )

    write_pdf(
        "05-backend-albert.pdf",
        {
            "title": "Backend",
            "speaker": "Ayapong Albert Yeboah",
            "role": "Backend lead",
            "duration": "about 2 minutes 15 seconds",
            "slot": "Fifth (after Benjamin)",
            "camera": "Face, then VS Code on backend routes / health endpoint",
        },
        [
            ("h", "What the API is"),
            ("cue", "[SHOW: terminal curl to /api/health, or Postman. Then a quick look at backend/src/index.js.]"),
            (
                "p",
                "I am Albert. I lead the backend. The server is Node and Express. Every screen you just saw talks to REST routes: auth, products, categories, sales, reports, backup, and sync. "
                "We issue JWTs after login. The password is hashed. If the username is wrong we still do a dummy hash so we do not leak whether an account exists.",
            ),
            (
                "p",
                "Two modes, one interface. Standalone mock needs no Postgres, so the team could demo on day one. Connected mode is real Postgres on Render. "
                "Routes do not care which one is underneath. That was an architecture decision: we would not block frontend on the database being ready.",
            ),
            ("h", "Sales and profit — the important part"),
            ("cue", "[OPTIONAL: show a sale JSON with unit_price and unit_cost.]"),
            (
                "p",
                "When you record a sale, the API does not trust the browser's prices. It locks the product, checks quantity, and stamps two numbers on the line: "
                "the current shelf price, and the cost of the stock being sold. Cost comes from FIFO layers, oldest first. "
                "If leftover old stock is still on the shelf, we do not pretend it cost the new supplier price. Profit reports then add those stamped lines. "
                "Change the product tomorrow; yesterday's sale does not rewrite.",
            ),
            (
                "p",
                "Sync is the same create-sale path for the offline queue, with a whitelist on product fields so a client cannot inject a column name. "
                "Backup snapshots include those layers so a restore does not flatten history.",
            ),
            ("h", "Security, in one breath"),
            (
                "p",
                "Helmet headers, CORS allow-list for Vercel, rate limits on login, small JSON bodies, parameterized SQL, owner-only backup, "
                "and no secrets in git. Finance-adjacent data does not get a student demo password in production. Change owner-one-two-three-four.",
            ),
            ("h", "Deploy"),
            (
                "p",
                "API and Postgres live on Render. Frontend on Vercel. Health check keeps the story honest: status ok, mode postgres or mock. "
                "Francis and Raymond will show the tables that make those stamps possible.",
            ),
        ],
    )

    write_pdf(
        "06-database-francis.pdf",
        {
            "title": "Database — schema and migrations",
            "speaker": "Ntim Francis Gyan",
            "role": "Database management and maintenance",
            "duration": "about 1 minute 45 seconds",
            "slot": "Sixth (after Albert)",
            "camera": "Screen share of migrations folder and ERD if you have it",
        },
        [
            ("h", "Why Postgres, why migrations"),
            ("cue", "[SHOW: database/migrations folder, files 001 to 006.]"),
            (
                "p",
                "I am Francis. Raymond and I own the database. We use PostgreSQL because this is real shop data: users, products, sales, money. "
                "We did not dump a single SQL file and pray. We numbered migrations. Run migrate, and it only applies what is new. "
                "That is how seven people can pull main without breaking each other's tables.",
            ),
            ("h", "The core model"),
            ("cue", "[SHOW: ERD document or a simple table list on a slide.]"),
            (
                "p",
                "Users: owner and staff, with hashed passwords and roles. Products: name, SKU, quantity, unit price, minimum stock. "
                "Sales: who sold, total, sync status, time. Sale items: which product, how many, the unit price at that moment, the subtotal. "
                "Categories for grouping. Backups so the owner can snapshot and restore. Every money column is numeric, not float, because pesewas matter.",
            ),
            (
                "p",
                "Foreign keys keep the story clean. You cannot have a sale line without a product. Delete a product and its layers go with it. "
                "Indexes on names and dates because reports filter by time and the shop searches by product name.",
            ),
            ("h", "How we run it"),
            (
                "p",
                "Locally: create database regimens, copy env, npm run migrate, npm run seed. On Render the same DATABASE_URL is injected into the API. "
                "We never commit .env. The seed gives the demo owner and five stationery products so the frontend is never empty.",
            ),
            ("h", "Handoff"),
            (
                "p",
                "That is the skeleton. Raymond will show cost, selling price history as layers, and why profit of old stock stays true.",
            ),
        ],
    )

    write_pdf(
        "07-database-raymond.pdf",
        {
            "title": "Database — cost layers and profit history",
            "speaker": "Ampaabeng Raymond Kyeremeh",
            "role": "Database management and maintenance",
            "duration": "about 1 minute 45 seconds",
            "slot": "Closes the video (after Francis)",
            "camera": "Screen share of migration 007 and 008, then a product with two layers",
        },
        [
            ("h", "The problem we solved last"),
            ("cue", "[FACE, then SHOW: 007 and 008 SQL files.]"),
            (
                "p",
                "I am Raymond. I work on the database with Francis. Here is the shop problem in one sentence. "
                "They buy a carton of books at two cedis fifty, then restock later at four cedis, then they raise the selling price. "
                "If we only store one cost on the product, analytics will lie: leftover old books look as expensive as the new ones.",
            ),
            ("h", "What we store"),
            (
                "p",
                "Migration 007 added cost price on the product and unit cost on each sale line. That protected completed sales. "
                "Migration 008 added product stock layers: each restock is a lot with its own cost, a snapshot of the listed price, and quantity remaining. "
                "The product row still has the current shelf price and the cost we expect to pay next. Layers are the truth of what is on the shelf.",
            ),
            (
                "p",
                "When they sell, we consume oldest remaining quantity first. The sale stamps today's selling price and that lot's cost. "
                "Old stock, new stock, honest profit. Seed and backup know about layers, so a restore does not flatten the shop's history.",
            ),
            ("h", "Close the video"),
            ("cue", "[WIDE SHOT OF THE TEAM if you can. Smile. Do not rush this last paragraph.]"),
            (
                "p",
                "So that is Regimens. A shop that used a notebook now has a web app: designed for the counter, built in React, served by a secure API, "
                "and stored in Postgres with a memory for what stock actually cost. We are Team Regimens. Thank you.",
            ),
        ],
    )

    print("Wrote PDFs to", OUT)


if __name__ == "__main__":
    main()
