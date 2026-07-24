# CycleWarden — định hướng chiến lược theo bằng chứng

> **Trạng thái:** quyết định vận hành có thể bị bác bỏ, không phải tuyên bố thị trường hay product-market fit.  
> **Ngày khóa:** 2026-07-24  
> **Nguồn sự thật ưu tiên:** `IDEA.md` → `ROADMAP.md` → `docs/ai/PROJECT_MODEL.md` → `docs/CAPABILITIES.json` → protocol #14.

## 1. Quyết định hiện tại

CycleWarden **không mở rộng theo SaaS feature parity, MCP, microVM, monetization hoặc marketing trước khi hoàn thành gate giá trị người dùng #14**.

Rủi ro lớn nhất hiện tại không phải thiếu kiến trúc. Rủi ro lớn nhất là xây một hệ thống kỹ thuật đáng tin cậy cho một quyết định mà người dùng không cần.

Chuỗi ưu tiên được khóa:

```text
interactive A2 workspace
→ exactly 6 external decision audits
→ apply the fixed pass / inconclusive / fail rule
→ only then choose governed execution or problem repositioning
```

## 2. Trạng thái đã kiểm chứng

### Đã có bằng chứng kỹ thuật

- deterministic Evolution Cycle, policy và durable journal;
- content-addressed evidence và exact citation records;
- repository research, explicit-source capture và GitHub repository search;
- named-candidate decision records và parameter-bound `ExecutionHandoff`;
- trusted-local và hostile Docker execution baseline;
- independent package boundary trên Node.js 20, 22 và 24;
- A2 pilot protocol cố định và fail-closed operations pack;
- Next.js product foundation, authentication paths và PostgreSQL isolation tests.

### Chưa có bằng chứng sản phẩm

- external completed audits: **0/6**;
- pilot clock: **chưa bắt đầu**;
- chưa có người dùng ngoài xác nhận CycleWarden thay đổi, xác nhận hoặc ngăn một quyết định có ý nghĩa;
- chưa có repeat-use evidence;
- chưa có coding-agent delivery qua approved handoff;
- chưa có independent implementation verdict, release hoặc measured outcome.

Technical CI success không được tính là decision value.

## 3. Xử lý tài liệu chiến lược trước đây

Các quan sát về thị trường AI agent, tăng trưởng của công ty coding-agent hoặc quy định pháp lý chỉ là **context**, không phải bằng chứng CycleWarden có demand.

Các tuyên bố sau không còn được dùng làm lý do ưu tiên mặc định:

- “CycleWarden phải đạt feature parity với Open SaaS trước”;
- “Stripe Checkout là blocker lớn nhất của sản phẩm”;
- “kiến trúc hiện tại đã compliance-ready với EU AI Act”;
- “không đối thủ nào có cùng moat”;
- mục tiêu GitHub stars, MRR hoặc user count không có acquisition experiment.

Lý do:

1. Chưa có external user evidence xác định billing, teams, admin hoặc OAuth là vấn đề cần giải quyết tiếp theo.
2. Logging, evidence và approval gates có thể hỗ trợ governance, nhưng không tự chứng minh tuân thủ pháp lý.
3. Các thương vụ, doanh thu và định giá của công ty khác không chứng minh willingness-to-use hoặc willingness-to-pay cho CycleWarden.
4. Mọi định vị “duy nhất”, “đi đầu” hoặc “compliance-ready” phải có review độc lập và phạm vi claim rõ ràng.

## 4. Kế hoạch triển khai đã khóa

### Gate 0 — usable A2 audit surface

Mục tiêu: một operator có thể chạy flow hiện có mà không ghép CLI thủ công.

```text
objective
→ inspect
→ trusted assessment
→ bounded repository research
→ independent review
→ decision + reversible experiment
→ persisted ExecutionHandoff
```

Phạm vi:

- hoàn thiện PR #39;
- local-first, A2/R1, một server-configured trusted repository;
- explicit opt-in, authorization, rate limits và bounded subprocess;
- không execute handoff, không sửa code, không merge, không deploy;
- không lộ filesystem path cho người không có quyền;
- canonicalize repository path trước mọi filesystem-root trust check.

**Exit:** final CI xanh, review không còn blocker và PR chỉ merge khi owner cho phép rõ ràng.

### Gate 1 — external decision-value pilot #14

Giữ nguyên protocol đã precommit:

- đúng **6 developer / 6 repository**;
- một primary audit mỗi repository;
- tối đa 90 phút mỗi session;
- tối đa 14 ngày từ external session đầu tiên;
- không thêm participant, repository hoặc tuần sau khi thấy kết quả.

Decision rule:

```text
SUCCESS
≥ 3/6 audit tạo decision value
và ≥ 4/6 participant giải thích, phản biện được ranking
và không có repeated serious evidence/privacy/safety failure

INCONCLUSIVE
exactly 2/6 audit tạo decision value

FAIL
≤ 1/6 audit tạo decision value
hoặc serious failure lặp lại
```

Trường hợp protocol chưa phân loại phải được báo là protocol gap; không tự đặt threshold mới.

**Exit:** sáu redacted session records và report áp dụng đúng rule đã khóa.

### Gate 2A — nếu pilot SUCCESS

Triển khai một vertical slice duy nhất:

```text
approved ExecutionHandoff
→ thin AgentAdapter contract
→ generic command baseline
→ one real coding agent
→ isolated branch/worktree
→ change manifest
→ independent verifier
→ draft PR
```

Nguyên tắc:

- adapter generic phải mỏng và được ép bởi một agent thật trong cùng milestone;
- agent không sở hữu cycle state, authorization, acceptance, merge hoặc deployment;
- verifier phải tách khỏi implementer;
- draft PR only;
- #12 hard quota, process-exhaustion và security-review gaps được đánh giá theo exposure thật trước khi chạy untrusted code.

### Gate 2B — nếu pilot INCONCLUSIVE

Cho phép đúng một redesigned pilot với cùng sample size và precommitted rule.

Chỉ sửa những yếu tố được evidence chỉ ra, ví dụ:

- beachhead chưa đúng;
- audit output khó hiểu;
- source coverage thiếu;
- decision framing quá rộng;
- session workflow tạo friction.

Không mở rộng broad research, SaaS features hoặc agents chỉ để “thử thêm”.

### Gate 2C — nếu pilot FAIL

Dừng mở rộng research và agent capability.

Reassess theo thứ tự:

1. người dùng mục tiêu;
2. quyết định thật họ đang gặp;
3. workaround hiện tại;
4. lý do CycleWarden không thay đổi quyết định;
5. có nên thu hẹp, reposition hoặc dừng hướng hiện tại.

## 5. Công việc bị hoãn có chủ đích

Các hạng mục sau là destination architecture hoặc hypothesis, không phải next task mặc định:

- Stripe checkout, subscription portal và billing parity;
- teams, RBAC và admin dashboard;
- OAuth provider expansion;
- blog/CMS và marketing campaign;
- MCP/A2A server;
- Firecracker/E2B/remote sandbox;
- general web search, browser/PDF adapters;
- hosted multi-tenant CycleWarden;
- monetization tiers và MRR targets.

Một hạng mục chỉ được kích hoạt khi:

- pilot evidence chỉ ra nó chặn decision value; hoặc
- một workflow đã được xác nhận cần nó; hoặc
- safety/dependency gate của vertical slice kế tiếp bắt buộc nó.

## 6. Metrics hiện tại

### Primary

- decision-value audits: target gate `≥3/6`;
- explainable/challengeable rankings: target gate `≥4/6`;
- repeated serious evidence/privacy/safety failure: `0`.

### Diagnostic

- thời gian từ pre-audit decision đến decision-changing evidence;
- recommendation changed / confirmed / prevented / no effect;
- false positives, missing context và rejected recommendations;
- technical outcome tách khỏi product outcome;
- willingness to repeat, không được dùng thay primary outcome.

Không dùng GitHub stars, competitive score hoặc projected MRR làm success criterion của pilot này.

## 7. External context policy

External facts phải:

- đến từ primary source khi có thể;
- ghi event date, publication date và access date;
- tách fact khỏi inference;
- có expiry/review date;
- không được biến thành product demand claim.

Ví dụ, announced merger agreement, company-reported revenue hoặc regulatory timetable chỉ cho thấy context thay đổi; chúng không chứng minh CycleWarden nên xây billing, MCP hoặc compliance product ngay.

## 8. Definition of done cho giai đoạn hiện tại

Giai đoạn hiện tại hoàn tất khi:

1. PR #39 đạt final CI và review gate;
2. owner quyết định merge riêng;
3. recruitment channel được owner cho phép;
4. đúng sáu external audits được thực hiện và redacted;
5. fixed decision rule được áp dụng không đổi;
6. next workstream được chọn từ kết quả pilot, không từ độ hấp dẫn của một roadmap lớn.

Cho tới lúc đó, trạng thái trung thực là:

> CycleWarden có một A2 technical foundation đáng kể và một pilot operational pack, nhưng external product decision value vẫn chưa được chứng minh.
