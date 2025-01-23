"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes"));
const axios_1 = require("axios");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
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
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static files
app.use('/public', express_1.default.static(path_1.default.join(__dirname, 'public')));
app.use('/covers', express_1.default.static(path_1.default.join(process.cwd(), 'Lightnovels')));
// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});
// Mount routes
app.use('/api', routes_1.default);
// Serve home page
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, 'public', 'index.html'));
});
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
    res.status(axios_1.HttpStatusCode.NotFound).json({
        status: axios_1.HttpStatusCode.NotFound,
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