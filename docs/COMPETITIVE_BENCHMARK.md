# Shipkit — So sánh với mốc thị trường (Competitive Benchmark)

> **Mấu chốt:** không chỉ audit nội bộ — lấy **các dự án khác làm mốc** để biết mình đang đứng đâu và cần đuổi gì.  
> Cập nhật theo code Shipkit + public docs đối thủ (~2026). Thang điểm **0–5** (0 = không có, 5 = best-in-class trong nhóm).

---

## 1. Bộ mốc cố định (comparison set)

| # | Dự án | Vai trò mốc | Giá | Stack cốt |
|---|--------|-------------|-----|-----------|
| 1 | **[Open SaaS](https://opensaas.sh/)** (Wasp) | Free OSS đầy feature; agent DX mạnh | Free | Wasp + React + Prisma |
| 2 | **[MakerKit](https://makerkit.dev/)** | Production SaaS depth (teams, RLS, billing) | ~$299+ | Next + Supabase **hoặc** Better Auth/Drizzle |
| 3 | **[supastarter](https://supastarter.dev/)** | Multi-framework + multi-pay | ~$300+ | Next / Nuxt / TanStack |
| 4 | **[ShipFast](https://shipfa.st/)** | TTP cực nhanh, marketing landing | ~$199+ | Next + Supabase/Mongo + Stripe |
| 5 | **[nextjs/saas-starter](https://github.com/nextjs/saas-starter)** | Official minimal clean reference | Free | Next + PG + Auth.js + Stripe |
| 6 | **create-t3-app / t3-turbo** | Type-safe scaffold monorepo | Free | Next + tRPC + Drizzle… |

**Shipkit không so với Lovable/Bolt** (closed AI builders) trên cùng trục — khác model (owned code vs chat SaaS).

---

## 2. Ma trận feature (mốc vs Shipkit)

Ký hiệu: ✅ solid · ⚠️ partial/demo · ❌ missing · 💰 paid only

| Tiêu chí | Open SaaS | MakerKit | supastarter | ShipFast | next saas-starter | **Shipkit (code)** |
|----------|-----------|----------|-------------|----------|-------------------|--------------------|
| **Giá / license** | Free MIT-ish | Paid | Paid | Paid | Free | **Free MIT** |
| **Landing marketing** | ✅ | ✅ | ✅ | ✅✅ | ⚠️ basic | ✅ |
| **Auth email/password** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **OAuth social** | ✅ multi | ✅ | ✅ | ✅ | ⚠️ | ⚠️ BA env-gated + UI |
| **Teams / multi-tenant** | ⚠️ light | ✅✅ | ✅✅ | ❌ | ⚠️ light | ❌ |
| **Billing Stripe** | ✅ | ✅ | ✅ multi-pay | ✅ | ✅ | ⚠️ Stripe adapter + `/app/billing` (env) |
| **Email transactional** | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ Resend/console + **welcome on signup** |
| **File upload / storage** | ✅ S3 | ✅ | ✅ | ⚠️ | ❌ | ✅ local+S3 (profile) |
| **Admin dashboard** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Blog / CMS** | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| **Background jobs** | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ |
| **DB portable (any PG)** | ✅ | ✅ (Drizzle kit) | ✅ | ⚠️ | ✅ | ✅ |
| **Supabase-first path** | ❌ | ✅ kit | ⚠️ | ✅ | ❌ | ✅ |
| **Self-host deploy** | ✅ Fly/Railway/Docker | ✅ | ✅ | ⚠️ Vercel-first | ⚠️ | ✅ Docker + docs |
| **Security headers / RLS docs** | ⚠️ | ✅✅ | ✅ | ⚠️ | ⚠️ | ✅ headers + RLS SQL |
| **Rate limiting** | ⚠️ | ✅ | ✅ | ⚠️ | ❌ | ✅ memory/Upstash |
| **E2E tests in CI** | ⚠️ | ✅ | ✅ | ❌ | ⚠️ | ✅ demo + pg job |
| **Agent DX (AGENTS/skills)** | ✅✅ | ✅ | ⚠️ | ❌ | ❌ | ✅✅ IDEA+skills |
| **Non-dev / i18n docs** | ⚠️ EN | EN | EN | EN | EN | ✅✅ README VI trái ngành |
| **Multi UI framework code** | ❌ (Wasp) | ⚠️ variants | ✅✅ | ❌ | ❌ | ❌ (docs only) |
| **Vibe / IDEA workflow** | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ✅✅ core bet |

---

## 3. Điểm theo trục chiến lược (0–5)

| Trục | Trọng số | Open SaaS | MakerKit | ShipFast | next starter | **Shipkit** | Mốc cần đuổi |
|------|----------|-----------|----------|----------|--------------|-------------|--------------|
| **Time-to-product (TTP)** | 15% | 4 | 3 | **5** | 4 | **3.5** | ShipFast simplicity |
| **Auth completeness** | 12% | 5 | **5** | 4 | 4 | **3.5** | Open SaaS / MakerKit |
| **Billing ready** | 12% | **5** | **5** | **5** | 4 | **1** | Mọi kit trả phí + Open SaaS |
| **Multi-tenant / teams** | 8% | 2 | **5** | 0 | 2 | **0** | MakerKit / supastarter |
| **Portability (no lock-in)** | 12% | 4 | **5** | 2 | 3 | **4** | MakerKit Drizzle kit |
| **Security baseline** | 12% | 3 | **5** | 2 | 3 | **4** | MakerKit |
| **Agent / vibe DX** | 15% | **5** | 4 | 1 | 1 | **4.5** | Open SaaS (giữ lead) |
| **Docs for non-devs** | 6% | 2 | 3 | 3 | 2 | **5** | **Shipkit lead** |
| **Multi-framework** | 4% | 1 | 3 | 0 | 0 | **1** | supastarter |
| **Production ops (jobs, admin, email flows)** | 4% | **5** | 4 | 2 | 2 | **2** | Open SaaS |

### Điểm tổng có trọng số (ước lượng)

| Dự án | Score ~ |
|-------|---------|
| MakerKit | **4.4** |
| Open SaaS | **4.2** |
| supastarter | **4.1** |
| ShipFast | **3.3** |
| next saas-starter | **2.9** |
| **Shipkit (sau P0 sprint)** | **~3.6** (billing/mail/notes/e2e lên; chưa teams/admin) |

**Đọc điểm:** Shipkit đang **ngang/dưới ShipFast về “đủ để bán SaaS”**, **mạnh hơn starter official** về vibe/security/docs VI, **yếu rõ billing/teams/admin** so với Open SaaS & MakerKit.

---

## 4. Mình đang làm thế nào so với từng mốc?

### vs Open SaaS (free leader)

| Họ có, mình thiếu | Mình có, họ yếu hơn |
|--------------------|---------------------|
| Stripe/Polar **wired** | README **tiếng Việt** trái ngành |
| Admin dashboard | Dual path **Next native** (không lock Wasp) |
| Background jobs | Ports/adapters rõ (đa vendor) |
| Blog + AI demo app | IDEA.md workflow |

**Kết luận:** Open SaaS = mốc **feature surface free**. Shipkit muốn “free + vibe” phải **đuổi billing + email flow + admin tối thiểu**, không cần copy Wasp.

### vs MakerKit (production leader)

| Họ | Shipkit |
|----|---------|
| Teams, RBAC, billing, RLS-as-architecture | Single-user foundation |
| Packages production-hardened | Packages đúng hướng, depth mỏng |
| $299 | Free |

**Kết luận:** Không đua full MakerKit. Lấy MakerKit làm mốc **authz + billing + isolation quality**. Mục tiêu: **80% security/portable quality**, không 100% B2B multi-tenant.

### vs ShipFast (speed leader)

| Họ | Shipkit |
|----|---------|
| Checkout + landing conversion cực nhanh | Foundation + agent rules |
| Ít test / nông security | Headers, rate limit, e2e, ports |
| Paid, Vercel-centric | Free, Docker + Vercel |

**Kết luận:** Học **TTP & landing clarity** của ShipFast; **không** copy nông security.

### vs supastarter (multi-FW leader)

| Họ | Shipkit |
|----|---------|
| Next + Nuxt + TanStack **code** | Chỉ guide multi-FW |
| Nhiều payment provider | Stripe adapter env-gated (1 provider) |

**Kết luận:** Multi-framework là mốc **Phase D**, sau khi parity core với Open SaaS free features.

### vs nextjs/saas-starter (minimal official)

Shipkit **đã vượt** về: dual auth, agent DX, storage/mail ports, VI docs, rate limit.  
Shipkit **chưa bằng** về: Stripe end-to-end đơn giản, activity logging polish.

---

## 5. Positioning từ benchmark (1 câu)

> **Shipkit = free, agent-first product kit trên Next, portable infra (Supabase *hoặc* any Postgres), docs cả người trái ngành — đuổi Open SaaS về billing/email/admin, đuổi MakerKit về security/isolation, đuổi ShipFast về TTP — không đua multi-tenant B2B hay multi-FW sớm.**

---

## 6. Backlog ưu tiên **theo mốc đối thủ** (không theo cảm tính)

### P0 — Đuổi Open SaaS free surface (parity tối thiểu)

| # | Việc | Mốc “xong” so với ai |
|---|------|----------------------|
| 1 | **Stripe adapter thật** + checkout stub | = next starter / Open SaaS “có billing” |
| 2 | **Email on signup** (Resend/console) | = Open SaaS mail path |
| 3 | **Notes (hoặc domain) persist + user isolation** | = mọi kit production demo |
| 4 | **E2E auth signup→app** portable-pg | ≥ ShipFast (họ thường không e2e) |

### P1 — Đuổi MakerKit quality (không copy teams)

| # | Việc | Mốc |
|---|------|-----|
| 5 | Middleware session verify (BA) | MakerKit session rigor |
| 6 | RLS/isolation tests documented + e2e | MakerKit RLS culture |
| 7 | `db:migrate` first-class | MakerKit migration story |

### P2 — Đuổi ShipFast TTP

| # | Việc | Mốc |
|---|------|-----|
| 8 | One-click env wizard / doctor UX | ShipFast “weekend ship” feel |
| 9 | Landing sections (pricing, FAQ) polish | ShipFast marketing shell |
| 10 | Vercel deploy button + verified script | ShipFast deploy simplicity |

### P3 — Đuổi Open SaaS agent + unique lead

| # | Việc | Mốc |
|---|------|-----|
| 11 | Giữ/lead **VI non-dev docs** + IDEA templates | Unique vs all |
| 12 | Agent skills + measured TTFP evidence | Open SaaS AGENTS depth |
| 13 | Admin tối thiểu (user list) optional | Open SaaS admin (slim) |

### P4 — Đuổi supastarter (chỉ khi P0–P2 xong)

| # | Việc |
|---|------|
| 14 | App adapter #2 (một framework) |

---

## 7. Scorecard theo quý (cách “lấy họ làm mốc” định kỳ)

Mỗi quý chấm lại bảng §3. **Rule:**

- Không tăng version major nếu **Billing** & **Auth e2e** &lt; 4  
- Không claim “multi-framework” nếu không có `apps/*` thứ 2 build trên CI  
- Unique metric Shipkit: **Non-dev docs** + **Agent DX** phải ≥ 4.5 (giữ lợi thế)

### Target score end of next phase

| Trục | Hiện tại | Target Phase A–B |
|------|----------|------------------|
| TTP | 3.5 | **4.5** |
| Auth | 3.5 | **4.5** |
| Billing | 1 | **4** |
| Portability | 4 | **4.5** |
| Security | 4 | **4.5** |
| Agent DX | 4.5 | **5** |
| **Tổng ~** | **~3.2** | **~4.0** (gần Open SaaS free, dưới MakerKit paid) |

---

## 8. Liên kết tài liệu

| Doc | Vai trò |
|-----|---------|
| **This file** | Mốc ngoài + gap vs thị trường |
| [`DEVELOPMENT_PLAN.md`](./DEVELOPMENT_PLAN.md) | Audit code nội bộ + sprint |
| [`ROADMAP.md`](../ROADMAP.md) | Checklist trung thực |
| [`STANDARDS.md`](../STANDARDS.md) | 12-factor, ASVS, agents.md |

---

## 9. Kết luận ngắn

| Câu hỏi | Trả lời |
|---------|---------|
| Hiểu mấu chốt “so mốc ngoài”? | **Có — đây là scoreboard chính** |
| Shipkit đang ở đâu? | **~3.2/5**: mạnh vibe/docs/portable; yếu billing/teams/admin/domain persist |
| Đuổi ai trước? | **Open SaaS free features** (Stripe + mail + persist demo) + **MakerKit quality** (session/RLS) + **ShipFast TTP** |
| Không đuổi sớm? | Multi-FW supastarter, full B2B multi-tenant MakerKit |

Mọi PR lớn nên trả lời 1 câu: **“Cái này đưa ta gần mốc X (Open SaaS / MakerKit / ShipFast) ở trục Y như thế nào?”**
