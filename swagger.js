const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Documentación de los Endpoints",
      version: "1.0.0",
    },
    components: {
      schemas: {
        Error400: {
          type: "object",
          properties: {
            code: { type: "number" },
            message: { type: "string" },
            details: { type: "string" },
          },
        },
        Error401: {
          type: "object",
          properties: {
            code: { type: "number" },
            message: { type: "string" },
            details: { type: "string" },
          },
        },
        Error403: {
          type: "object",
          properties: {
            code: { type: "number" },
            message: { type: "string" },
            details: { type: "string" },
          },
        },
        Error404: {
          type: "object",
          properties: {
            code: { type: "number" },
            message: { type: "string" },
            details: { type: "string" },
          },
        },
        Error500: {
          type: "object",
          properties: {
            code: { type: "number" },
            message: { type: "string" },
            details: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["server.js"], // Rutas de tus endpoints a documentar
};

const specs = swaggerJsdoc(options);

module.exports = specs;
