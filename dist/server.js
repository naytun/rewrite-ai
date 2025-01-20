"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// Initialize express app
const app = (0, express_1.default)();
// Basic GET route
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the API' });
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
    res.status(404).json({
        status: 404,
        message: 'Route not found',
    });
});
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`> Server is running on port: ${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=server.js.map