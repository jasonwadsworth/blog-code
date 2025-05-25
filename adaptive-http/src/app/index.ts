import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    console.log(`Health check called from ${req.query?.from ?? 'unknown'}`);
    res.status(200).send('OK');
});

// Main endpoint that returns Hello World
app.get('/hello', (req: Request, res: Response) => {
    console.log('Hello World called', req);
    res.json({
        message: 'Hello World',
        timestamp: new Date().toISOString(),
    });
});

// Main endpoint that returns Hello World
app.get('/hello2', (req: Request, res: Response) => {
    console.log('Hello World 2 called', req);
    res.json({
        message: `Hello World 2 ${process.env.AWS_LAMBDA_FUNCTION_NAME ?? process.env.HOSTNAME}`,
        timestamp: new Date().toISOString(),
    });
});

// Only start the server if we're not in a Lambda environment
if (process.env.AWS_LAMBDA_FUNCTION_NAME === undefined) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

export default app;
