# 23 · SQL and database testing

No koans here. Interviews for test engineers often include a few SQL questions, usually live.

## Sample tables

The queries below use these tables.

```sql
departments(id, name)                          -- QA, Dev, HR
employees(id, name, email, dept_id, salary, manager_id)
orders(id, user_id, amount, status)
```

## Interviewers ask

### Queries and concepts

**SQL: second highest salary**
This is the most frequently asked SQL question. Know three ways to answer it:

```sql
-- 1. Subquery (works everywhere)
SELECT MAX(salary) FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- 2. DISTINCT + OFFSET (PostgreSQL / MySQL / SQLite)
SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;

-- 3. Window function (generalises to the Nth highest)
SELECT DISTINCT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM employees
) t WHERE rnk = 2;
```

With salaries 95k, 90k, 90k, 80k, 70k, 70k, all three return **90000**. Explain why `DISTINCT` matters: without it, `OFFSET 1` on a list with a tied top salary would return the top salary again.

Source: interview handbook, not checked against documentation.

**SQL: `ROW_NUMBER` vs `RANK` vs `DENSE_RANK`**
For the values 95, 90, 90, 80:

- `ROW_NUMBER` gives 1, 2, 3, 4 (unique numbers, even for ties).
- `RANK` gives 1, 2, 2, 4 (ties share a rank, then a gap).
- `DENSE_RANK` gives 1, 2, 2, 3 (ties share a rank, no gap).

Source: interview handbook, not checked against documentation.

**SQL: highest earner in each department**
```sql
SELECT d.name AS dept, e.name, e.salary FROM (
  SELECT *, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk FROM employees
) e JOIN departments d ON d.id = e.dept_id
WHERE e.rnk = 1;
-- Dev: Anna 90000, Fay 90000 (tie, so both are returned) · QA: Chen 95000
```

Source: interview handbook, not checked against documentation.

**SQL: find duplicates**
```sql
SELECT email, COUNT(*) AS n FROM employees GROUP BY email HAVING COUNT(*) > 1;
```

Source: interview handbook, not checked against documentation.

**SQL: delete the duplicates, keeping the lowest id**
```sql
DELETE FROM employees
WHERE id NOT IN (SELECT MIN(id) FROM employees GROUP BY email);
```

Always run the matching `SELECT` first, and do it inside a transaction.

Source: interview handbook, not checked against documentation.

**Types of JOIN**
- `INNER JOIN` returns only rows that match in both tables.
- `LEFT JOIN` returns every row from the left table, with `NULL`s where there's no match.
- `RIGHT JOIN` is the mirror image.
- `FULL OUTER JOIN` returns every row from both tables.
- `CROSS JOIN` returns every combination.
- A self join joins a table to itself.

```sql
-- Departments with no employees (the LEFT JOIN + IS NULL pattern) → HR
SELECT d.name FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
WHERE e.id IS NULL;

-- Headcount per department, including departments with zero employees
SELECT d.name, COUNT(e.id) AS headcount   -- COUNT(e.id), not COUNT(*), or HR would show 1
FROM departments d LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.id, d.name;                    -- QA 3, Dev 3, HR 0

-- Employees who earn more than their manager (self join) → Chen 95000 > Anna 90000
SELECT e.name, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e JOIN employees m ON m.id = e.manager_id
WHERE e.salary > m.salary;
```

Source: interview handbook, not checked against documentation.

**`WHERE` vs `HAVING`**
`WHERE` filters rows *before* grouping. `HAVING` filters groups *after* aggregation.

```sql
SELECT dept_id, AVG(salary) FROM employees
WHERE salary > 60000            -- row filter
GROUP BY dept_id
HAVING AVG(salary) > 80000;     -- group filter
```

Source: interview handbook, not checked against documentation.

**Data integrity checks, the SQL an SDET actually writes at work**
```sql
-- Orphan records: orders whose user doesn't exist
SELECT o.* FROM orders o LEFT JOIN employees u ON u.id = o.user_id WHERE u.id IS NULL;

-- Top 3 customers by paid order total
SELECT user_id, SUM(amount) AS total FROM orders
WHERE status = 'PAID' GROUP BY user_id ORDER BY total DESC LIMIT 3;
```

Source: interview handbook, not checked against documentation.

**Theory questions to answer in one line each**
- **Primary key** uniquely identifies a row and can't be null. **Foreign key** references another table's primary key and enforces referential integrity.
- **`DELETE` vs `TRUNCATE` vs `DROP`:** `DELETE` removes rows (can use `WHERE`, can be rolled back, fires triggers). `TRUNCATE` removes all rows quickly (minimal logging, resets identity). `DROP` removes the table itself.
- **`UNION` vs `UNION ALL`:** `UNION` removes duplicates (slower). `UNION ALL` keeps them.
- **Index:** speeds up reads on the columns you filter and join on, and slows down writes. Use `EXPLAIN` to see whether a query uses one.
- **Normalisation (1NF–3NF):** removes redundancy so each fact is stored once. Reporting tables are sometimes deliberately denormalised for speed.
- **ACID:** Atomicity, Consistency, Isolation, Durability. Test it by failing a transaction halfway and checking that nothing was partly saved.
- **SQL injection:** test inputs such as `' OR '1'='1`. The fix is parameterised queries, never string concatenation.

Source: interview handbook, not checked against documentation.

**How do you verify a UI or API action in the database?**
```ts
import { Client } from 'pg';
test('checkout writes a PAID order', async ({ page }) => {
  // … complete checkout in the UI and capture orderId …
  const db = new Client({ connectionString: process.env.TEST_DB_URL });
  await db.connect();
  const { rows } = await db.query('SELECT status, amount FROM orders WHERE id = $1', [orderId]); // parameterised
  expect(rows[0]).toEqual({ status: 'PAID', amount: '49.99' });   // pg returns NUMERIC columns as strings
  await db.end();
});
```

Senior points: use a **read-only** DB user for assertions. Wrap the connection in a worker-scoped fixture. Prefer checking through the API when one exists, because a test tied to the DB schema breaks on every migration. Never point tests at production data.

Source: interview handbook, not checked against documentation.
