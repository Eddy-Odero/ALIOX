# Portfolio server

Serves the site and powers the chat bot. The API key stays on the server.

## Run

    cd server
    ANTHROPIC_API_KEY=your-key go run .

Then open http://localhost:8080 (open the site through this address, not by double-clicking the HTML files, or the chat cannot reach the server).

Windows PowerShell: `$env:ANTHROPIC_API_KEY="your-key"; go run .`

Without a key the site still works and the chat politely says it is not connected yet.

## What to edit

- `knowledge.md`: the facts the bot may use. Fill in the TODO lines. Restart the server after editing.
- Settings (optional environment variables): `PORT` (8080), `ANTHROPIC_MODEL` (claude-haiku-4-5-20251001), `CHAT_PER_IP_PER_MIN` (10), `CHAT_PER_HOUR` (300), `TRUST_PROXY=1` when deployed behind a proxy such as Render so the limit counts real visitors.

## Your own 3D model

Put a `.glb` file at `assets/robot.glb`. The site uses it automatically (served over http). If it contains a node with "head" in its name, only that node turns to follow the cursor; otherwise the whole model does. Without the file, the built-in head is used.

## Safety notes

- The key is read from the environment only. Never put it in the HTML or JavaScript.
- Each visitor is limited per minute and the whole site per hour, so a public bot cannot run up a large bill. Also set a spending limit on your Anthropic account.
- The server never serves its own folder (`/server/...`).
