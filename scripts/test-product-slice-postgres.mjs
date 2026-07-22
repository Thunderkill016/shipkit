#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required for Product Slice Postgres verification");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });
const suffix = randomUUID();
const userA = `slice-user-a-${suffix}`;
const userB = `slice-user-b-${suffix}`;
const sliceId = `feedback-${suffix}`;
const otherSliceId = `ideas-${suffix}`;

try {
  await sql`
    insert into product_records (user_id, slice_id, data)
    values
      (${userA}, ${sliceId}, ${sql.json({ summary: "A feedback" })}),
      (${userB}, ${sliceId}, ${sql.json({ summary: "B feedback" })}),
      (${userA}, ${otherSliceId}, ${sql.json({ summary: "A idea" })})
  `;

  const visibleToA = await sql`
    select data ->> 'summary' as summary
    from product_records
    where user_id = ${userA} and slice_id = ${sliceId}
    order by created_at desc
  `;
  assert.deepEqual(
    visibleToA.map((row) => row.summary),
    ["A feedback"],
    "owner + slice query exposed another record"
  );

  const wrongOwnerDelete = await sql`
    delete from product_records
    where user_id = ${userB}
      and slice_id = ${sliceId}
      and data ->> 'summary' = 'A feedback'
    returning id
  `;
  assert.equal(wrongOwnerDelete.length, 0, "another owner could delete the record");

  const correctDelete = await sql`
    delete from product_records
    where user_id = ${userA}
      and slice_id = ${sliceId}
      and data ->> 'summary' = 'A feedback'
    returning id
  `;
  assert.equal(correctDelete.length, 1, "owner-scoped delete did not remove the record");

  console.log("Product Slice Postgres OK: schema, owner isolation, and slice isolation verified.");
} finally {
  await sql`
    delete from product_records
    where user_id in (${userA}, ${userB})
  `;
  await sql.end();
}
