"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes"));
// Load environment variables
dotenv_1.default.config();
// Validate required environment variables
const requiredEnvVars = ['ORAMA_API_KEY', 'ORAMA_ENDPOINT', 'PORT'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    console.error('Error: Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
}
// Initialize express app
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Mount routes
app.use(routes_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({
        status,
        message,
    });
});
// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        status: 404,
        message: 'Route not found',
    });
});
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`> Server is running on port: ${PORT}`);
        console.log('> Environment:', process.env.NODE_ENV || 'development');
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map