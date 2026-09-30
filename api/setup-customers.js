const { db, requireUser } = require("./_lib");

module.exports = async (req, res) => {
  try {
    const user = await requireUser(req, res, ["admin"]);
    if (!user) return;

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    await db().query(`
      CREATE TABLE IF NOT EXISTS customers (
        id uuid PRIMARY KEY,
        company_name text NOT NULL,
        contact_person text,
        phone text,
        email text,
        kra_pin text,
        address text,
        customer_type text NOT NULL DEFAULT 'Business',
        notes text,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    return res.status(200).json({
      success: true,
      message: "Customers table created successfully"
    });

  } catch (error) {
    console.error("Customer setup error:", error);

    return res.status(503).json({
      error: error.message || "Customer table setup failed"
    });
  }
};
