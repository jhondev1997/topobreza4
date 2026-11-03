import type { Client } from "@libsql/client";

// Parents first, so foreign keys hold while inserting.
const TABLES = ["project", "milestone", "criterion", "session", "idea", "decision", "weekly_review"];

// Copies every row into a database that already has the schema. It refuses a
// target with data, so running it twice can neither duplicate nor overwrite.
export async function copyData(source: Client, target: Client) {
  for (const table of TABLES) {
    const { rows } = await target.execute(`select count(*) as total from ${table}`);
    if (Number(rows[0].total) > 0) {
      throw new Error(`La base de destino ya tiene datos en "${table}". No copié nada.`);
    }
  }

  const statements = [];
  const copied: Record<string, number> = {};
  for (const table of TABLES) {
    const { rows, columns } = await source.execute(`select * from ${table}`);
    copied[table] = rows.length;
    for (const row of rows) {
      statements.push({
        sql: `insert into ${table} (${columns.join(", ")}) values (${columns.map(() => "?").join(", ")})`,
        args: columns.map((column) => row[column]),
      });
    }
  }

  await target.batch(statements, "write");
  return copied;
}
