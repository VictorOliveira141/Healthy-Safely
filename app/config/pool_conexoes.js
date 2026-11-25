// dotenv.config() é chamado em app.js
const mysql = require("mysql2");

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  charset:            "utf8mb4",
  port:               process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

pool.getConnection((err, conn) => {
  if (err) {
    console.error("Erro ao conectar no MySQL:", err.message);
    console.error("   Verifique as variáveis no arquivo .env");
  } else {
    console.log("MySQL conectado com sucesso!");
    conn.release();
  }
});

module.exports = pool.promise();
