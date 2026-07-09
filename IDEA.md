# Product idea (edit this)

> Agents and humans: this file is the source of truth for **what** we build.  
> Stack and rules live in `AGENTS.md` — don't re-pick the stack here.

## Working title

Shipkit Demo Product

## One sentence

A starter product shell so I can replace this idea with my own and ship fast.

## Who is it for?

- Builders who want to launch a small web product  
- People using AI coding agents (vibe coding)

## Problem

Starting from zero wastes time on auth, DB, security, and deploy before any real product value.

## Solution (MVP)

1. Public landing that explains the product  
2. Sign up / sign in  
3. Protected `/app` home  
4. User profile row in the database  
5. Deploy recipe chosen (Vercel or Docker)

## Out of scope (for now)

- Payments  
- Teams / multi-tenant orgs  
- Mobile apps  
- Native mobile  

## MVP checklist

- [x] Landing page  
- [x] Auth screens  
- [x] Protected app shell  
- [ ] Domain feature #1: ________________  
- [ ] Domain feature #2: ________________  
- [ ] Polish copy + SEO for my brand  

## Data (beyond profiles)

| Entity | Fields (draft) | Who can access |
|--------|----------------|----------------|
| profiles | id, email, display_name | owner only |
| (add yours) | | |

## Success looks like

A stranger can open the site, create an account, and complete the core action in under 2 minutes.

## Notes for agents

- Prefer small vertical slices end-to-end  
- Match existing UI tokens in `globals.css`  
- Never commit secrets  
