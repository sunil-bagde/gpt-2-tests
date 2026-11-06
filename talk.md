/trun Check which database this project uses. If it is not Postgres, migrate to Postgres (keep the same tech). use orm drizzle, Add a dummy login page in the existing UI stack: hardcoded user in a users table, email + password form, no sessions beyond a simple cookie. Done when Postgres is the database and I can log in through the UI.

“Claude Code gives you two loops. /loop repeats a prompt on a timer. /goal keeps going until a condition is met.”
“/goal adds a second model that checks the condition after each turn. But that checker only reads the conversation. It never runs the tests or opens the code itself.”
“Trio takes a different route. It plans first, and I approve the plan before anything runs.”
“Then a fresh reviewer session reads the actual code, and real test commands decide if it passes, not a summary of what Claude says it did.”
“Each step uses its own model: a cheap one for chat, a strong one for planning, and a mid one for building and reviewing.”
“For bigger jobs, trio’s /tauto splits the work into lanes that run in parallel and merges them at the end.”
“/loop repeats, /goal persists, and trio verifies, with proof saved for every run.”