const express = require("express");
const jwt = require("jsonwebtoken");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const swaggerUi = require("swagger-ui-express");
const specs = require("./swagger");
const logger = require("./logger");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = "your_secret_key";

// Configuración de la conexión a la base de datos MySQL
const connection = mysql.createConnection({
  host: "192.168.1.96",
  user: "lgomez",
  password: "MySQL2024*",
  database: "JWT",
});

// Conectar a la base de datos MySQL
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL: ", err);
    return;
  }
  console.log("Connected to MySQL database");
});

// Habilitar CORS para permitir solicitudes desde cualquier origen
app.use(cors());

// Middleware para parsear el cuerpo de las solicitudes
app.use(bodyParser.json());

// Middleware para servir archivos estáticos desde la carpeta "public"
app.use(express.static("public"));

// Middleware para manejar errores internos del servidor
function handleServerError(err, req, res, next) {
  console.error("Error interno del servidor:", err);
  res.status(500).json({
    error: {
      code: 500,
      message: "Internal server error",
      details: err.message,
    },
  });
}

// Endpoint para el inicio de sesión
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Permite a los usuarios iniciar sesión y obtener un token JWT válido.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *             required:
 *               - username
 *               - password
 *     responses:
 *       '200':
 *         description: Token JWT generado correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       '400':
 *         description: Credenciales faltantes en la solicitud.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error400'
 *       '404':
 *         description: Credenciales incorrectas.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error404'
 *       '500':
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    logger.error("Inicio de sesión fallido: Credenciales faltantes"); // Log de error si faltan credenciales
    return res.status(400).json({
      error: {
        code: 400,
        message: "Bad request",
        details: "Username and password are required",
      },
    });
  }

  connection.query("SELECT id FROM users WHERE username = ? AND password = ?", [username, password], (err, results) => {
    if (err) {
      logger.error("Error en la consulta de inicio de sesión:", err.message); // Log de error si hay un error en la consulta
      return res.status(500).json({
        error: {
          code: 500,
          message: "Internal server error",
          details: err.message,
        },
      });
    }
    if (results.length === 0) {
      logger.warn("Inicio de sesión fallido: Credenciales incorrectas"); // Log de advertencia si las credenciales son incorrectas
      return res.status(404).json({
        error: {
          code: 404,
          message: "Resource not found",
          details: "User credentials not found in the database",
        },
      });
    }
    const userId = results[0].id;
    const token = jwt.sign({ userId }, SECRET_KEY, { expiresIn: "10m" });
    logger.info("Inicio de sesión exitoso"); // Log de información si el inicio de sesión es exitoso
    res.json({ token });
  });
});

// Middleware para verificar el token
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token)
    return res.status(401).json({
      error: {
        code: 401,
        message: "Unauthorized",
        details: "Token not provided",
      },
    });

  jwt.verify(token.split(" ")[1], SECRET_KEY, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(403).json({
          error: {
            code: 403,
            message: "Forbidden",
            details: "Token expired",
          },
        });
      } else {
        return res.status(403).json({
          error: {
            code: 403,
            message: "Forbidden",
            details: "Invalid token",
          },
        });
      }
    }
    req.user = user;
    next();
  });
}

// Endpoint para servir la página de dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(__dirname + "/public/dashboard.html");
});

// Endpoint protegido para listar cursos asignados
/**
 * @swagger
 * /courses:
 *   get:
 *     summary: Listar cursos asignados
 *     description: Obtiene la lista de cursos asignados al usuario autenticado.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Lista de cursos asignados.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   score:
 *                     type: number
 *       '401':
 *         description: Token JWT no proporcionado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '500':
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
app.get("/courses", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  connection.query(
    "SELECT courses.name, user_courses.score FROM courses INNER JOIN user_courses ON courses.id = user_courses.course_id WHERE user_courses.user_id = ?",
    [userId],
    (err, results) => {
      if (err) {
        logger.error("Error al obtener la lista de cursos:", err.message); // Log de error si hay un error al obtener la lista de cursos
        return res.status(500).json({
          error: {
            code: 500,
            message: "Internal server error",
            details: err.message,
          },
        });
      }
      if (results.length === 0) {
        logger.warn("No se encontraron cursos asignados al usuario"); // Log de advertencia si no se encuentran cursos asignados al usuario
        return res.status(404).json({
          error: {
            code: 404,
            message: "Resource not found",
            details: "No courses assigned to the user",
          },
        });
      }
      logger.info("Lista de cursos asignados obtenida"); // Log de información si se obtiene la lista de cursos correctamente
      res.json(results);
    }
  );
});

// Endpoint para mostrar el curso con el mayor punteo del usuario
/**
 * @swagger
 * /courses/highest-score:
 *   get:
 *     summary: Mostrar curso con mayor punteo
 *     description: Obtiene el curso con el mayor punteo asignado al usuario autenticado.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Curso con mayor punteo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 score:
 *                   type: number
 *       '401':
 *         description: Token JWT no proporcionado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '500':
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
app.get("/courses/highest-score", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  connection.query(
    "SELECT courses.name, user_courses.score FROM courses INNER JOIN user_courses ON courses.id = user_courses.course_id WHERE user_courses.user_id = ? ORDER BY user_courses.score DESC LIMIT 1",
    [userId],
    (err, results) => {
      if (err) {
        logger.error("Error al obtener el curso con el mayor punteo:", err.message); // Log de error si hay un error al obtener el curso con el mayor punteo
        return res.status(500).json({
          error: {
            code: 500,
            message: "Internal server error",
            details: err.message,
          },
        });
      }
      if (results.length === 0) {
        logger.warn("No se encontró ningún curso con el mayor punteo asignado al usuario"); // Log de advertencia si no se encuentra ningún curso con el mayor punteo
        return res.status(404).json({
          error: {
            code: 404,
            message: "Resource not found",
            details: "No courses assigned to the user",
          },
        });
      }
      logger.info("Curso con mayor punteo mostrado"); // Log de información si se muestra el curso con el mayor punteo correctamente
      res.json(results[0]);
    }
  );
});

// Endpoint para mostrar el curso con el menor punteo del usuario
/**
 * @swagger
 * /courses/lowest-score:
 *   get:
 *     summary: Mostrar curso con menor punteo
 *     description: Obtiene el curso con el menor punteo asignado al usuario autenticado.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       '200':
 *         description: Curso con menor punteo.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 score:
 *                   type: number
 *       '401':
 *         description: Token JWT no proporcionado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error401'
 *       '500':
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error500'
 */
app.get("/courses/lowest-score", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  connection.query(
    "SELECT courses.name, user_courses.score FROM courses INNER JOIN user_courses ON courses.id = user_courses.course_id WHERE user_courses.user_id = ? ORDER BY user_courses.score ASC LIMIT 1",
    [userId],
    (err, results) => {
      if (err) {
        logger.error("Error al obtener el curso con el menor punteo:", err.message); // Log de error si hay un error al obtener el curso con el menor punteo
        return res.status(500).json({
          error: {
            code: 500,
            message: "Internal server error",
            details: err.message,
          },
        });
      }
      if (results.length === 0) {
        logger.warn("No se encontró ningún curso con el menor punteo asignado al usuario"); // Log de advertencia si no se encuentra ningún curso con el menor punteo
        return res.status(404).json({
          error: {
            code: 404,
            message: "Resource not found",
            details: "No courses assigned to the user",
          },
        });
      }
      logger.info("Curso con menor punteo mostrado"); // Log de información si se muestra el curso con el menor punteo correctamente
      res.json(results[0]);
    }
  );
});

// Configura Express para servir la documentación de Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Manejar errores internos del servidor
app.use(handleServerError);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
