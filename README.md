# Orbdyn

A private work-tracking desk for your team. It lives on **your** computer.

Orbdyn keeps your projects, your work items, your calendar and every shared
document in one folder on one machine. Colleagues reach it over your office
network, or over the internet if you switch that on — but the documents
themselves never get uploaded to anybody's cloud. They are streamed straight
from your disk when someone asks for them, and the moment you close Orbdyn,
they are unreachable again.

---

## What it does

| | |
|---|---|
| **Track work** | Projects → work items, each with a status, a due date and a progress bar. Drag cards between columns on the board. |
| **See who it was awarded to** | Every work item has one owner. The Overview screen shows who is carrying what, and who is running late. |
| **Watch progress** | Progress percentages roll up automatically to a project bar and to the dashboard. |
| **Share documents** | Drop files in. They are copied into your Orbdyn folder and everyone on the project is told instantly. |
| **Talk about the work** | Messages on any work item or project. Everyone involved gets a pop-up. |
| **Calendar** | Events, invitations, plus every work item's due date shown automatically. |
| **Notifications** | A real desktop pop-up whenever someone messages you, shares a document, or awards you work. |
| **People** | Add colleagues, set them as Administrator, Member or Viewer, switch accounts off. |

---

## Getting it running

### Step 1 — install Node.js (once, about two minutes)

Go to <https://nodejs.org> and click the big green **LTS** button. Install it
with all the default answers. This is the engine Orbdyn runs on; you never have
to think about it again.

### Step 2 — start Orbdyn

Unzip this folder somewhere sensible (your Documents folder is fine — don't
leave it inside a Downloads zip), then double-click:

- **Windows:** `Start Orbdyn (Windows).bat`
- **Mac:** `Start Orbdyn (Mac).command`

The very first time, a black window appears and spends 2–5 minutes downloading
what Orbdyn needs. Leave it alone until the Orbdyn window opens. Every time
after that, it starts in a couple of seconds.

> On a Mac, if double-clicking the `.command` file does nothing, right-click it
> → **Open** → **Open**. macOS asks for that confirmation once per file.

### Step 3 (optional) — make a proper installer with a desktop icon

Once you are happy with it, double-click:

- **Windows:** `Make an installer (Windows).bat`
- **Mac:** `Make an installer (Mac).command`

A few minutes later there will be a `dist` folder next to these files
containing a real installer — `Orbdyn Setup 1.0.0.exe` on Windows, a `.dmg` on
Mac. Run it and Orbdyn behaves like any other installed program, with a desktop
icon and a Start-menu / Applications entry. You can hand that same installer
file to a colleague who wants their own copy.

Because the installer has not been paid to be certified by Microsoft or Apple,
each will warn you the first time:

- **Windows:** click **More info → Run anyway**.
- **Mac:** **right-click** the app → **Open** → **Open**. If it still refuses,
  open Terminal and paste `xattr -cr /Applications/Orbdyn.app`, press Enter,
  then open it normally.

### Don't want the desktop window at all?

Run `npm run server` in this folder and open `http://localhost:4380` in your
browser. Same software, no desktop wrapper.

---

## First run

Orbdyn opens and asks you to create the workspace:

- **Workspace name** — your company or team name.
- **Your name, a username and a password** — this first account is the
  Administrator.

That's it. You are in.

Next, go to **People → Add person** for each colleague. Give each of them a
username and a starting password, and tell them what it is. They can change it
later under Settings.

---

## Letting colleagues in

Open **Settings**. There are two ways:

**On your office network** — Orbdyn shows you an address like
`http://192.168.1.24:4380`. Anyone on the same Wi-Fi or LAN types that into
their browser and signs in. Nothing to install on their side.

**Over the internet** — press **Turn on internet sharing**. Orbdyn opens a
private doorway from the internet directly to your computer and gives you an
address like `https://quiet-river-1234.trycloudflare.com`. Send that to your
colleagues. They still need an Orbdyn username and password.

Two things worth knowing about internet sharing:

- Your documents are **not** copied anywhere. When a colleague downloads a
  file, it is read off your disk at that moment and sent to them.
- The address only works while Orbdyn is running with sharing switched on. Turn
  it off, or quit Orbdyn, and the address dies. A fresh address is generated
  each time — so if you want a permanent one, that is the point at which you'd
  want a proper Cloudflare account and a named tunnel.

Keep Orbdyn running (it sits in your system tray / menu bar even when the
window is closed) if colleagues need access while you are away from the screen.

---

## Where your things are kept

Everything is inside one folder:

```
Documents/Orbdyn/
├── orbdyn-data.json     the work list, projects, calendar, people, messages
├── files/               every shared document, sorted into project folders
│   ├── <project id>/
│   └── _removed/        documents someone deleted — kept, never destroyed
└── backups/             a dated copy of the work list, kept for 30 days
```

**To back Orbdyn up, copy that folder.** That is the whole thing. To move
Orbdyn to another computer, install it there and copy the folder across.

You can open it any time from the Orbdyn menu: **File → Open my Orbdyn folder**,
or by right-clicking the tray icon.

---

## Roles

| Role | Can do |
|---|---|
| **Administrator** | Everything, plus add/remove people and switch internet sharing on and off. |
| **Member** | Create and edit projects, work items, documents, events and messages. |
| **Viewer** | Read everything they have access to. Cannot change anything. |

A project can be visible to *everyone in the workspace* or *only to its team
members* — set that when you create or edit the project.

---

## Notifications

You get a pop-up from your operating system when someone:

- awards a work item to you,
- sends a message on something you are involved in,
- shares a document in one of your projects,
- invites you to a calendar event,
- moves a work item you are involved in to a new status.

The bell at the top right keeps the history. On the very first run your
browser or Mac may ask permission to show pop-ups — say yes. There is a
**Send me a test notification** button in Settings if you want to check.

---

## If something goes wrong

**"Port 4380 is already being used"** — Orbdyn is already running (look in your
system tray or menu bar). If you really want a second copy on a different port,
set the environment variable `ORBDYN_PORT` to another number.

**A colleague can't reach the office-network address** — they are probably on a
different network (guest Wi-Fi is a common culprit), or your computer's
firewall is blocking incoming connections on port 4380. Allow Orbdyn through
the firewall when Windows or macOS asks.

**Internet sharing won't start** — Orbdyn downloads a small helper the first
time you use it, so you need a working internet connection. Some corporate
firewalls block it; if the error mentions a blocked host, that is what happened.

**I forgot the administrator password** — passwords are stored scrambled and
cannot be read back. Another administrator can reset it from the People screen.
If there is only one administrator and the password is lost, the account has to
be recreated by hand in `orbdyn-data.json`.

**Everything looks broken** — quit Orbdyn and start it again. Your data is in
the JSON file and is written after every change, so nothing is lost.

---

## For whoever maintains this

Plain Node.js, no build step, no database server.

```
server/
  index.js    Express app, starts the HTTP server, exposes the share controls
  api.js      every endpoint; the single place permissions are checked
  store.js    the JSON-file data store (atomic writes + dated backups)
  auth.js     scrypt password hashing, signed session cookies
  notify.js   notification records + the live server-sent-events push
  tunnel.js   the "Share online" Cloudflare quick tunnel
public/
  index.html, app.js, styles.css     the whole interface, no framework
electron/
  main.js, preload.js                the desktop window, tray and OS pop-ups
```

Useful commands:

```
npm start          run the desktop app
npm run server     run only the server, then open http://localhost:4380
npm run build:win  make a Windows installer   (needs Windows, or Linux + wine)
npm run build:mac  make a macOS installer     (needs macOS)
```

Environment variables: `ORBDYN_PORT` (default 4380) and `ORBDYN_HOME`
(default `~/Documents/Orbdyn`).

Every source file starts with a plain-English comment explaining what it is
for, and the tricky parts are commented inline.
