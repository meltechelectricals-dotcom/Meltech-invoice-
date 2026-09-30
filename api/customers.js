const crypto = require("node:crypto");
const { db, requireUser, body } = require("./_lib");

module.exports = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
      const search = String(req.query?.search || "").trim();

      const result = search
        ? await db().query(
            `SELECT * FROM customers
             WHERE company_name ILIKE $1
                OR contact_person ILIKE $1
                OR phone ILIKE $1
                OR email ILIKE $1
                OR kra_pin ILIKE $1
             ORDER BY created_at DESC`,
            [`%${search}%`]
          )
        : await db().query(
            `SELECT * FROM customers
             ORDER BY created_at DESC`
          );

      return res.status(200).json({
        customers: result.rows
      });
    }

    if (req.method === "POST") {
      const data = body(req);
      const companyName = String(data.companyName || "").trim();

      if (!companyName) {
        return res.status(400).json({
          error: "Customer/company name is required"
        });
      }

      const result = await db().query(
        `INSERT INTO customers
        (id, company_name, contact_person, phone, email, kra_pin,
         address, customer_type, notes, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active')
        RETURNING *`,
        [
          crypto.randomUUID(),
          companyName,
          String(data.contactPerson || "").trim(),
          String(data.phone || "").trim(),
          String(data.email || "").trim(),
          String(data.kraPin || "").trim(),
          String(data.address || "").trim(),
          String(data.customerType || "Business").trim(),
          String(data.notes || "").trim()
        ]
      );

      return res.status(201).json({
        customer: result.rows[0]
      });
    }

    if (req.method === "PUT") {
      const data = body(req);
      const id = String(data.id || "").trim();

      if (!id) {
        return res.status(400).json({
          error: "Customer ID is required"
        });
      }

      const result = await db().query(
        `UPDATE customers
         SET company_name=$1,
             contact_person=$2,
             phone=$3,
             email=$4,
             kra_pin=$5,
             address=$6,
             customer_type=$7,
             notes=$8,
             updated_at=now()
         WHERE id=$9
         RETURNING *`,
        [
          String(data.companyName || "").trim(),
          String(data.contactPerson || "").trim(),
          String(data.phone || "").trim(),
          String(data.email || "").trim(),
          String(data.kraPin || "").trim(),
          String(data.address || "").trim(),
          String(data.customerType || "Business").trim(),
          String(data.notes || "").trim(),
          id
        ]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          error: "Customer not found"
        });
      }

      return res.status(200).json({
        customer: result.rows[0]
      });
    }

    if (req.method === "DELETE") {
      const data = body(req);
      const id = String(data.id || "").trim();

      if (!id) {
        return res.status(400).json({
          error: "Customer ID is required"
        });
      }

      const result = await db().query(
        `UPDATE customers
         SET status='inactive',
             updated_at=now()
         WHERE id=$1
         RETURNING *`,
        [id]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          error: "Customer not found"
        });
      }

      return res.status(200).json({
        customer: result.rows[0]
      });
    }

    return res.status(405).json({
      error: "Method not allowed"
    });

  } catch (error) {
    console.error("Customers API error:", error);

    return res.status(503).json({
      error: error.message || "Customer management failed"
    });
  }
};
